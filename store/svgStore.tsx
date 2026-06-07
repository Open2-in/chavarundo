"use client";

import { useEffect } from "react";
import { create } from "zustand";

interface SVGStore {
  cache: Record<string, string>;
  setSVG: (url: string, content: string) => void;
}

const LOCAL_STORAGE_PREFIX = "svg-cache:";

const getCachedSVG = (url: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${url}`);
  } catch (e) {
    console.error("Failed to read SVG from localStorage", e);
    return null;
  }
};

const setCachedSVG = (url: string, content: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${url}`, content);
  } catch (e) {
    console.error("Failed to save SVG to localStorage", e);
  }
};

export const useSVGStore = create<SVGStore>((set) => ({
  cache: {},
  setSVG: (url, content) =>
    set((state) => ({
      cache: { ...state.cache, [url]: content },
    })),
}));

export function useSVG(url: string | undefined) {
  const cache = useSVGStore((s) => s.cache);
  const setSVG = useSVGStore((s) => s.setSVG);

  useEffect(() => {
    if (!url) return;

    // 1. Check memory cache
    if (cache[url]) return;

    // 2. Check localStorage
    const cached = getCachedSVG(url);
    if (cached) {
      setSVG(url, cached);
      return;
    }

    // 3. Fetch from network
    let active = true;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
      })
      .then((content) => {
        if (active) {
          setSVG(url, content);
          setCachedSVG(url, content);
        }
      })
      .catch((err) => {
        console.error(`Failed to load SVG from ${url}:`, err);
      });

    return () => {
      active = false;
    };
  }, [url, cache, setSVG]);

  return url ? cache[url] || "" : "";
}
