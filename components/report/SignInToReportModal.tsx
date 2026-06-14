import { loginWithGoogle } from "@/lib/firebase";
import { Dialog, Button } from "@/components/base";

interface SignInToReportModalProps {
  onClose: () => void;
  onAnonymous: () => void;
}

export default function SignInToReportModal({ onClose, onAnonymous }: SignInToReportModalProps) {
  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      step="How would you like to report?"
    >
      <div className="flex flex-col gap-1">
        <div className="text-sm font-bold text-gray-900 dark:text-cyan-400">Report Road Waste</div>
      </div>
      <div className="flex flex-col gap-3">
        <Button
          onClick={() => { loginWithGoogle(); onClose(); }}
          variant="outline"
          className="w-full bg-slate-100 dark:bg-cyan-500/10 border-emerald-500 dark:border-cyan-500/50 hover:bg-emerald-200 dark:hover:bg-cyan-500/20 py-3 flex flex-col items-center gap-1"
        >
          <span>Sign in with Google</span>
          <span className="text-[9px] font-normal normal-case tracking-normal text-gray-700 dark:text-cyan-400/50">Draw a road segment on the map</span>
        </Button>
        <Button
          onClick={() => { onClose(); onAnonymous(); }}
          variant="ghost"
          className="w-full bg-slate-50 dark:bg-white/5 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 py-3 flex flex-col items-center gap-1"
        >
          <span>Continue Anonymously</span>
          <span className="text-[9px] font-normal normal-case tracking-normal text-gray-700 dark:text-white/40">Upload a geotagged photo of the waste</span>
        </Button>
      </div>
    </Dialog>
  );
}
