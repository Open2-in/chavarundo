import { useMapEvents } from "react-leaflet";
import { clampToRadius } from "@/components/utils";
import { useReportWizard } from "@/store/reportFormStore";
import { useMapRoute } from "@/store/mapStore";

interface MapEventsHandlerProps {
  reportingMode: boolean;
}

export default function MapEventsHandler({ reportingMode }: MapEventsHandlerProps) {
  const { activeReportForm, originalExifCoords, setAdjustedCoords } = useReportWizard();

  const { origin, destination, pointsConfirmed, setOrigin, setDestination } = useMapRoute();

  useMapEvents({
    click(e) {
      if (!reportingMode) return;

      if (activeReportForm === 'locationAdjust' && originalExifCoords) {
        const clamped = clampToRadius(originalExifCoords, e.latlng, 30);
        setAdjustedCoords(clamped);
        return;
      }

      if (pointsConfirmed) return;
      if (!origin) {
        setOrigin(e.latlng);
      } else if (!destination) {
        setDestination(e.latlng);
      } else {
        setOrigin(e.latlng);
      }
    },
  });
  return null;
}
