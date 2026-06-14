import { useState, useRef, useEffect } from "react";
import {
  Camera,
  MapPin,
  Check,
  X,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Dialog, Button } from "@/components/base";
import { extractGPSFromJPEG } from "@/lib/exif";
import { useMapSelection } from "@/store/mapStore";
import { useWasteReports } from "@/store/firebase";

type PermStatus = "idle" | "requesting" | "granted" | "denied" | "error";
type Step = "main" | "permissions" | "processing";

function PermIcon({ status }: { status: PermStatus }) {
  if (status === "granted")
    return <Check className="w-4 h-4 text-gray-500 shrink-0" />;
  if (status === "denied")
    return <X className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />;
  if (status === "requesting") {
    return <Loader2 className="w-4 h-4 text-teal-600 dark:text-cyan-400 animate-spin shrink-0" />;
  }
  if (status === "error")
    return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />;
  return (
    <div className="w-4 h-4 rounded-full border-2 border-neutral-500 shrink-0" />
  );
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export default function VerifyCleanupModal() {
  const { verifyCleanupReportId, setVerifyCleanupReportId } = useMapSelection();
  const editRecord = useWasteReports((s) => s.editRecord);

  const cameraInputRef       = useRef<HTMLInputElement>(null);
  const geotagInputRef       = useRef<HTMLInputElement>(null);
  const locationPromiseRef   = useRef<Promise<{ lat: number; lng: number }> | null>(null);
  const resolvedCoordsRef    = useRef<{ lat: number; lng: number } | null>(null);

  const [isIOS,      setIsIOS]      = useState(false);
  const [step,       setStep]       = useState<Step>("main");
  const [locStatus,  setLocStatus]  = useState<PermStatus>("idle");
  const [camStatus,  setCamStatus]  = useState<PermStatus>("idle");
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  useEffect(() => {
    setIsIOS(detectIOS());
  }, []);

  if (!verifyCleanupReportId) return null;

  const cancelVerification = () => {
    setVerifyCleanupReportId(null);
  };

  const handleUploadGeotaggedClick = () => {
    setErrorMsg(null);
    geotagInputRef.current?.click();
  };

  const handleDirectCamera = () => {
    setErrorMsg(null);

    const geo = new Promise<{ lat: number; lng: number }>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
    );
    geo.catch(() => {});
    locationPromiseRef.current = geo;

    cameraInputRef.current?.click();
  };

  const handleShowPermissions = () => {
    setErrorMsg(null);
    resolvedCoordsRef.current  = null;
    locationPromiseRef.current = null;
    setLocStatus("idle");
    setCamStatus("idle");
    setStep("permissions");
  };

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
          setLocStatus("denied");
        } else {
          setLocStatus("error");
          setErrorMsg(
            err.code === 2
              ? "GPS unavailable. Move to an open area and try again."
              : "Location request timed out. Please try again."
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleAllowCamera = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamStatus("granted");
      return;
    }
    setCamStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream.getTracks().forEach((t) => t.stop());
      setCamStatus("granted");
    } catch (e: any) {
      const name = (e as DOMException)?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCamStatus("denied");
      } else {
        setCamStatus("error");
        setErrorMsg("Could not access camera. Please try again.");
      }
    }
  };

  const handleProceedToCamera = () => {
    setErrorMsg(null);

    if (resolvedCoordsRef.current) {
      locationPromiseRef.current = Promise.resolve(resolvedCoordsRef.current);
    } else {
      const geo = new Promise<{ lat: number; lng: number }>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
      );
      geo.catch(() => {});
      locationPromiseRef.current = geo;
    }

    cameraInputRef.current?.click();
  };

  const processAndVerifyImage = async (file: File, checkBlob: Blob, promiseCoords: Promise<{ lat: number; lng: number }>) => {
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
      promiseCoords,
    ]);

    const res = await fetch("/api/garbage/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: verifyCleanupReportId,
        afterImageUrl: dataUrl,
        verifyLat: coords.lat,
        verifyLng: coords.lng,
      }),
    });

    if (!res.ok) {
      throw new Error("Verification failed. Please try again.");
    }

    const data = await res.json();
    if (data.success && data.data?.afterCleaned) {
      await editRecord(verifyCleanupReportId!, {
        status: "completed",
        afterImageUrl: dataUrl,
        cleanedAt: new Date(),
      });
      setVerifyCleanupReportId(null);
    } else {
      const err = new Error(data.data?.verificationReasoning || "AI could not verify that the area is clean.");
      (err as any).isAiRejection = true;
      throw err;
    }
  };

  const handleReportPhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
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

      await processAndVerifyImage(
        file,
        checkBlob,
        locationPromiseRef.current ?? Promise.reject(new Error("geolocation_not_started"))
      );
    } catch (err: any) {
      const code = err?.code ?? null;
      const msg  = err?.message ?? String(err);
      if (!err?.isAiRejection) {
        console.error("[VerifyCapture] error — code:", code, "message:", msg);
      }

      if (["canvas_error", "img_load", "reader_error"].includes(msg)) {
        setStep("main");
        setErrorMsg("Failed to read image. Please try another photo.");
      } else if (msg.includes("Verification failed") || msg.includes("AI could not verify") || err?.isAiRejection) {
        setStep("main");
        setErrorMsg(msg);
      } else {
        if (isIOS) {
          setStep("permissions");
          if (code === 1 || msg.includes("denied")) setLocStatus("denied");
          else if (code === 2) setErrorMsg("GPS unavailable. Move to an open area and try again.");
          else if (code === 3) setErrorMsg("Location timed out. Check Location Services and retry.");
          else setErrorMsg("Something went wrong. Please try again.");
        } else {
          setStep("main");
          if (code === 1 || msg.includes("denied")) {
            setErrorMsg("Location access was denied. Please allow location access in your browser settings and try again.");
          } else if (code === 2) {
            setErrorMsg("GPS unavailable. Move to an open area and try again.");
          } else if (code === 3) {
            setErrorMsg("Location timed out. Please try again.");
          } else {
            setErrorMsg("Something went wrong. Please try again.");
          }
        }
      }
    } finally {
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleGeotagPhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
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

      const arrayBuffer = await checkBlob.arrayBuffer();
      const coords = extractGPSFromJPEG(arrayBuffer);

      if (!coords) {
        throw new Error("no_gps_metadata");
      }

      await processAndVerifyImage(file, checkBlob, Promise.resolve(coords));
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (!err?.isAiRejection) {
        console.error("[GeotagVerify] error — message:", msg);
      }

      setStep("main");
      if (msg === "no_gps_metadata") {
        setErrorMsg("No GPS location metadata found in this image. Please take a live photo or upload an image with location data enabled.");
      } else if (["canvas_error", "img_load", "reader_error"].includes(msg)) {
        setErrorMsg("Failed to read image. Please try another photo.");
      } else if (msg.includes("Verification failed") || msg.includes("AI could not verify") || err?.isAiRejection) {
        setErrorMsg(msg);
      } else {
        setErrorMsg("Something went wrong processing the image. Please try again.");
      }
    } finally {
      if (geotagInputRef.current) geotagInputRef.current.value = "";
    }
  };

  const bothGranted = locStatus === "granted" && camStatus === "granted";

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
    <Dialog isOpen={true} onClose={cancelVerification} step="Verification">
      <div className="flex flex-col gap-1.5 text-center mb-3">
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
          Verify Cleanup Photo
        </h3>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {step === "processing"
            ? "Verifying image with AI…"
            : isIOS && step === "permissions"
            ? "Grant both permissions, then open the camera."
            : "Capture a live photo of the cleaned area."}
        </p>
      </div>

      {step === "main" && (
        <>
          <Button
            onClick={isIOS ? handleShowPermissions : handleDirectCamera}
            variant="outline"
            className="w-full py-5 border border-dashed border-teal-500/50 hover:border-teal-400 bg-teal-500/5 hover:bg-teal-500/10 text-teal-600 dark:text-cyan-400 flex flex-col items-center gap-2"
          >
            <Camera className="w-6 h-6 animate-pulse" />
            <span>Open Camera</span>
          </Button>

          {isIOS && (
            <>
              <div className="relative flex items-center justify-center my-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-300/25"></div></div>
                <span className="relative px-2 bg-white dark:bg-neutral-900 text-[10px] font-semibold text-neutral-400 uppercase">Or</span>
              </div>

              <Button
                onClick={handleUploadGeotaggedClick}
                variant="outline"
                className="w-full py-4 border border-dashed border-emerald-500/50 hover:border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-gray-900 dark:text-emerald-400 flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4 text-gray-700" />
                <span className="text-[12px] font-semibold">Upload Geotagged Photo</span>
              </Button>
            </>
          )}

          {!isIOS && errorMsg && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex flex-col gap-2 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="text-[10px] uppercase font-bold text-red-500">Error</span>
              </div>
              <p className="text-[10px] text-red-400 leading-relaxed">{errorMsg}</p>
              <button
                onClick={handleDirectCamera}
                className="mt-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">Try Again</span>
              </button>
            </div>
          )}
          {isIOS && errorMsg && step === "main" && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex flex-col gap-2 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="text-[10px] uppercase font-bold text-red-500">Error</span>
              </div>
              <p className="text-[10px] text-red-400 leading-relaxed">{errorMsg}</p>
            </div>
          )}
        </>
      )}

      {step === "permissions" && isIOS && (
        <div className="flex flex-col gap-2.5">
          <div className={`flex items-center justify-between gap-3 px-3 py-3 rounded-xl border transition-colors ${
            locStatus === "granted" ? "bg-emerald-500/5 border-emerald-500/30"
            : locStatus === "denied"  ? "bg-red-500/5 border-red-500/30"
            : "bg-slate-50/60 dark:bg-neutral-800/60 border-neutral-200/30 dark:border-neutral-700/40"
          }`}>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <MapPin className={`w-4 h-4 shrink-0 ${
                locStatus === "granted" ? "text-gray-500"
                : locStatus === "denied" ? "text-red-400" : "text-teal-600 dark:text-cyan-500"
              }`} />
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-100 leading-tight">
                  Location
                </span>
                <span className={`text-[9px] leading-tight mt-0.5 ${
                  locStatus === "granted" ? "text-gray-500"
                  : locStatus === "denied" ? "text-red-400/80"
                  : locStatus === "error"  ? "text-amber-400/80"
                  : "text-neutral-500 dark:text-neutral-400"
                }`}>{locLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <PermIcon status={locStatus} />
              {locStatus !== "granted" && locStatus !== "requesting" && (
                <button
                  onClick={handleAllowLocation}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                    locStatus === "denied"
                      ? "bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/40"
                      : "bg-teal-50 dark:bg-cyan-500/20 hover:bg-teal-100 dark:hover:bg-cyan-500/35 text-teal-700 dark:text-cyan-400 border-teal-300 dark:border-cyan-500/40"
                  }`}
                >
                  {locStatus === "idle" ? "Allow" : "Retry"}
                </button>
              )}
            </div>
          </div>

          {locStatus === "denied" && (
            <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2.5 text-left">
              <p className="text-[9px] font-bold text-red-400 uppercase tracking-wide mb-1">
                Enable in iPhone Settings
              </p>
              <p className="text-[9px] text-red-400/75 leading-relaxed">
                <strong className="text-red-300">Settings</strong> → Privacy &amp; Security →
                Location Services → <strong className="text-red-300">Safari</strong> → Allow While Using App
              </p>
              <p className="text-[9px] text-red-400/75 leading-relaxed mt-1">
                Then come back and tap <strong className="text-red-300">Retry</strong>.
              </p>
            </div>
          )}

          <div className={`flex items-center justify-between gap-3 px-3 py-3 rounded-xl border transition-colors ${
            camStatus === "granted" ? "bg-emerald-500/5 border-emerald-500/30"
            : camStatus === "denied" ? "bg-red-500/5 border-red-500/30"
            : "bg-slate-50/60 dark:bg-neutral-800/60 border-neutral-200/30 dark:border-neutral-700/40"
          }`}>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Camera className={`w-4 h-4 shrink-0 ${
                camStatus === "granted" ? "text-gray-500"
                : camStatus === "denied" ? "text-red-400" : "text-teal-600 dark:text-cyan-500"
              }`} />
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-100 leading-tight">
                  Camera
                </span>
                <span className={`text-[9px] leading-tight mt-0.5 ${
                  camStatus === "granted" ? "text-gray-500"
                  : camStatus === "denied" ? "text-red-400/80"
                  : camStatus === "error"  ? "text-amber-400/80"
                  : "text-neutral-500 dark:text-neutral-400"
                }`}>{camLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <PermIcon status={camStatus} />
              {camStatus !== "granted" && camStatus !== "requesting" && (
                <button
                  onClick={handleAllowCamera}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                    camStatus === "denied"
                      ? "bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/40"
                      : "bg-teal-50 dark:bg-cyan-500/20 hover:bg-teal-100 dark:hover:bg-cyan-500/35 text-teal-700 dark:text-cyan-400 border-teal-300 dark:border-cyan-500/40"
                  }`}
                >
                  {camStatus === "idle" ? "Allow" : "Retry"}
                </button>
              )}
            </div>
          </div>

          <Button
            onClick={handleProceedToCamera}
            disabled={!bothGranted}
            variant="outline"
            className={`w-full py-4 mt-1 border flex items-center justify-center gap-2 transition-all ${
              bothGranted
                ? "border-emerald-500/50 hover:border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-gray-700 dark:text-emerald-400"
                : "border-neutral-500/20 bg-neutral-500/5 text-neutral-500 cursor-not-allowed opacity-40"
            }`}
          >
            <Camera className={`w-4 h-4 ${bothGranted ? "animate-pulse" : ""}`} />
            <span className="text-[12px] font-semibold">
              {bothGranted ? "Open Camera" : "Grant both permissions to continue"}
            </span>
          </Button>

          <div className="relative flex items-center justify-center my-1.5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-300/25"></div></div>
            <span className="relative px-2 bg-white dark:bg-neutral-900 text-[10px] font-semibold text-neutral-400 uppercase">Or</span>
          </div>

          <Button
            onClick={handleUploadGeotaggedClick}
            variant="outline"
            className="w-full py-3.5 border border-dashed border-emerald-500/50 hover:border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 text-gray-900 dark:text-emerald-400 flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4 text-gray-700" />
            <span className="text-[12px] font-semibold">Upload Geotagged Photo</span>
          </Button>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex flex-col gap-1 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="text-[10px] uppercase font-bold text-red-500">Error</span>
              </div>
              <p className="text-[10px] text-red-400 leading-relaxed">{errorMsg}</p>
            </div>
          )}
        </div>
      )}

      {step === "processing" && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-8 h-8 text-teal-600 dark:text-cyan-400 animate-spin" />
          <p className="text-[11px] font-semibold text-teal-700 dark:text-cyan-400">Verifying Photo</p>
          <p className="text-[10px] text-neutral-500">AI is analyzing the area…</p>
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleReportPhotoChange}
      />

      <input
        ref={geotagInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGeotagPhotoChange}
      />
    </Dialog>
  );
}
