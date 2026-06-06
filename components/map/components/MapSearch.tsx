import { useState, useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Search, X } from "lucide-react";
import { fetchWithAppCheck } from "@/lib/appcheck-fetch";

import { Card, Button } from "@/components/base";

interface MapSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MapSearch({ isOpen, onClose }: MapSearchProps) {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setShowResults(false);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isOpen, onClose]);

  // Block map clicks propagating through the panel
  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current);
      L.DomEvent.disableScrollPropagation(containerRef.current);
    }
  }, []);

  const normalizeSearchResults = (data: any) => {
    const items = Array.isArray(data)
      ? data
      : Array.isArray(data?.predictions)
        ? data.predictions
        : [];

    return items
      .map((item: any) => {
        const lat = item.lat ?? item.geometry?.location?.lat;
        const lon = item.lon ?? item.lng ?? item.geometry?.location?.lng;
        const terms = item.terms ?? [];

        return {
          ...item,
          display_name: item.display_name ?? item.description ?? "",
          name: item.name ?? item.structured_formatting?.main_text,
          lat: String(lat ?? ""),
          lon: String(lon ?? ""),
          address: item.address ?? {
            road: terms[0]?.value,
            city: terms[1]?.value,
            state: terms.at(-3)?.value,
            country: terms.at(-1)?.value,
          },
        };
      })
      .filter((item: any) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)));
  };

  const searchPlaces = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setShowResults(true);
    setIsSearching(true);
    try {
      const res = await fetchWithAppCheck(`/api/search?q=${encodeURIComponent(text)}`);
      const data = await res.json();
      setResults(normalizeSearchResults(data));
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const goToPlace = (result: any) => {
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    if (map) {
      map.flyTo([lat, lon], 15);
    }
    setQuery("");
    setResults([]);
    setShowResults(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 z-[1001] bg-white/30 dark:bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Centered search card */}
      <div
        ref={containerRef}
        className="absolute z-[1002] left-1/2 -translate-x-1/2 w-[min(420px,90vw)] font-mono"
        style={{ top: "max(5rem, calc(4rem + var(--sat)))" }}
      >
        {/* Input row */}
        <Card variant="default" padding="none" className="flex-row items-center rounded-2xl px-1 pr-1 border-blue-400/60 dark:border-cyan-500/60 shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,255,255,0.08)]">
          <Search className="w-4 h-4 text-blue-500/70 dark:text-cyan-500/60 ml-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => searchPlaces(e.target.value)}
            placeholder="Search location..."
            style={{ fontSize: 15 }}
            className="flex-1 bg-transparent text-blue-700 dark:text-cyan-300 px-3 py-3 outline-none placeholder:text-blue-400/50 dark:placeholder:text-cyan-500/40 font-mono min-w-0"
          />
          {isSearching && (
            <span className="w-3.5 h-3.5 border-2 border-blue-400 dark:border-cyan-400 border-t-transparent rounded-full animate-spin mr-2 shrink-0" />
          )}
          <Button
            onClick={onClose}
            variant="ghost"
            className="p-2 text-blue-400/70 dark:text-cyan-500/50 hover:text-blue-700 dark:hover:text-cyan-300 hover:bg-blue-50 dark:hover:bg-cyan-900/30"
          >
            <X className="w-4 h-4" />
          </Button>
        </Card>

        {/* Results */}
        {showResults && results.length > 0 && (
          <Card variant="default" padding="none" className="mt-1.5 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden max-h-[min(15rem,45vh)] overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => goToPlace(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50/80 dark:hover:bg-cyan-900/40 text-blue-700 dark:text-cyan-300 flex flex-col border-b border-blue-100/60 dark:border-cyan-500/10 last:border-0 transition-colors cursor-pointer"
              >
                <span className="font-bold text-xs truncate w-full block">
                  {r.name || r.display_name?.split(",")[0] || "Unknown"}
                </span>
                <span className="text-[10px] text-blue-500/70 dark:text-cyan-500/60 truncate w-full block mt-0.5">
                  {r.subtitle || r.display_name || ""}
                </span>
              </button>
            ))}
          </Card>
        )}

        {showResults && query.trim() && !isSearching && results.length === 0 && (
          <Card variant="default" className="mt-1.5 rounded-2xl px-4 py-3 text-[11px] text-blue-500/70 dark:text-cyan-500/50 uppercase tracking-widest text-center">
            No results found
          </Card>
        )}
      </div>
    </>
  );
}
