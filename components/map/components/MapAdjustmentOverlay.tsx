import { Navigation } from "lucide-react";

interface MapAdjustmentOverlayProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function MapAdjustmentOverlay({
  onConfirm,
  onCancel,
}: MapAdjustmentOverlayProps) {
  return (
    <div className="absolute z-[9999] left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[320px] flex flex-col items-center font-mono pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={{ top: "max(1rem, var(--sat))" }}>
      <div className="bg-white/90 dark:bg-black/90 border border-cyan-500/60 w-full px-5 py-4 shadow-[0_0_25px_rgba(0,255,255,0.2)] backdrop-blur-md flex flex-col items-center text-center rounded-2xl relative">
        <Navigation className="w-6 h-6 text-cyan-400 mb-2 animate-bounce" />
        <h3 className="text-cyan-400 font-bold uppercase tracking-[0.15em] text-xs mb-1">Step 2: Adjust Location</h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-[9px] uppercase tracking-widest mb-4">
          Drag the marker to the exact garbage spot (max 30m radius from original photo location)
        </p>

        <button
          onClick={onConfirm}
          className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,255,255,0.4)] rounded-xl"
        >
          Confirm Location
        </button>

        <button onClick={onCancel} className="mt-3 text-[9px] text-neutral-400 hover:text-red-400 uppercase tracking-widest transition-colors">
          [ Cancel ]
        </button>
      </div>
    </div>
  );
}
