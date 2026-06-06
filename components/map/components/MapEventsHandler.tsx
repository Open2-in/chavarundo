import { useMapEvents } from "react-leaflet";
import { clampToRadius } from "../utils";

interface MapEventsHandlerProps {
  reportingMode: boolean;
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  pointsConfirmed: boolean;
  setOrigin: (pos: { lat: number; lng: number }) => void;
  setDestination: (pos: { lat: number; lng: number }) => void;
  reportStep: number;
  originalExifCoords: { lat: number; lng: number } | null;
  setAdjustedCoords: (pos: { lat: number; lng: number }) => void;
}

export default function MapEventsHandler({
  reportingMode,
  origin,
  destination,
  pointsConfirmed,
  setOrigin,
  setDestination,
  reportStep,
  originalExifCoords,
  setAdjustedCoords,
}: MapEventsHandlerProps) {
  useMapEvents({
    click(e) {
      if (!reportingMode) return;

      if (reportStep === 3 && originalExifCoords) {
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
        // Both points set but not confirmed — restart with new origin
        setOrigin(e.latlng);
      }
    },
  });
  return null;
}
