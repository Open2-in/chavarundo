import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface MapFlyHandlerProps {
  coords: { lat: number; lng: number } | null;
}

export default function MapFlyHandler({ coords }: MapFlyHandlerProps) {
  const map = useMap();
  useEffect(() => {
    if (coords && map) {
      map.flyTo([coords.lat, coords.lng], 17, { duration: 1.2 });
    }
  }, [coords, map]);
  return null;
}
