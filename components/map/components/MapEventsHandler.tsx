import { useMapEvents } from "react-leaflet";
import { clampToRadius } from "@/components/utils";
import { useReportWizard } from "@/store/reportFormStore";

interface MapEventsHandlerProps {
  reportingMode: boolean;
}

export default function MapEventsHandler({ reportingMode }: MapEventsHandlerProps) {
  const { activeReportForm, originalExifCoords, setAdjustedCoords } = useReportWizard();

  useMapEvents({
    click(e) {
      if (!reportingMode) return;

      if (activeReportForm === 'locationAdjust' && originalExifCoords) {
        const clamped = clampToRadius(originalExifCoords, e.latlng, 30);
        setAdjustedCoords(clamped);
        return;
      }
    },
  });
  return null;
}
