import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import L from "leaflet";
import { ChevronDown, Heart, ExternalLink, Bug, LogOut } from "lucide-react";

import { useAuthStore } from "@/lib/store";
import { logout } from "@/lib/firebase";

interface ReportingOverlayProps {
  reportsCount: number;
  reportingMode: boolean;
  setReportingMode: (val: boolean) => void;
  origin: any;
  destination: any;
  pointsConfirmed: boolean;
  onConfirmPoints: () => void;
  currentPathEncoded: string | null;
  currentRouteDistance: number | null;
  routeError: string | null;
  severity: "low" | "medium" | "high";
  setSeverity: (s: "low" | "medium" | "high") => void;
  onCancel: () => void;
  setReportStep: (step: number) => void;
}

export default function ReportingOverlay({
  reportsCount,
  reportingMode,
  setReportingMode,
  origin,
  destination,
  pointsConfirmed,
  onConfirmPoints,
  currentPathEncoded,
  currentRouteDistance,
  routeError,
  severity,
  setSeverity,
  onCancel,
  setReportStep,
}: ReportingOverlayProps) {
  const user = useAuthStore((state) => state.user);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDesktopHovered, setIsDesktopHovered] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        isExpanded &&
        overlayRef.current &&
        !overlayRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isExpanded]);

  useEffect(() => {
    if (overlayRef.current) {
      L.DomEvent.disableClickPropagation(overlayRef.current);
      L.DomEvent.disableScrollPropagation(overlayRef.current);
    }
  }, []);

  if (!reportingMode) {
    return (
      <div
        ref={overlayRef}
        className="absolute z-[1000] left-4 right-4 md:right-auto md:w-80 flex flex-col gap-3 font-mono pointer-events-none" style={{ top: "max(1rem, var(--sat))" }}
        onMouseEnter={() => setIsDesktopHovered(true)}
        onMouseLeave={() => setIsDesktopHovered(false)}
      >
        <div className="bg-white/80 dark:bg-black/80 border border-blue-500/50 dark:border-cyan-500/50 p-4 md:p-5 shadow-[0_0_20px_rgba(0,255,255,0.15)] backdrop-blur-md relative pointer-events-auto transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>

          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-bold tracking-[0.2em] text-blue-600 dark:text-cyan-400 flex items-center gap-2 md:gap-3 uppercase">
                <span className="flex items-center justify-center">
                  <img
                    src="/logo.svg"
                    alt="Chavarundo logo"
                    className="w-7 h-7 md:w-8 md:h-8"
                    draggable={false}
                  />
                </span>
                <span className="font-malayalam text-lg md:text-xl tracking-normal normal-case font-normal">
                  ചവറുണ്ടോ?
                </span>
              </h1>
              <div className="text-[9px] md:text-[10px] text-blue-700/80 dark:text-cyan-500/80 mt-1 uppercase tracking-widest font-semibold flex items-center gap-1 overflow-hidden h-4 md:h-5">
                <div className="flex items-center justify-center mr-0.5">
                  <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff003c] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-[#ff003c]"></span>
                  </span>
                </div>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={reportsCount}
                    initial={{
                      y: -15,
                      opacity: 0,
                      filter: "blur(4px)",
                      color: "#00f0ff",
                    }}
                    animate={{
                      y: 0,
                      opacity: 1,
                      filter: "blur(0px)",
                      color: "currentColor",
                    }}
                    exit={{
                      y: 15,
                      opacity: 0,
                      filter: "blur(4px)",
                      color: "#00f0ff",
                    }}
                    transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
                    className="inline-block"
                  >
                    {reportsCount}
                  </motion.span>
                </AnimatePresence>
                <span>
                  {reportsCount === 1 ? "Waste Spot" : "Waste Spots"} Reported
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="md:hidden flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-cyan-300 px-2 py-1.5 border border-blue-400/50 dark:border-cyan-400/50 bg-blue-100/50 dark:bg-cyan-900/50 hover:bg-blue-50/60 dark:bg-cyan-800/60 shadow-[0_0_8px_rgba(0,255,255,0.2)] transition-all"
              >
                <div
                  className="transition-transform duration-300"
                  style={{ transform: `rotate(${isExpanded ? 180 : 0}deg)` }}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
                {isExpanded ? "Less" : "More"}
              </button>
            </div>
          </div>

          <div
            className={`grid transition-[grid-template-rows] duration-300 ${isDesktopHovered ? "md:grid-rows-[1fr]" : "md:grid-rows-[0fr]"} ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
            <div className="overflow-hidden flex flex-col">
              <div className="pt-3">
                <p className="text-[9px] md:text-[10px] text-blue-700/70 dark:text-cyan-500/70 uppercase tracking-widest border-t border-blue-500/20 dark:border-cyan-500/20 pt-2">
                  Community Waste & Garbage Tracker
                </p>
                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-blue-500/20 dark:border-cyan-500/20 flex items-center gap-1.5 text-[8px] md:text-[9px] text-blue-700/60 dark:text-cyan-500/60 uppercase tracking-widest">
                  <span>Built with</span>
                  <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 text-red-500 fill-red-500 animate-pulse" />
                  <span>by</span>
                  <a
                    href="https://github.com/ananthun111"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-cyan-400 hover:text-black dark:text-white transition-colors underline underline-offset-2 decoration-cyan-500/50 pointer-events-auto"
                  >
                    Anantha Narayanan K
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-300 pointer-events-auto ${isDesktopHovered ? "md:grid-rows-[1fr]" : "md:grid-rows-[0fr]"} ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden flex flex-col">
            <div className="flex flex-col gap-2 md:gap-3">
              <button
                onClick={() => document.getElementById("seo-content")?.scrollIntoView({ behavior: "smooth" })}
                className="bg-white/50 dark:bg-black/50 hover:bg-blue-50/10 dark:bg-cyan-500/10 text-blue-700 dark:text-cyan-500 hover:text-blue-500 dark:text-cyan-300 py-1.5 md:py-2 px-4 transition-all border border-blue-500/30 dark:border-cyan-500/30 hover:border-blue-400/50 dark:border-cyan-400/50 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest backdrop-blur-md"
              >
                <ExternalLink className="w-3 h-3" /> About
              </button>
              <a
                href="https://github.com/open2-in/chavarundo/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/50 dark:bg-black/50 hover:bg-yellow-500/10 text-blue-700 dark:text-cyan-500 hover:text-yellow-400 py-1.5 md:py-2 px-4 transition-all border border-blue-500/30 dark:border-cyan-500/30 hover:border-yellow-500/50 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest backdrop-blur-md"
              >
                <Bug className="w-3 h-3" /> Report a Bug <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
              {user && (
                <button
                  onClick={logout}
                  className="bg-white/50 dark:bg-black/50 hover:bg-red-500/20 text-blue-700 dark:text-cyan-500 hover:text-red-400 py-1.5 md:py-2 px-4 transition-all border border-blue-500/30 dark:border-cyan-500/30 hover:border-red-500/50 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest backdrop-blur-md"
                >
                  <LogOut className="w-3 h-3" /> SIGN OUT
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
