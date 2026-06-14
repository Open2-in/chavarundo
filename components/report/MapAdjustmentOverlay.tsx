import { Navigation } from "lucide-react";
import { Card, Button } from "@/components/base";
import { useReportWizard } from "@/store/reportFormStore";

export default function MapAdjustmentOverlay() {
  const { setActiveReportForm, cancelReporting } = useReportWizard();

  return (
    <div className="absolute z-[9999] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[320px] flex flex-col items-center pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={{ top: "max(1rem, var(--sat))" }}>
      <Card variant="cyber" className="w-full items-center text-center relative">
        <Navigation className="w-6 h-6 text-emerald-600 dark:text-cyan-400 mb-2 animate-bounce" />
        <h3 className="text-emerald-700 dark:text-cyan-400 font-bold uppercase tracking-[0.15em] text-xs mb-1">Step 2: Adjust Location</h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-[9px] uppercase tracking-widest mb-4">
          Drag the marker to the exact garbage spot (max 30m radius from original photo location)
        </p>

        <Button
          onClick={() => setActiveReportForm('detailsForm')}
          variant="cyan"
          fullWidth
        >
          Confirm Location
        </Button>

        <Button
          onClick={cancelReporting}
          variant="cancel"
          className="mt-3"
        >
          Cancel
        </Button>
      </Card>
    </div>
  );
}

