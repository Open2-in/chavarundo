import { useState, useEffect } from "react";
import { useMap, Polyline, Marker } from "react-leaflet";
import { decode } from "@googlemaps/polyline-codec";
import L from "leaflet";
import { getSeverityColor, redMarkerIcon } from "@/components/utils";
import { useMapRoute } from "@/store/mapStore";

const MAX_ROUTE_METERS = 1000;

export default function RouteDisplay() {
  const {
    origin,
    destination,
    severity,
    setRouteData: onRouteFound,
    setRouteError: onError,
  } = useMapRoute();

  const map = useMap();
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (!origin || !destination) return;
    const currentOrigin = origin;
    const currentDestination = destination;
    async function fetchRoute() {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${currentOrigin.lng},${currentOrigin.lat};${currentDestination.lng},${currentDestination.lat}?overview=full&geometries=polyline`,
        );
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          if (route.distance > MAX_ROUTE_METERS) {
            const km = (route.distance / 1000).toFixed(1);
            onError(`Route is ${km} km — max allowed is 1 km. Pick closer points.`);
            return;
          }
          const encoded = route.geometry;
          const decoded = decode(encoded).map(
            ([lat, lng]) => [lat, lng] as [number, number],
          );
          setRoutePath(decoded);
          onRouteFound(encoded, route.distance);

          if (decoded.length > 0 && map) {
            const bounds = L.latLngBounds(
              decoded.map((p) => L.latLng(p[0], p[1])),
            );
            map.flyToBounds(bounds, { padding: [50, 50], duration: 0.5 });
          }
        }
      } catch (err) {
        console.error("Failed to fetch route from OSRM", err);
      }
    }
    fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, map]); // Removed onRouteFound to prevent effect loops if it changes identity

  if (!origin) return null;

  if (!routePath) {
    return redMarkerIcon ? <Marker position={origin} icon={redMarkerIcon} /> : null;
  }

  return (
    <Polyline
      positions={routePath}
      pathOptions={{
        className:
          severity === "high"
            ? "animated-polyline-high border"
            : "animated-polyline border",
        color: getSeverityColor(severity),
        weight: severity === "high" ? 6 : 4,
        opacity: 1,
      }}
    />
  );
}
