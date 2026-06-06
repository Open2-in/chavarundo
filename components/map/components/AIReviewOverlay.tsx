import { CheckCircle, MapPinIcon } from "lucide-react";
import Dialog from "@/components/base/Dialog";
import Button from "@/components/base/Button";

interface AIReviewOverlayProps {
  image: string;
  isReviewing: boolean;
  reviewPhase: 'road' | 'ai';
  result: { success: boolean; verified: boolean; reasoning: string; phase?: 'road' | 'ai' } | null;
  onConfirm: () => void;
  onRetake: () => void;
  onCancel: () => void;
}

export default function AIReviewOverlay({
  image,
  isReviewing,
  reviewPhase,
  result,
  onConfirm,
  onRetake,
  onCancel,
}: AIReviewOverlayProps) {
  return (
    <>
      <style>{`
        @keyframes scanAnimation {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .scanner-line-active {
          animation: scanAnimation 2.5s linear infinite;
        }
      `}</style>
      <Dialog
        isOpen={true}
        onClose={undefined}
        zIndexBackdrop="z-[2700]"
        zIndexContent="z-[2701]"
        className="bg-neutral-950 text-center gap-5"
      >
        {isReviewing ? (
          <>
            <div className="flex flex-col items-center">
              <span className="relative flex h-3 w-3 mb-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <span className="text-xs uppercase font-bold tracking-[0.2em] text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]">
                {reviewPhase === 'road' ? 'Checking Road Location' : 'AI Checking Report'}
              </span>
              <span className="text-[9px] text-neutral-500 uppercase mt-1">
                {reviewPhase === 'road'
                  ? 'Verifying location is within 50 m of a public road'
                  : 'Analyzing image for waste & garbage'}
              </span>
            </div>

            {/* Scan animation container */}
            <div className="relative w-full h-44 rounded-xl border border-cyan-500/30 overflow-hidden bg-black flex items-center justify-center">
              <img src={image} alt="Scanning" className="w-full h-full object-cover opacity-70" />
              <div className="scanner-line-active absolute left-0 w-full h-0.5 bg-cyan-500 shadow-[0_0_8px_#00f0ff,0_0_15px_#00f0ff]" />
            </div>

            <div className="flex flex-col items-center gap-2 mt-1">
              <div className="text-[10px] text-cyan-400/80 animate-pulse">
                {reviewPhase === 'road' ? 'QUERYING ROAD NETWORK DATA…' : 'RUNNING DEEP COMPUTER VISION SEGMENTATION…'}
              </div>
              <div className="h-1 w-full bg-neutral-900 overflow-hidden rounded-full">
                <div className="h-full bg-cyan-500" style={{ width: "60%" }} />
              </div>
            </div>
          </>
        ) : result ? (
          <>
            {result.verified ? (
              <div className="flex flex-col items-center gap-1">
                <CheckCircle className="w-12 h-12 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                <span className="text-sm uppercase font-bold tracking-[0.2em] text-green-400 mt-2">AI VERIFIED SUCCESS</span>
                <span className="text-[9px] text-neutral-500 uppercase">Garbage detected in photo evidence</span>
              </div>
            ) : result.phase === 'road' ? (
              <div className="flex flex-col items-center gap-1">
                <MapPinIcon className="w-12 h-12 text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]" />
                <span className="text-sm uppercase font-bold tracking-[0.2em] text-orange-400 mt-2">LOCATION CHECK FAILED</span>
                <span className="text-[9px] text-neutral-500 uppercase">Not within 50 m of a public road</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full border border-red-500/50 flex items-center justify-center text-red-400 font-bold text-2xl drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">✕</div>
                <span className="text-sm uppercase font-bold tracking-[0.2em] text-red-400 mt-2">AI VERIFICATION FAILED</span>
                <span className="text-[9px] text-neutral-500 uppercase">Could not confirm garbage in photo</span>
              </div>
            )}

            <div className="relative w-full max-h-32 rounded-xl border border-neutral-800 overflow-hidden bg-neutral-900/50">
              <img src={image} alt="Reported spot" className="w-full h-full object-cover opacity-80 max-h-32" />
            </div>

            <div className="flex flex-col gap-1 text-left bg-neutral-900/50 border border-neutral-800 p-3 rounded-xl max-h-28 overflow-y-auto">
              <span className="text-[8px] uppercase font-bold tracking-widest text-neutral-500">AI Assessment Reasoning:</span>
              <p className="text-[10px] text-neutral-300 leading-relaxed italic">
                "{result.reasoning}"
              </p>
            </div>

            {result.verified ? (
              <Button
                onClick={onConfirm}
                variant="green"
                fullWidth
              >
                Go to Map
              </Button>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <Button
                  onClick={onRetake}
                  variant="cyan"
                  fullWidth
                >
                  ↩ Retake Image
                </Button>
                <Button
                  onClick={onConfirm}
                  variant="yellow"
                  fullWidth
                >
                  Request Review
                </Button>
                <Button
                  onClick={onCancel}
                  variant="ghost"
                  className="bg-neutral-900 hover:bg-red-900/60 text-red-400 border border-red-500/30 hover:border-red-500/60"
                  fullWidth
                >
                  Cancel
                </Button>
              </div>
            )}
          </>
        ) : null}
      </Dialog>
    </>
  );
}
