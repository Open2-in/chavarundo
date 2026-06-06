import { useState, useEffect } from "react";
import { X, Camera } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { useWasteReports } from "@/store/firebase";
import { fetchAddress } from "@/services/geo";
import { clampReporterName, getStoredReporterName } from "../utils";

interface SubmitReportFormProps {
  image: string;
  coords: { lat: number; lng: number };
  onCancel: () => void;
  onSubmit: (data: { name: string; severity: "low" | "medium" | "high"; notes: string }) => void;
}

export default function SubmitReportForm({
  image,
  coords,
  onCancel,
  onSubmit,
}: SubmitReportFormProps) {
  const { draft, updateDraft } = useWasteReports();
  const user = useAuthStore((state) => state.user);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const defaultName = clampReporterName(getStoredReporterName() || user?.displayName || user?.email || "");
    updateDraft({
      userName: draft.userName || defaultName,
      severity: draft.severity || "low",
      notes: draft.notes || "",
      address: draft.address || "Locating...",
    });
  }, [user]);

  useEffect(() => {
    let active = true;
    fetchAddress(coords.lat, coords.lng).then((data: any) => {
      if (active) {
        updateDraft({ address: data?.display_name || "Unknown Location" });
      }
    });
    return () => { active = false; };
  }, [coords]);

  const handleSubmit = () => {
    setIsSubmitting(true);
    onSubmit({
      name: draft.userName || "Anonymous",
      severity: draft.severity || "low",
      notes: draft.notes || "",
    });
  };

  const severity = draft.severity || "low";
  const notesLength = (draft.notes || "").length;

  return (
    <div className="absolute z-[9999] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[340px] flex flex-col items-center font-mono pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={{ top: "max(1rem, var(--sat))" }}>
      <div className="bg-white/90 dark:bg-black/90 border border-cyan-500/60 w-full px-5 py-5 shadow-[0_0_25px_rgba(0,255,255,0.2)] backdrop-blur-md flex flex-col gap-4 rounded-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/80">Step 3: Enter Details</span>
          <span className="text-[9px] text-neutral-400">Waste Spot Details</span>
        </div>

        <img src={image} alt="Waste spot" className="w-full h-32 object-cover rounded-xl border border-neutral-800" />

        <div className="flex flex-col gap-1 text-left">
          <label className="text-[9px] uppercase font-bold tracking-widest text-cyan-500/60 pl-1">Location Address</label>
          <p className="text-[10px] text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl break-words leading-relaxed">{draft.address}</p>
        </div>

        <div className="flex flex-col gap-1 text-left">
          <label className="text-[9px] uppercase font-bold tracking-widest text-cyan-500/60 pl-1">Reporting As</label>
          <input
            type="text"
            value={draft.userName || ""}
            onChange={(e) => updateDraft({ userName: clampReporterName(e.target.value) })}
            placeholder="Anonymous"
            className="text-[10px] text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2 text-left">
          <label className="text-[9px] uppercase font-bold tracking-widest text-cyan-500/60 pl-1">Severity Level</label>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((s) => (
              <button
                key={s}
                onClick={() => updateDraft({ severity: s })}
                className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-widest border transition-all rounded-xl ${severity === s
                  ? s === "low" ? "bg-[#00f0ff] text-black border-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.4)]"
                    : s === "medium" ? "bg-[#ff9900] text-black border-[#ff9900] shadow-[0_0_10px_rgba(255,153,0,0.4)]"
                      : "bg-[#ff003c] text-white border-[#ff003c] shadow-[0_0_10px_rgba(255,0,60,0.4)]"
                  : "bg-transparent text-neutral-400 border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 text-left">
          <div className="flex justify-between items-center pl-1 pr-1">
            <label className="text-[9px] uppercase font-bold tracking-widest text-cyan-500/60">Optional Notes</label>
            <span className="text-[8px] text-neutral-400">{notesLength}/200</span>
          </div>
          <textarea
            maxLength={200}
            value={draft.notes || ""}
            onChange={(e) => updateDraft({ notes: e.target.value })}
            placeholder="Describe the issue..."
            className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-[10px] p-2.5 rounded-xl outline-none focus:border-cyan-500 resize-none h-16 w-full leading-normal placeholder:text-neutral-500"
          />
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 text-black font-bold uppercase tracking-[0.15em] text-xs rounded-xl transition-all disabled:opacity-50"
            style={{
              backgroundColor: severity === "high" ? "#ff003c" : severity === "medium" ? "#ff9900" : "#00f0ff",
              boxShadow: `0 0 15px ${severity === "high" ? "#ff003c" : severity === "medium" ? "#ff9900" : "#00f0ff"}80`,
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit for review"}
          </button>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-[9px] text-neutral-400 hover:text-red-400 uppercase tracking-widest transition-colors py-1"
          >
            [ Cancel ]
          </button>
        </div>
      </div>
    </div>
  );
}
