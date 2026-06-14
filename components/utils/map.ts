import L from "leaflet";

export const getSeverityColor = (severity?: string, theme?: string) => {
  let isDark = true;
  if (theme) {
    isDark = theme === "dark";
  } else if (typeof window !== "undefined") {
    isDark = document.documentElement.classList.contains("dark");
  }

  if (isDark) {
    switch (severity) {
      case "high":
        return "#ff003c";
      case "medium":
        return "#ff9900";
      case "low":
      default:
        return "#00f0ff";
    }
  } else {
    switch (severity) {
      case "high":
        return "#dc2626";
      case "medium":
        return "#ea580c";
      case "low":
      default:
        return "#0284c7";
    }
  }
};

export const createDotIcon = (color: string, severity: string, isSelected = false) => {
  if (typeof window === "undefined") return null;
  const icon = L.divIcon({
    className: "bg-transparent",
    html: `
      <div class="marker-pulse-container relative -left-1.5 -top-1.5" data-severity="${severity}">
        ${isSelected ? "" : `<div class="marker-pulse-ring" style="background-color: ${color};"></div>`}
        <div class="marker-pulse-dot" style="background-color: ${color}; box-shadow: 0 0 10px ${color};"></div>
      </div>
    `,
    iconSize: [0, 0],
  });
  (icon.options as any).severity = severity;
  return icon;
};

export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function clampToRadius(
  center: { lat: number; lng: number },
  target: { lat: number; lng: number },
  maxRadiusMeters: number
): { lat: number; lng: number } {
  const dist = getDistanceMeters(center.lat, center.lng, target.lat, target.lng);
  if (dist <= maxRadiusMeters) {
    return target;
  }
  const ratio = maxRadiusMeters / dist;
  const lat = center.lat + (target.lat - center.lat) * ratio;
  const lng = center.lng + (target.lng - center.lng) * ratio;
  return { lat, lng };
}

export function getGeotagPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

const REPORTER_NAME_KEY = "chavarundo:reporterName";
const MAX_REPORTER_NAME = 50;

export function clampReporterName(name: string): string {
  return name.slice(0, MAX_REPORTER_NAME);
}

export function getStoredReporterName(): string {
  if (typeof window === "undefined") return "";
  try {
    return clampReporterName(window.localStorage.getItem(REPORTER_NAME_KEY) || "");
  } catch {
    return "";
  }
}

export function saveReporterName(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = clampReporterName(name.trim());
  if (!trimmed) return;
  try {
    window.localStorage.setItem(REPORTER_NAME_KEY, trimmed);
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

export const ROAD_AUTHORITY_MAP: Record<string, { label: string; authority: string; color: string }> = {
  motorway: { label: "National Highway", authority: "national", color: "#f59e0b" },
  motorway_link: { label: "National Highway", authority: "national", color: "#f59e0b" },
  trunk: { label: "State Highway", authority: "national", color: "#f59e0b" },
  trunk_link: { label: "State Highway", authority: "national", color: "#f59e0b" },
  primary: { label: "State Highway", authority: "national", color: "#f59e0b" },
  primary_link: { label: "State Highway", authority: "national", color: "#f59e0b" },
  secondary: { label: "State PWD Road", authority: "pwd", color: "#f97316" },
  secondary_link: { label: "State PWD Road", authority: "pwd", color: "#f97316" },
  tertiary: { label: "Panchayat Road", authority: "lsgd", color: "#a78bfa" },
  tertiary_link: { label: "Panchayat Road", authority: "lsgd", color: "#a78bfa" },
};

export function getRoadAuthority(highwayTag: string) {
  return ROAD_AUTHORITY_MAP[highwayTag] ?? { label: "Local Road", authority: "ward", color: "#34d399" };
}
