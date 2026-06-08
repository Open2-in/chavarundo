"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { extendLeaflet } from "@india-boundary-corrector/leaflet-layer";

// Extend Leaflet with the boundary corrector plugin
if (typeof window !== "undefined") {
  extendLeaflet(L);
}

interface IndiaBoundaryCorrectedTileLayerProps {
  url: string;
  attribution?: string;
  className?: string;
}

export default function IndiaBoundaryCorrectedTileLayer({
  url,
  attribution,
  className,
}: IndiaBoundaryCorrectedTileLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Instantiate the boundary-corrected TileLayer using local data
    const layer = (L.tileLayer as any).indiaBoundaryCorrected(url, {
      attribution,
      className,
      layerConfig: "osm-carto",
      pmtilesUrl: "/leaflet/india_boundary_corrections.pmtiles",
    });

    layer.on("correctionerror", (e: any) => {
      console.error("[IndiaBoundaryCorrectedTileLayer] Correction error:", e.error);
    });

    layer.addTo(map);

    return () => {
      layer.off("correctionerror");
      map.removeLayer(layer);
    };
  }, [map, url, attribution, className]);

  return null;
}

