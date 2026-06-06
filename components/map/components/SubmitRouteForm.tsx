import { useState, useEffect, useRef } from "react";
import { CheckCircle, Camera, X } from "lucide-react";
import { decode } from "@googlemaps/polyline-codec";
import { serverTimestamp } from "firebase/firestore";

import { useAuthStore } from "@/lib/store";
import { useWasteReports } from "@/store/firebase";
import { fetchAddress } from "@/services/geo";
import { clampReporterName, getStoredReporterName, saveReporterName } from "../utils";

interface SubmitRouteFormProps {
  currentPathEncoded: string | null;
  currentRouteDistance: number | null;
  origin: { lat: number; lng: number } | null;
  severity: "low" | "medium" | "high";
  setSeverity: (s: "low" | "medium" | "high") => void;
  onCancel: () => void;
}

export default function SubmitRouteForm({
  currentPathEncoded,
  currentRouteDistance,
  origin,
  severity,
  setSeverity,
  onCancel,
}: SubmitRouteFormProps) {
  const { addRecord, draft, updateDraft } = useWasteReports();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const reporterNameTouched = useRef(false);

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
      onCancel(); // Reset and close
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSeverity = draft.severity || "low";
  const notesLength = (draft.notes || "").length;

  return (
    <div className="flex flex-col gap-5 w-[280px]">
      <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-cyan-400 mb-2 border-b border-blue-500/30 dark:border-cyan-500/30 pb-3">
        <CheckCircle className="w-5 h-5 drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
        <span className="uppercase tracking-[0.2em] font-bold text-xs">
          Route Selected
        </span>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label className="text-[10px] uppercase font-bold tracking-widest text-blue-700/70 dark:text-cyan-500/70 border-l-2 border-blue-500 dark:border-cyan-500 pl-2">
          Reporting As
        </label>
        <input
          type="text"
          value={draft.userName || ""}
          onChange={(e) => {
            reporterNameTouched.current = true;
            updateDraft({ userName: clampReporterName(e.target.value) });
          }}
          placeholder={user?.displayName || user?.email || "Anonymous"}
          className="text-[10px] text-blue-500 dark:text-cyan-300 bg-blue-100/30 dark:bg-cyan-900/30 border border-blue-500/30 dark:border-cyan-500/30 p-2 outline-none focus:border-blue-500 dark:focus:border-cyan-400 placeholder:text-blue-400/50 dark:placeholder:text-cyan-300/30"
        />
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label className="text-[10px] uppercase font-bold tracking-widest text-blue-700/70 dark:text-cyan-500/70 border-l-2 border-blue-500 dark:border-cyan-500 pl-2">
          Location
        </label>
        <p className="text-[10px] text-blue-500 dark:text-cyan-300 bg-blue-100/30 dark:bg-cyan-900/30 border border-blue-500/30 dark:border-cyan-500/30 p-2 break-words">
          {draft.address || "Locating..."}
        </p>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label className="text-[10px] uppercase font-bold tracking-widest text-blue-700/70 dark:text-cyan-500/70 border-l-2 border-blue-500 dark:border-cyan-500 pl-2">
          Severity Level
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSeverity("low");
              updateDraft({ severity: "low" });
            }}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${currentSeverity === "low" ? "bg-[#00f0ff] text-black shadow-[0_0_10px_#00f0ff] border-[#00f0ff]" : "bg-white dark:bg-black text-[#00f0ff] border-[#00f0ff]/40 hover:bg-[#00f0ff]/20"}`}
          >
            Low
          </button>
          <button
            onClick={() => {
              setSeverity("medium");
              updateDraft({ severity: "medium" });
            }}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${currentSeverity === "medium" ? "bg-[#ff9900] text-black shadow-[0_0_10px_#ff9900] border-[#ff9900]" : "bg-white dark:bg-black text-[#ff9900] border-[#ff9900]/40 hover:bg-[#ff9900]/20"}`}
          >
            Medium
          </button>
          <button
            onClick={() => {
              setSeverity("high");
              updateDraft({ severity: "high" });
            }}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${currentSeverity === "high" ? "bg-[#ff003c] text-black shadow-[0_0_10px_#ff003c] border-[#ff003c]" : "bg-white dark:bg-black text-[#ff003c] border-[#ff003c]/40 hover:bg-[#ff003c]/20"}`}
          >
            High
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-left">
        <div className="flex justify-between items-center">
          <label className="text-[10px] uppercase font-bold tracking-widest text-blue-700/70 dark:text-cyan-500/70 border-l-2 border-blue-500 dark:border-cyan-500 pl-2">
            Optional Notes
          </label>
          <span className="text-[9px] text-blue-700/50 dark:text-cyan-500/50 uppercase">
            {notesLength}/200
          </span>
        </div>
        <textarea
          maxLength={200}
          value={draft.notes || ""}
          onChange={(e) => updateDraft({ notes: e.target.value })}
          placeholder="Describe the issue..."
          className="bg-blue-100/20 dark:bg-cyan-900/20 border border-blue-500/30 dark:border-cyan-500/30 text-blue-500 dark:text-cyan-300 text-[10px] p-2 focus:outline-none focus:border-blue-500 dark:border-cyan-500 focus:shadow-[0_0_5px_rgba(0,240,255,0.3)] resize-none h-16 w-full placeholder:text-blue-700/30 dark:text-cyan-500/30 font-mono scrollbar-none"
        />
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label className="text-[10px] uppercase font-bold tracking-widest text-blue-700/70 dark:text-cyan-500/70 border-l-2 border-blue-500 dark:border-cyan-500 pl-2">
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
          <div className="relative border border-blue-500/50 dark:border-cyan-500/50 p-1 w-full max-h-24 overflow-hidden rounded-sm flex items-center justify-center bg-white/50 dark:bg-black/50">
            <img
              src={draft.imageUrl}
              alt="Road Waste Image"
              className="max-h-20 object-contain"
            />
            <button
              onClick={() => {
                updateDraft({ imageUrl: "" });
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute top-1 right-1 bg-white/80 dark:bg-black/80 border border-blue-500 dark:border-cyan-500 text-blue-700 dark:text-cyan-500 p-0.5 hover:text-red-500 hover:border-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-blue-500/50 dark:border-cyan-500/50 hover:border-blue-500 dark:border-cyan-500 hover:bg-blue-100/30 dark:bg-cyan-900/30 text-blue-700/70 dark:text-cyan-500/70 py-4 flex flex-col items-center justify-center gap-2 transition-colors w-full"
          >
            <Camera className="w-5 h-5 text-blue-700/50 dark:text-cyan-500/50" />
            <span className="text-[9px] uppercase tracking-widest">
              Add Photo
            </span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="text-center text-[10px] uppercase font-bold text-red-500 mt-1 bg-red-500/10 border border-red-500/30 p-1">
          {errorMsg}
        </div>
      )}

      <button
        onClick={submit}
        disabled={isSubmitting || !currentPathEncoded}
        className="mt-2 text-black font-bold uppercase tracking-[0.15em] text-xs py-3 w-full transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
        style={{
          backgroundColor:
            currentSeverity === "high"
              ? "#ff003c"
              : currentSeverity === "medium"
                ? "#ff9900"
                : "#00f0ff",
          boxShadow: `0 0 15px ${currentSeverity === "high" ? "#ff003c" : currentSeverity === "medium" ? "#ff9900" : "#00f0ff"}`,
        }}
      >
        {isSubmitting ? "SUBMITTING..." : "SUBMIT REPORT"}
      </button>
      <button
        onClick={onCancel}
        className="text-[10px] text-blue-700/50 dark:text-cyan-500/50 hover:text-red-400 uppercase tracking-widest transition-colors mt-2"
      >
        [ CANCEL ]
      </button>
    </div>
  );
}
