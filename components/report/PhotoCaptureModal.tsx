import { useState, useRef } from "react";
import {
  Camera,
  MapPin,
  Check,
  X,
  Loader2,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { Dialog, Button } from "@/components/base";
import { useReportWizard } from "@/store/reportFormStore";

// 'idle'       = not yet tried
// 'requesting' = API call in flight (dialog may be open)
// 'granted'    = approved
// 'denied'     = permanently denied (iOS will not re-prompt)
// 'error'      = temporary failure (signal lost, timeout) — can retry
type PermStatus = "idle" | "requesting" | "granted" | "denied" | "error";
type Step = "main" | "permissions" | "processing";

function PermIcon({ status }: { status: PermStatus }) {
  if (status === "granted")
    return <Check className="w-4 h-4 text-emerald-400 shrink-0" />;
  if (status === "denied")
    return <X className="w-4 h-4 text-red-400 shrink-0" />;
  if (status === "requesting")
    return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />;
  if (status === "error")
    return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
  // idle
  return (
    <div className="w-4 h-4 rounded-full border-2 border-neutral-500 shrink-0" />
  );
}

export default function PhotoCaptureModal() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  // Holds the in-flight or resolved geolocation promise
  const locationPromiseRef = useRef<Promise<{ lat: number; lng: number }> | null>(null);
  // Coords obtained during Allow Location step — reused when opening camera
  const resolvedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [step, setStep]           = useState<Step>("main");
  const [locStatus, setLocStatus] = useState<PermStatus>("idle");
  const [camStatus, setCamStatus] = useState<PermStatus>("idle");

  const {
    exifError: errorMsg,
    setExifError: setErrorMsg,
    setReportImage,
    setActiveReportForm,
    setCoords,
    cancelReporting,
  } = useReportWizard();

  // ─── Show the checklist ───────────────────────────────────────────────────
  // NOTE: We deliberately do NOT call navigator.permissions.query() here.
  // On iOS Safari, permissions.query() can return 'denied' even when the user
  // HAS granted access (especially over HTTP or on older iOS versions).
  // The only reliable way to know the true state is to call the actual APIs.
  const handleShowPermissions = () => {
    setErrorMsg(null);
    resolvedCoordsRef.current  = null;
    locationPromiseRef.current = null;
    setLocStatus("idle");
    setCamStatus("idle");
    setStep("permissions");
  };

  // ─── Allow Location ───────────────────────────────────────────────────────
  // Calls navigator.geolocation.getCurrentPosition() — the standard Safari API.
  // If already granted → resolves immediately (no dialog).
  // If first-time      → shows iOS "Allow [site] to use your location?" sheet.
  // If permanently denied → fires error callback with code 1 immediately.
  const handleAllowLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus("denied");
      setErrorMsg("Geolocation is not supported by this browser.");
      return;
    }

    setLocStatus("requesting");
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolvedCoordsRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLocStatus("granted");
      },
      (err) => {
        if (err.code === 1) {
          // PERMISSION_DENIED — iOS will not re-prompt; user must visit Settings
          setLocStatus("denied");
        } else {
          // POSITION_UNAVAILABLE or TIMEOUT — temporary, allow retry
          setLocStatus("error");
          setErrorMsg(
            err.code === 2
              ? "GPS signal unavailable. Move to an open area and try again."
              : "Location request timed out. Please try again."
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  // ─── Allow Camera ─────────────────────────────────────────────────────────
  // Calls navigator.mediaDevices.getUserMedia() to trigger the camera permission
  // dialog on iOS Safari. If already granted → resolves immediately.
  const handleAllowCamera = async () => {
    setErrorMsg(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      // Very old browser — <input capture> will handle camera permission natively
      setCamStatus("granted");
      return;
    }

    setCamStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream.getTracks().forEach((t) => t.stop()); // stop immediately
      setCamStatus("granted");
    } catch (e: any) {
      const name = (e as DOMException)?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCamStatus("denied");
      } else {
        // Device error / camera in use — allow retry
        setCamStatus("error");
        setErrorMsg("Could not access camera. Please try again.");
      }
    }
  };

  // ─── Open Camera (both permissions granted) ───────────────────────────────
  // MUST be a synchronous user-gesture handler.
  // iOS Safari blocks input.click() inside any async callback.
  const handleProceedToCamera = () => {
    setErrorMsg(null);

    if (resolvedCoordsRef.current) {
      // Coords already obtained during "Allow Location" — reuse
      locationPromiseRef.current = Promise.resolve(resolvedCoordsRef.current);
    } else {
      // Location was pre-granted but coords not yet fetched — start background fetch
      const geo = new Promise<{ lat: number; lng: number }>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
      );
      geo.catch(() => {}); // suppress unhandled rejection
      locationPromiseRef.current = geo;
    }

    // ✅ Synchronous → iOS allows this
    cameraInputRef.current?.click();
  };

  // ─── Photo selected ───────────────────────────────────────────────────────
  const handleReportPhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setReportImage(null);
    setStep("processing");

    try {
      const isHeic =
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif");

      let checkBlob: Blob = file;
      if (isHeic) {
        const heic2any = (await import("heic2any")).default;
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        checkBlob = Array.isArray(converted) ? converted[0] : converted;
      }

      const [dataUrl, coords] = await Promise.all([
        new Promise<string>((resolve, reject) => {
          const img    = new Image();
          const reader = new FileReader();
          reader.onload = (ev) => {
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const MAX    = 800;
              let w = img.width, h = img.height;
              if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
              else       { if (h > MAX) { w *= MAX / h; h = MAX; } }
              canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", 0.6));
              } else {
                reject(new Error("canvas_error"));
              }
            };
            img.onerror = () => reject(new Error("img_load"));
            if (ev.target?.result) img.src = ev.target.result as string;
          };
          reader.onerror = () => reject(new Error("reader_error"));
          reader.readAsDataURL(checkBlob);
        }),
        locationPromiseRef.current ??
          Promise.reject(new Error("geolocation_not_started")),
      ]);

      setCoords(coords);
      setReportImage(dataUrl);
      setActiveReportForm("locationAdjust");
    } catch (err: any) {
      const code = err?.code ?? null;
      const msg  = err?.message ?? String(err);
      console.error("[PhotoCapture] error — code:", code, "message:", msg);

      setStep("permissions");
      if (code === 1 || msg.includes("denied")) {
        setLocStatus("denied");
      } else if (code === 2) {
        setErrorMsg("GPS unavailable. Move to an open area and try again.");
      } else if (code === 3) {
        setErrorMsg("Location timed out. Check Location Services and retry.");
      } else if (["canvas_error", "img_load", "reader_error"].includes(msg)) {
        setStep("main");
        setErrorMsg("Failed to read image. Please try another photo.");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
    } finally {
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const bothGranted = locStatus === "granted" && camStatus === "granted";

  // Label text for each status
  const locLabel = {
    idle:       "Tap Allow to grant access",
    requesting: "Waiting for your response…",
    granted:    "Access granted",
    denied:     "Denied — open iPhone Settings",
    error:      "Temporary error — tap Retry",
  }[locStatus];

  const camLabel = {
    idle:       "Tap Allow to grant access",
    requesting: "Waiting for your response…",
    granted:    "Access granted",
    denied:     "Denied — Settings → Safari → Camera → Allow",
    error:      "Error — tap Retry",
  }[camStatus];

  return (
    <Dialog isOpen={true} onClose={cancelReporting} step="Step 1: Capture Image">
      <div className="flex flex-col gap-1.5 text-center mb-3">
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
          Report Waste Photo
        </h3>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {step === "main"
            ? "Camera and Location access are required to report waste."
            : step === "permissions"
            ? "Grant both permissions, then open the camera."
            : "Resizing photo and acquiring GPS…"}
        </p>
      </div>

      {/* ── STEP: main ── */}
      {step === "main" && (
        <Button
          onClick={handleShowPermissions}
          variant="outline"
          className="w-full py-5 border border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex flex-col items-center gap-2"
        >
          <Camera className="w-6 h-6 animate-pulse" />
          <span>Open Camera</span>
        </Button>
      )}

      {/* ── STEP: permissions checklist ── */}
      {step === "permissions" && (
        <div className="flex flex-col gap-2.5">

          {/* Location row */}
          <div className={`flex items-center justify-between gap-3 px-3 py-3 rounded-xl border transition-colors ${
            locStatus === "granted"
              ? "bg-emerald-500/5 border-emerald-500/30"
              : locStatus === "denied"
              ? "bg-red-500/5 border-red-500/30"
              : "bg-neutral-100/60 dark:bg-neutral-800/60 border-neutral-200/30 dark:border-neutral-700/40"
          }`}>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <MapPin className={`w-4 h-4 shrink-0 ${
                locStatus === "granted" ? "text-emerald-400" :
                locStatus === "denied"  ? "text-red-400" : "text-cyan-500"
              }`} />
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-100 leading-tight">
                  Location
                </span>
                <span className={`text-[9px] leading-tight mt-0.5 ${
                  locStatus === "granted" ? "text-emerald-400/80" :
                  locStatus === "denied"  ? "text-red-400/80" :
                  locStatus === "error"   ? "text-amber-400/80" :
                  "text-neutral-500 dark:text-neutral-400"
                }`}>
                  {locLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <PermIcon status={locStatus} />
              {locStatus !== "granted" && locStatus !== "requesting" && (
                <button
                  onClick={handleAllowLocation}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                    locStatus === "denied"
                      ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/40"
                      : "bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-400 border-cyan-500/40"
                  }`}
                >
                  {locStatus === "denied" ? "Retry" : locStatus === "error" ? "Retry" : "Allow"}
                </button>
              )}
            </div>
          </div>

          {/* iOS settings hint — only when denied */}
          {locStatus === "denied" && (
            <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2.5 text-left">
              <p className="text-[9px] font-bold text-red-400 uppercase tracking-wide mb-1">
                How to enable on iPhone
              </p>
              <p className="text-[9px] text-red-400/75 leading-relaxed">
                <strong className="text-red-300">Settings</strong> → Privacy &amp; Security → Location Services →{" "}
                <strong className="text-red-300">Safari</strong> → Allow While Using App
              </p>
              <p className="text-[9px] text-red-400/75 leading-relaxed mt-1">
                Then come back and tap <strong className="text-red-300">Retry</strong>.
              </p>
            </div>
          )}

          {/* Camera row */}
          <div className={`flex items-center justify-between gap-3 px-3 py-3 rounded-xl border transition-colors ${
            camStatus === "granted"
              ? "bg-emerald-500/5 border-emerald-500/30"
              : camStatus === "denied"
              ? "bg-red-500/5 border-red-500/30"
              : "bg-neutral-100/60 dark:bg-neutral-800/60 border-neutral-200/30 dark:border-neutral-700/40"
          }`}>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Camera className={`w-4 h-4 shrink-0 ${
                camStatus === "granted" ? "text-emerald-400" :
                camStatus === "denied"  ? "text-red-400" : "text-cyan-500"
              }`} />
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-100 leading-tight">
                  Camera
                </span>
                <span className={`text-[9px] leading-tight mt-0.5 ${
                  camStatus === "granted" ? "text-emerald-400/80" :
                  camStatus === "denied"  ? "text-red-400/80" :
                  camStatus === "error"   ? "text-amber-400/80" :
                  "text-neutral-500 dark:text-neutral-400"
                }`}>
                  {camLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <PermIcon status={camStatus} />
              {camStatus !== "granted" && camStatus !== "requesting" && (
                <button
                  onClick={handleAllowCamera}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                    camStatus === "denied"
                      ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/40"
                      : "bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-400 border-cyan-500/40"
                  }`}
                >
                  {camStatus === "denied" || camStatus === "error" ? "Retry" : "Allow"}
                </button>
              )}
            </div>
          </div>

          {/* Open Camera — enabled only when both granted */}
          <Button
            onClick={handleProceedToCamera}
            disabled={!bothGranted}
            variant="outline"
            className={`w-full py-4 mt-1 border flex items-center justify-center gap-2 transition-all ${
              bothGranted
                ? "border-emerald-500/50 hover:border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400"
                : "border-neutral-500/20 bg-neutral-500/5 text-neutral-500 cursor-not-allowed opacity-40"
            }`}
          >
            <Camera className={`w-4 h-4 ${bothGranted ? "animate-pulse" : ""}`} />
            <span className="text-[12px] font-semibold">
              {bothGranted ? "Open Camera" : "Grant both permissions to continue"}
            </span>
          </Button>
        </div>
      )}

      {/* ── STEP: processing ── */}
      {step === "processing" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-[11px] font-semibold text-cyan-400">Processing Photo</p>
          <p className="text-[10px] text-neutral-500">Resizing image &amp; acquiring GPS…</p>
        </div>
      )}

      {/* Always-mounted hidden file input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleReportPhotoChange}
      />

      {/* Generic error banner */}
      {errorMsg && (
        <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex flex-col gap-1 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-red-500">Error</span>
          </div>
          <p className="text-[10px] text-red-400 leading-relaxed">{errorMsg}</p>
        </div>
      )}
    </Dialog>
  );
}
