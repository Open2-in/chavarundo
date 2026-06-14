import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { useTheme } from "next-themes";
import { decode } from "@googlemaps/polyline-codec";
import { fetchWithAppCheck } from "@/lib/appcheck-fetch";
import { useWasteReports } from "@/store/firebase";
import { getSeverityColor, createDotIcon, getRoadAuthority } from "@/components/utils";

interface MiniMapProps {
  reportId: string;
  encodedPath: string;
  severity: string;
  roadAuthority?: string;
  highwayTag?: string;
}

export default function MiniMap({
  reportId,
  encodedPath,
  severity,
  roadAuthority: initialRoadAuthority,
  highwayTag: initialHighwayTag,
}: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [roadAuthority, setRoadAuthority] = useState(initialRoadAuthority);
  const [highwayTag, setHighwayTag] = useState(initialHighwayTag);
  const { resolvedTheme: theme } = useTheme();
  const editRecord = useWasteReports((s) => s.editRecord);

  const coords = decode(encodedPath).map(([lat, lng]) => [lat, lng] as [number, number]);

  useEffect(() => {
    if (!containerRef.current || !coords.length) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });
    mapRef.current = map;

    L.tileLayer(
      theme === 'light'
        ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19 }
    ).addTo(map);

    const color = getSeverityColor(severity, theme);
    if (coords.length === 1) {
      const dot = createDotIcon(color, severity, false);
      if (dot) {
        L.marker(coords[0], {
          icon: dot,
        }).addTo(map);
      }
      map.setView(coords[0], 16, { animate: false });
    } else {
      L.polyline(coords, {
        color,
        weight: 5,
        opacity: 0.9,
        className: severity === "high" ? "animated-polyline-high" : "animated-polyline",
      }).addTo(map);
      map.fitBounds(L.latLngBounds(coords), { padding: [10, 10], animate: false });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [encodedPath, theme]);

  // Fetch classification if missing, then persist it
  useEffect(() => {
    if (roadAuthority || !coords.length) return;
    let cancelled = false;
    const [lat, lng] = coords[0];
    fetchWithAppCheck(`/api/road-classification?lat=${lat}&lng=${lng}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        setRoadAuthority(data.roadAuthority);
        setHighwayTag(data.highwayTag);
        editRecord(reportId, data).catch(() => { });
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [reportId, roadAuthority, coords, editRecord]);

  if (!coords.length) return null;

  const authority = highwayTag ? getRoadAuthority(highwayTag) : null;
  const authorityLabel = roadAuthority === "ward" ? "Ward Member" : roadAuthority === "lsgd" ? "Panchayat / LSGD" : roadAuthority === "pwd" ? "MLA / State PWD" : roadAuthority === "national" ? "MP / NHAI" : null;

  return (
    <div className="relative" style={{ height: 160 }}>
      <div
        ref={containerRef}
        style={{ height: 160, borderRadius: "0.375rem", border: "1px solid rgba(0,255,255,0.2)", overflow: "hidden" }}
      />
      <div className="absolute top-2 left-2 z-[1000]">
        {authority && authorityLabel ? (
          <div className="flex items-center gap-1.5 bg-white/70 dark:bg-black/70 backdrop-blur-sm px-2 py-1 rounded" style={{ border: `1px solid ${authority.color}40` }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: authority.color }} />
            <span className="text-[9px] uppercase font-bold tracking-wide" style={{ color: authority.color }}>{authority.label}</span>
            <span className="text-[9px] text-black dark:text-white/50">→ {authorityLabel}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-white/70 dark:bg-black/70 backdrop-blur-sm px-2 py-1 rounded border border-emerald-500/20 dark:border-cyan-500/20 overflow-hidden" style={{ width: 160 }}>
            <div className="h-3 rounded w-full bg-gradient-to-r from-cyan-900/40 via-cyan-500/20 to-cyan-900/40" style={{ backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
          </div>
        )}
      </div>
    </div>
  );
}
