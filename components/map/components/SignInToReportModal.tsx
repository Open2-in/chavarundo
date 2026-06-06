import { X } from "lucide-react";
import { loginWithGoogle } from "@/lib/firebase";

interface SignInToReportModalProps {
  onClose: () => void;
  onAnonymous: () => void;
}

export default function SignInToReportModal({ onClose, onAnonymous }: SignInToReportModalProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-[2600] bg-white/60 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed z-[2601] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(340px,90vw)] bg-white/95 dark:bg-black/95 border border-blue-500/40 dark:border-cyan-500/40 rounded-xl font-mono shadow-[0_0_40px_rgba(0,255,255,0.1)] p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[9px] uppercase tracking-widest text-blue-600/70 dark:text-cyan-500/60">How would you like to report?</div>
          <button onClick={onClose} className="text-blue-500/60 dark:text-cyan-500/40 hover:text-blue-700 dark:hover:text-cyan-400 -mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-sm font-bold text-blue-700 dark:text-cyan-400">Report Road Waste</div>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => { loginWithGoogle(); onClose(); }}
            className="w-full py-3 text-[11px] font-bold uppercase tracking-widest bg-blue-100 dark:bg-cyan-500/10 border border-blue-500 dark:border-cyan-500/50 text-blue-700 dark:text-cyan-400 hover:bg-blue-200 dark:hover:bg-cyan-500/20 transition-colors rounded flex flex-col items-center gap-1"
          >
            <span>Sign in with Google</span>
            <span className="text-[9px] font-normal normal-case tracking-normal text-blue-500/70 dark:text-cyan-400/50">Draw a road segment on the map</span>
          </button>
          <button
            onClick={() => { onClose(); onAnonymous(); }}
            className="w-full py-3 text-[11px] font-bold uppercase tracking-widest bg-blue-50 dark:bg-white/5 border border-blue-300 dark:border-white/20 text-blue-600 dark:text-white/70 hover:bg-blue-100 dark:hover:bg-white/10 transition-colors rounded flex flex-col items-center gap-1"
          >
            <span>Continue Anonymously</span>
            <span className="text-[9px] font-normal normal-case tracking-normal text-blue-500/60 dark:text-white/40">Upload a geotagged photo of the waste</span>
          </button>
        </div>
      </div>
    </>
  );
}
