import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { useWasteReports } from "@/store/firebase";
import { fetchAddress } from "@/services/geo";
import { clampReporterName, getStoredReporterName } from "../utils";

import Card from "@/components/base/Card";
import Button from "@/components/base/Button";
import Input from "@/components/base/Input";
import Textarea from "@/components/base/Textarea";

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

  return (
    <div className="absolute z-[9999] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[340px] flex flex-col items-center pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={{ top: "max(1rem, var(--sat))" }}>
      <Card variant="cyber" padding="none" className="w-full px-5 py-5 gap-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/80">Step 3: Enter Details</span>
          <span className="text-[9px] text-neutral-400">Waste Spot Details</span>
        </div>

        <img src={image} alt="Waste spot" className="w-full h-32 object-cover rounded-xl border border-neutral-800" />

        <div className="flex flex-col gap-1 text-left">
          <label className="text-[9px] uppercase font-bold tracking-widest text-cyan-500/60 pl-1">Location Address</label>
          <p className="text-[10px] text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl break-words leading-relaxed">{draft.address}</p>
        </div>

        <Input
          label="Reporting As"
          type="text"
          value={draft.userName || ""}
          onChange={(e) => updateDraft({ userName: clampReporterName(e.target.value) })}
          placeholder="Anonymous"
        />

        <div className="flex flex-col gap-2 text-left">
          <label className="text-[9px] uppercase font-bold tracking-widest text-cyan-500/60 pl-1">Severity Level</label>
          <div className="flex gap-2">
            {(["low", "medium", "high"] as const).map((s) => {
              const isSelected = severity === s;
              let btnVariant: "cyan" | "yellow" | "red" | "ghost" = "ghost";
              if (isSelected) {
                if (s === "low") btnVariant = "cyan";
                else if (s === "medium") btnVariant = "yellow";
                else btnVariant = "red";
              }
              return (
                <Button
                  key={s}
                  onClick={() => updateDraft({ severity: s })}
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

        <div className="flex flex-col gap-2 mt-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            variant={severity === "high" ? "red" : severity === "medium" ? "yellow" : "cyan"}
            size="lg"
            fullWidth
          >
            Submit for review
          </Button>
          <Button
            onClick={onCancel}
            disabled={isSubmitting}
            variant="cancel"
            className="py-1"
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
