import { useState, useEffect, useRef } from "react";
import { CheckCircle, Camera, X } from "lucide-react";
import { decode } from "@googlemaps/polyline-codec";
import { serverTimestamp } from "firebase/firestore";

import { useUser } from "@/store/userStore";
import { useWasteReports } from "@/store/firebase";
import { useMapRoute } from "@/store/mapStore";
import { useReportWizard } from "@/store/reportFormStore";
import { fetchAddress } from "@/services/geo";
import { clampReporterName, getStoredReporterName, saveReporterName } from "@/components/utils";

import { Button, Input, Textarea } from "@/components/base";

export default function SubmitRouteForm() {
  const {
    currentPathEncoded,
    currentRouteDistance,
    origin,
    severity,
    setSeverity,
    cancelRouteReporting,
  } = useMapRoute();

  const { cancelReporting } = useReportWizard();

  const addRecord = useWasteReports((s) => s.addRecord);
  const draft = useWasteReports((s) => s.draft);
  const updateDraft = useWasteReports((s) => s.updateDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { user } = useUser();
  const reporterNameTouched = useRef(false);

  const handleCancel = () => {
    cancelRouteReporting();
    cancelReporting();
  };

  // Initialize draft on mount or when key dependencies change
  useEffect(() => {
    const defaultName = clampReporterName(getStoredReporterName() || user?.displayName || user?.email || "");
    updateDraft({
      userName: draft.userName || defaultName,
      severity: draft.severity || severity || "low",
      notes: draft.notes || "",
      imageUrl: draft.imageUrl || "",
      address: draft.address || "Locating...",
    });
  }, [user]);

  // Auth may resolve after this form mounts; fill the display name once if the
  // field is still empty, there's no stored default, and the user hasn't typed.
  useEffect(() => {
    if (reporterNameTouched.current || draft.userName || getStoredReporterName()) return;
    const fallback = user?.displayName || user?.email;
    if (fallback) updateDraft({ userName: clampReporterName(fallback) });
  }, [user, draft.userName]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          if (dataUrl.length > 800000) {
            setErrorMsg("Image is too large even after compression.");
            return;
          }
          updateDraft({ imageUrl: dataUrl });
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let active = true;
    if (origin) {
      fetchAddress(origin.lat, origin.lng)
        .then((data: any) => {
          if (active) {
            updateDraft({ address: data?.display_name || "Unknown Location" });
          }
        })
        .catch(() => {
          if (active) {
            updateDraft({ address: "Unknown Location" });
          }
        });
    }
    return () => {
      active = false;
    };
  }, [origin]);

  const submit = async () => {
    if (!currentPathEncoded || !user) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const path = decode(currentPathEncoded) as [number, number][];
      const mid = path[Math.floor(path.length / 2)];

      const payload: any = {
        userId: user.uid,
        userName: (draft.userName || "Anonymous").trim(),
        encodedPath: currentPathEncoded,
        latitude: mid[0],
        longitude: mid[1],
        createdAt: serverTimestamp(),
        status: "reported",
        severity: draft.severity || "low",
        upvoterIds: [],
        ...(currentRouteDistance != null ? { distanceM: Math.round(currentRouteDistance) } : {}),
      };
      if (user.photoURL) payload.userPhotoURL = user.photoURL;
      if (draft.notes?.trim()) payload.notes = draft.notes.trim();
      if (draft.imageUrl) payload.imageUrl = draft.imageUrl;

      saveReporterName(draft.userName || "");
      await addRecord(payload);
      handleCancel(); // Reset and close
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSeverity = draft.severity || "low";

  return (
    <div className="absolute z-[9999] left-4 bottom-16 w-[312px] pointer-events-auto bg-white/90 dark:bg-black/90 border border-blue-500/50 dark:border-cyan-500/50 rounded-2xl p-4 shadow-[0_0_20px_rgba(0,240,255,0.2)] backdrop-blur-md max-h-[80vh] overflow-y-auto scrollbar-none flex flex-col gap-4">
      <div className="flex flex-col gap-4 w-full max-h-[75vh] overflow-y-auto pr-1">
        <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-cyan-400 mb-1 border-b border-cyan-500/20 pb-2">
          <CheckCircle className="w-5 h-5 drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
          <span className="uppercase tracking-[0.2em] font-bold text-xs">
            Route Selected
          </span>
        </div>

        <Input
          label="Reporting As"
          type="text"
          value={draft.userName || ""}
          onChange={(e) => {
            reporterNameTouched.current = true;
            updateDraft({ userName: clampReporterName(e.target.value) });
          }}
          placeholder={user?.displayName || user?.email || "Anonymous"}
        />

        <div className="flex flex-col gap-1 text-left w-full font-mono">
          <label className="text-[9px] uppercase font-bold tracking-widest text-cyan-500/60 pl-1">
            Location Address
          </label>
          <p className="text-[10px] text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl break-words leading-relaxed">
            {draft.address || "Locating..."}
          </p>
        </div>

        <div className="flex flex-col gap-2 text-left">
          <label className="text-[9px] uppercase font-bold tracking-widest text-cyan-500/60 pl-1">Severity Level</label>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((s) => {
              const isSelected = currentSeverity === s;
              let btnVariant: "cyan" | "yellow" | "red" | "ghost" = "ghost";
              if (isSelected) {
                if (s === "low") btnVariant = "cyan";
                else if (s === "medium") btnVariant = "yellow";
                else btnVariant = "red";
              }
              return (
                <Button
                  key={s}
                  onClick={() => {
                    setSeverity(s);
                    updateDraft({ severity: s });
                  }}
                  variant={btnVariant}
                  size="xs"
                  className={`flex-1 ${!isSelected ? "border border-neutral-300 dark:border-neutral-800" : ""}`}
                >
                  {s}
                </Button>
              );
            })}
          </div>
        </div>

        <Textarea
          label="Optional Notes"
          maxLength={200}
          showCharCount
          value={draft.notes || ""}
          onChange={(e) => updateDraft({ notes: e.target.value })}
          placeholder="Describe the issue..."
        />

        <div className="flex flex-col gap-1 text-left w-full font-mono">
          <label className="text-[9px] uppercase font-bold tracking-widest text-cyan-500/60 pl-1">
            Photo (Optional)
          </label>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          {draft.imageUrl ? (
            <div className="relative border border-neutral-200 dark:border-neutral-800 p-1 w-full max-h-24 overflow-hidden rounded-xl flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
              <img
                src={draft.imageUrl}
                alt="Road Waste"
                className="max-h-20 object-contain rounded-lg"
              />
              <button
                onClick={() => {
                  updateDraft({ imageUrl: "" });
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-1.5 right-1.5 bg-white/80 dark:bg-black/80 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 p-0.5 rounded-md hover:text-red-500 hover:border-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full border-dashed py-4 flex flex-col items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5 text-blue-700/50 dark:text-cyan-500/50" />
              <span className="text-[9px] uppercase tracking-widest">
                Add Photo
              </span>
            </Button>
          )}
        </div>

        {errorMsg && (
          <div className="text-center text-[10px] uppercase font-bold text-red-500 mt-1 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-2 w-full">
          <Button
            onClick={submit}
            disabled={isSubmitting || !currentPathEncoded}
            loading={isSubmitting}
            variant={currentSeverity === "high" ? "red" : currentSeverity === "medium" ? "yellow" : "cyan"}
            size="lg"
            fullWidth
          >
            Submit Report
          </Button>
          <Button
            onClick={handleCancel}
            disabled={isSubmitting}
            variant="cancel"
            className="py-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
