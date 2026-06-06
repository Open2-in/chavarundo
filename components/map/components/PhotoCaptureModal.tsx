import { useState, useRef } from "react";
import { X, Camera } from "lucide-react";

interface PhotoCaptureModalProps {
  onClose: () => void;
  onPhotoSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  setCoords: (coords: { lat: number; lng: number }) => void;
}

export default function PhotoCaptureModal({
  onClose,
  onPhotoSelected,
  errorMsg,
  setErrorMsg,
  setCoords,
}: PhotoCaptureModalProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleUseCameraClick = () => {
    setIsLocating(true);
    setErrorMsg(null);

    if (!navigator.geolocation) {
      setIsLocating(false);
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        cameraInputRef.current?.click();
      },
      (error) => {
        setIsLocating(false);
        let msg = "Failed to retrieve location. Please check your GPS settings and try again.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission denied. Please allow location access to capture the report location.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "GPS signal unavailable. Please ensure location services are enabled on your device.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out. Please try again in an area with better GPS visibility.";
        }
        setErrorMsg(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[2600] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-[2601] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(380px,92vw)] bg-white/95 dark:bg-neutral-950/95 border border-cyan-500/40 rounded-2xl font-mono shadow-[0_0_30px_rgba(0,255,255,0.2)] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
          <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-500/80">Step 1: Capture Image</span>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2 text-center my-2">
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">Report Waste Photo</h3>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Please capture a live photo of the garbage. We will record your direct GPS coordinates to mark the report location.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Camera Button */}
          <button
            onClick={handleUseCameraClick}
            disabled={isLocating}
            className={`w-full py-5 border border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-widest text-[11px] transition-all rounded-xl flex flex-col items-center gap-2 ${isLocating ? "opacity-60 cursor-not-allowed animate-pulse" : ""
              }`}
          >
            <Camera className={`w-6 h-6 ${isLocating ? "animate-spin text-cyan-400" : "animate-pulse"}`} />
            <span>{isLocating ? "Locating GPS..." : "Open Camera"}</span>
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPhotoSelected}
          />
        </div>

        {errorMsg && (
          <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex flex-col gap-1 text-center">
            <span className="text-[10px] uppercase font-bold text-red-500">GPS Error</span>
            <p className="text-[10px] text-red-400 leading-relaxed">{errorMsg}</p>
          </div>
        )}
      </div>
    </>
  );
}
