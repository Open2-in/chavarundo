import { loginWithGoogle } from "@/lib/firebase";
import Dialog from "@/components/base/Dialog";
import Button from "@/components/base/Button";

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
        <div className="text-sm font-bold text-blue-700 dark:text-cyan-400">Report Road Waste</div>
      </div>
      <div className="flex flex-col gap-3">
        <Button
          onClick={() => { loginWithGoogle(); onClose(); }}
          variant="outline"
          className="w-full bg-blue-100 dark:bg-cyan-500/10 border-blue-500 dark:border-cyan-500/50 hover:bg-blue-200 dark:hover:bg-cyan-500/20 py-3 flex flex-col items-center gap-1"
        >
          <span>Sign in with Google</span>
          <span className="text-[9px] font-normal normal-case tracking-normal text-blue-500/70 dark:text-cyan-400/50">Draw a road segment on the map</span>
        </Button>
        <Button
          onClick={() => { onClose(); onAnonymous(); }}
          variant="ghost"
          className="w-full bg-blue-50 dark:bg-white/5 border-blue-300 dark:border-white/20 text-blue-600 dark:text-white/70 hover:bg-blue-100 dark:hover:bg-white/10 py-3 flex flex-col items-center gap-1"
        >
          <span>Continue Anonymously</span>
          <span className="text-[9px] font-normal normal-case tracking-normal text-blue-500/60 dark:text-white/40">Upload a geotagged photo of the waste</span>
        </Button>
      </div>
    </Dialog>
  );
}
