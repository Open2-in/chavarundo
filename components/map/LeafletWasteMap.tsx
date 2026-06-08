"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Sun, Moon, Plus, Trophy, UserCircle, Search, HelpCircle } from "lucide-react";
import { useTheme } from "next-themes";

import { initClarity } from "@/lib/clarity";
import { useUser } from "@/store/userStore";
import { useWasteReports } from "@/store/firebase";
import { useUI } from "@/store/uiStore";
import { useReportWizard } from "@/store/reportFormStore";
import { useMapSelection } from "@/store/mapStore";

// Sub-panels
import ProfilePanel from "../profile/ProfilePanel";
import AuthorityProfilePanel from "../profile/AuthorityProfilePanel";
import LeaderboardPanel from "../leaderboard/LeaderboardPanel";
import OnboardingGuide from "../OnboardingGuide";

import {
  clampToRadius,
} from "@/components/utils";

// Sub-components
import {
  ReportsMarquee,
  MapEventsHandler,
  RenderReports,
  MapFlyHandler,
  ReportingOverlay,
  MapSearch,
} from "./components";

import {
  SignInToReportModal,
  AddGarbageReport,
} from "@/components/report";

// Fix default marker icon issues in Leaflet using local assets
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/leaflet/marker-icon.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });
}



export default function LeafletWasteMap({ initialReports }: { initialReports?: any[] }) {
  const hookReports = useWasteReports((s) => s.reports);
  const reportsLoading = useWasteReports((s) => s.loading);
  const initialize = useWasteReports((s) => s.initialize);

  const {
    activeReportForm,
    setActiveReportForm,
    originalExifCoords,
    adjustedCoords,
    setAdjustedCoords,
    cancelReporting: storeCancelReporting,
  } = useReportWizard();

  const { activePanel, setActivePanel } = useUI();



  const {
    setPendingDeepLinkId,
    profileSubject,
    setProfileSubject,
    authoritySubject,
  } = useMapSelection();

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  const reports = hookReports.length > 0 || !reportsLoading ? hookReports : (initialReports ?? []);
  const { user } = useUser();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = localStorage.getItem("chavarundo_guide_seen");
    if (!seen) {
      setActivePanel('guide');
    }
  }, [setActivePanel]);

  // Reporting state
  const reportingMode = activeReportForm !== null;

  useEffect(() => {
    // Defer Clarity analytics to free up main thread for faster map rendering
    if (typeof window !== "undefined") {
      const runClarity = () => initClarity();
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(runClarity, { timeout: 3000 });
      } else {
        setTimeout(runClarity, 3000);
      }
    }
  }, []);

  // Keep --app-height in sync with the actual visible viewport
  useEffect(() => {
    const update = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${h}px`);
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);



  const deepLinkHandled = useRef(false);

  useEffect(() => {
    if (!deepLinkHandled.current && reports.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (id && reports.some((r) => r.id === id)) {
        deepLinkHandled.current = true;
        setPendingDeepLinkId(id);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [reports]);

  const handleCancelReporting = () => {
    storeCancelReporting();
  };


  return (
    <div className="relative w-full h-app bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
      <MapContainer
        center={[10.8505, 76.2711]}
        zoom={7}
        style={{ width: "100%", height: "100%", background: mounted && resolvedTheme === 'light' ? '#f1f5f9' : '#0f172a' }}
        attributionControl={false}
        zoomControl={false}
      >
        {mounted && (
          <TileLayer
            key={resolvedTheme}
            className={resolvedTheme === 'light' ? "light-map-tiles" : "dark-map-tiles"}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        )}

        <MapEventsHandler reportingMode={reportingMode} />

        {/* Existing Reports */}
        <RenderReports />

        {/* Step 3 marker adjustments & circle constraint */}
        {activeReportForm === 'locationAdjust' && originalExifCoords && (
          <Circle
            center={[originalExifCoords.lat, originalExifCoords.lng]}
            radius={30}
            pathOptions={{
              color: "#00f0ff",
              fillColor: "#00f0ff",
              fillOpacity: 0.15,
              weight: 2,
              dashArray: "5, 5",
            }}
          />
        )}
        {activeReportForm === 'locationAdjust' && adjustedCoords && (
          <Marker
            position={[adjustedCoords.lat, adjustedCoords.lng]}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                if (originalExifCoords) {
                  const clamped = clampToRadius(originalExifCoords, position, 30);
                  setAdjustedCoords(clamped);
                  marker.setLatLng([clamped.lat, clamped.lng]);
                }
              },
            }}
          />
        )}
        {activeReportForm === 'locationAdjust' && originalExifCoords && (
          <MapFlyHandler coords={originalExifCoords} />
        )}



        <ReportingOverlay />

        <MapSearch isOpen={activePanel === 'search'} onClose={() => setActivePanel(null)} />
      </MapContainer>

      <AddGarbageReport />
      {/* Control buttons — outside MapContainer for reliable rendering */}
      {mounted && (
        <div className="absolute bottom-16 right-4 z-[1000] flex flex-col gap-2">
          {/* Report — primary action */}
          <div className="relative">
            {/* Beacon ring */}
            <span className="absolute inset-0 rounded animate-ping bg-neutral-400 dark:bg-cyan-500 opacity-40 pointer-events-none" />
            <button
              onClick={() => {
                if (user) {
                  setActiveReportForm('photoCapture');
                } else {
                  setActivePanel('signInPrompt');
                }
              }}
              className="relative p-2 bg-white/90 dark:bg-black/90 border border-neutral-200 dark:border-cyan-500/30 rounded shadow-md text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-cyan-900/30 hover:shadow-[0_0_12px_rgba(0,100,255,0.3)] dark:hover:shadow-[0_0_12px_rgba(0,255,255,0.3)] transition-all"
              title="Report Waste"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {/* Leaderboard */}
          <button
            onClick={() => setActivePanel('leaderboard')}
            className="p-2 bg-white/90 dark:bg-black/90 border border-neutral-200 dark:border-cyan-500/30 rounded shadow-md text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 hover:shadow-[0_0_12px_rgba(234,179,8,0.3)] transition-all"
            title="Leaderboard"
          >
            <Trophy className="w-5 h-5" />
          </button>
          {/* Profile — only when logged in (non-anonymous) */}
          {user && !user.isAnonymous && (
            <button
              onClick={() => {
                setProfileSubject(null);
                setActivePanel('profile');
              }}
              className="p-1.5 bg-white/90 dark:bg-black/90 border border-neutral-200 dark:border-cyan-500/30 rounded shadow-md overflow-hidden hover:shadow-[0_0_12px_rgba(0,100,255,0.2)] dark:hover:shadow-[0_0_12px_rgba(0,255,255,0.2)] transition-all"
              title="Profile"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-5 h-5 rounded-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserCircle className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
              )}
            </button>
          )}
          {/* Search */}
          <button
            onClick={() => setActivePanel(activePanel === 'search' ? null : 'search')}
            className={`p-2 bg-white/90 dark:bg-black/90 border rounded shadow-md transition-all ${activePanel === 'search'
              ? "border-blue-400 dark:border-cyan-400 text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-900/30 shadow-[0_0_12px_rgba(0,100,255,0.25)] dark:shadow-[0_0_12px_rgba(0,255,255,0.25)]"
              : "border-neutral-200 dark:border-cyan-500/30 text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-cyan-900/30 hover:shadow-[0_0_12px_rgba(0,100,255,0.2)] dark:hover:shadow-[0_0_12px_rgba(0,255,255,0.2)]"
              }`}
            title="Search Location"
          >
            <Search className="w-5 h-5" />
          </button>
          {/* Help / Guide */}
          <button
            onClick={() => setActivePanel('guide')}
            className="p-2 bg-white/90 dark:bg-black/90 border border-neutral-200 dark:border-cyan-500/30 rounded shadow-md text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:shadow-[0_0_12px_rgba(0,255,255,0.3)] transition-all"
            title="How it Works"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 bg-white/90 dark:bg-black/90 border border-neutral-200 dark:border-cyan-500/30 rounded shadow-md text-blue-700 dark:text-cyan-400 hover:bg-neutral-100 dark:hover:bg-blue-100/40 dark:bg-cyan-900/40 transition-all"
            title="Toggle Theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      )}

      {/* Sign-in prompt for reporting — shown from the + Report FAB */}
      {activePanel === 'signInPrompt' && (
        <SignInToReportModal
          onClose={() => setActivePanel(null)}
          onAnonymous={() => {
            setActivePanel(null);
            setActiveReportForm('photoCapture');
          }}
        />
      )}

      <ReportsMarquee reports={reports} />

      {/* Profile Panel — own profile (logged in) or any contributor's public profile */}
      {((user && !user.isAnonymous) || profileSubject) && (
        <ProfilePanel />
      )}
      <AuthorityProfilePanel />
      <LeaderboardPanel />
      <OnboardingGuide
        isOpen={activePanel === 'guide'}
        onClose={(completedOrSkipped) => {
          setActivePanel(null);
          if (completedOrSkipped) {
            localStorage.setItem("chavarundo_guide_seen", "true");
          }
        }}
      />


    </div>
  );
}
