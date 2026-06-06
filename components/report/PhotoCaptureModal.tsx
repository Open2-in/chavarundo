import { useState, useRef } from "react";
import { Camera } from "lucide-react";
import { Dialog, Button } from "@/components/base";
import { useReportWizard } from "@/store/reportFormStore";

export default function PhotoCaptureModal() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isLocating, setIsLocating] = useState(false);

  const {
    exifError: errorMsg,
    setExifError: setErrorMsg,
    setReportImage,
    setActiveReportForm,
    setCoords,
    cancelReporting,
  } = useReportWizard();

  const handleReportPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setReportImage(null);

    try {
      const isHeic = file.type === "image/heic" || file.type === "image/heif"
        || file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");

      let checkBlob: Blob = file;
      if (isHeic) {
        const heic2any = (await import("heic2any")).default;
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        checkBlob = Array.isArray(converted) ? converted[0] : converted;
      }

      const img = new Image();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX = 800;
            let w = img.width, h = img.height;
            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
            else { if (h > MAX) { w *= MAX / h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const url = canvas.toDataURL("image/jpeg", 0.6);
              resolve(url);
            } else {
              reject(new Error("canvas_error"));
            }
          };
          img.onerror = () => reject(new Error("img_load"));
          if (ev.target?.result) img.src = ev.target.result as string;
        };
        reader.readAsDataURL(checkBlob);
      });

      setReportImage(dataUrl);
      setActiveReportForm('locationAdjust');
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to read image. Please try another photo.");
    }
  };

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
    <Dialog
      isOpen={true}
      onClose={cancelReporting}
      step="Step 1: Capture Image"
    >
      <div className="flex flex-col gap-2 text-center my-2">
        <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">Report Waste Photo</h3>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Please capture a live photo of the garbage. We will record your direct GPS coordinates to mark the report location.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={handleUseCameraClick}
          disabled={isLocating}
          variant="outline"
          className={`w-full py-5 border border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex flex-col items-center gap-2 ${isLocating ? "opacity-60 cursor-not-allowed animate-pulse" : ""}`}
        >
          <Camera className={`w-6 h-6 ${isLocating ? "animate-spin text-cyan-400" : "animate-pulse"}`} />
          <span>{isLocating ? "Locating GPS..." : "Open Camera"}</span>
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleReportPhotoChange}
        />
      </div>

      {errorMsg && (
        <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex flex-col gap-1 text-center">
          <span className="text-[10px] uppercase font-bold text-red-500">GPS Error</span>
          <p className="text-[10px] text-red-400 leading-relaxed">{errorMsg}</p>
        </div>
      )}
    </Dialog>
  );
}

