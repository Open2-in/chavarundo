"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Sun, Moon, Plus, Trophy, UserCircle, Search, HelpCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { encode } from "@googlemaps/polyline-codec";
import { onAuthStateChanged } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";

import { loginAnonymously, logout, auth } from "@/lib/firebase";
import { fetchWithAppCheck } from "@/lib/appcheck-fetch";
import { initClarity } from "@/lib/clarity";
import { useAuthStore } from "@/lib/store";
import { useWasteReports } from "@/store/firebase";

// Sub-panels
import ProfilePanel from "../profile/ProfilePanel";
import AuthorityProfilePanel from "../profile/AuthorityProfilePanel";
import LeaderboardPanel from "../leaderboard/LeaderboardPanel";
import OnboardingGuide from "../OnboardingGuide";

// Utilities and Helpers
import {
  redMarkerIcon,
  clampToRadius,
  clampReporterName,
  getStoredReporterName,
  saveReporterName,
} from "./utils";

// Sub-components
import ReportsMarquee from "./components/ReportsMarquee";
import MapEventsHandler from "./components/MapEventsHandler";
import RouteDisplay from "./components/RouteDisplay";
import RenderReports from "./components/RenderReports";
import SignInToReportModal from "./components/SignInToReportModal";
import PhotoCaptureModal from "./components/PhotoCaptureModal";
import MapAdjustmentOverlay from "./components/MapAdjustmentOverlay";
import SubmitReportForm from "./components/SubmitReportForm";
import AIReviewOverlay from "./components/AIReviewOverlay";
import MapFlyHandler from "./components/MapFlyHandler";
import ReportingOverlay from "./components/ReportingOverlay";
import SubmitRouteForm from "./components/SubmitRouteForm";
import MapSearch from "./components/MapSearch";

// Fix default marker icon issues in Leaflet
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

export default function LeafletWasteMap({ initialReports }: { initialReports?: any[] }) {
  const {
    reports: hookReports,
    loading: reportsLoading,
    addRecord,
  } = useWasteReports();
  const reports = hookReports.length > 0 || !reportsLoading ? hookReports : (initialReports ?? []);
  const [detailReportId, setDetailReportId] = useState<string | null>(null);
  const [pendingDeepLinkId, setPendingDeepLinkId] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSubject, setProfileSubject] = useState<
    { uid: string; name: string; photoURL?: string } | null
  >(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [authorityOpen, setAuthorityOpen] = useState(false);
  const [authoritySubject, setAuthoritySubject] = useState<any>(null);
  const [showSignInReportPrompt, setShowSignInReportPrompt] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = localStorage.getItem("chavarundo_guide_seen");
    if (!seen) {
      setGuideOpen(true);
    }
  }, []);

  // Reporting state
  const [reportingMode, setReportingMode] = useState(false);
  const [reportingSeverity, setReportingSeverity] = useState<
    "low" | "medium" | "high"
  >("low");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [destination, setDestination] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [currentPathEncoded, setCurrentPathEncoded] = useState<string | null>(null);
  const [currentRouteDistance, setCurrentRouteDistance] = useState<number | null>(null);
  const [pointsConfirmed, setPointsConfirmed] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => { initClarity(); }, []);

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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribeAuth();
  }, [setUser]);

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

  // Revamped Photo-based Reporting state
  const [reportStep, setReportStep] = useState<number>(0); // 0 = inactive, 1 = photo select, 3 = map adjust, 4 = details form
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [originalExifCoords, setOriginalExifCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [adjustedCoords, setAdjustedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isAIReviewing, setIsAIReviewing] = useState(false);
  const [reviewPhase, setReviewPhase] = useState<'road' | 'ai'>('road');
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [aiReviewResult, setAiReviewResult] = useState<{ success: boolean; verified: boolean; reasoning: string; phase?: 'road' | 'ai' } | null>(null);
  const [exifError, setExifError] = useState<string | null>(null);
  const [pendingReportPayload, setPendingReportPayload] = useState<any | null>(null);

  const cancelReporting = () => {
    setReportingMode(false);
    setOrigin(null);
    setDestination(null);
    setCurrentPathEncoded(null);
    setCurrentRouteDistance(null);
    setPointsConfirmed(false);

    // Clear new states
    setReportStep(0);
    setReportImage(null);
    setOriginalExifCoords(null);
    setAdjustedCoords(null);
    setExifError(null);
    setIsAIReviewing(false);
    setAiReviewResult(null);
    setSubmittedReportId(null);
    setPendingReportPayload(null);
  };

  const handleReportPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExifError(null);
    setReportImage(null);

    try {
      const isHeic = file.type === "image/heic" || file.type === "image/heif"
        || file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");

      let checkBlob: Blob = file;
      if (isHeic) {
        const heic2any = (await import("heic2any")).default;
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        checkBlob = Array.isArray(converted) ? converted[0] : converted;
      }

      const img = new Image();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX = 800;
            let w = img.width, h = img.height;
            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
            else { if (h > MAX) { w *= MAX / h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const url = canvas.toDataURL("image/jpeg", 0.6);
              resolve(url);
            } else {
              reject(new Error("canvas_error"));
            }
          };
          img.onerror = () => reject(new Error("img_load"));
          if (ev.target?.result) img.src = ev.target.result as string;
        };
        reader.readAsDataURL(checkBlob);
      });

      setReportImage(dataUrl);
      setReportStep(3);
    } catch (err: any) {
      console.error(err);
      setExifError("Failed to read image. Please try another photo.");
    }
  };

  const handleReportSubmit = async (data: { name: string; severity: "low" | "medium" | "high"; notes: string }) => {
    if (!adjustedCoords || !reportImage) return;

    try {
      let currentReporter = user;
      if (!currentReporter) {
        await loginAnonymously();
        const { auth: firebaseAuth } = await import("@/lib/firebase");
        currentReporter = firebaseAuth.currentUser;
      }
      if (!currentReporter) throw new Error("Authentication failed");

      const pt: [number, number] = [adjustedCoords.lat, adjustedCoords.lng];
      const encodedPath = encode([pt], 5);

      // Minimal payload — enrichment (address, constituency, road) runs after AI review
      const payload: any = {
        userId: currentReporter.uid,
        userName: data.name.trim() || "Anonymous",
        encodedPath,
        latitude: pt[0],
        longitude: pt[1],
        createdAt: serverTimestamp(),
        severity: data.severity,
        imageUrl: reportImage,
        upvoterIds: [],
      };

      if (currentReporter.photoURL) payload.userPhotoURL = currentReporter.photoURL;
      if (data.notes.trim()) payload.notes = data.notes.trim();

      saveReporterName(data.name);

      setPendingReportPayload(payload);

      setIsAIReviewing(true);
      setReportStep(0); // Hide detail form

      // ── Step 2: AI garbage verification ──
      setReviewPhase('ai');
      const checkRes = await fetchWithAppCheck("/api/garbage/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl: reportImage }),
      });

      if (!checkRes.ok) {
        throw new Error("AI service check request failed.");
      }

      const checkData = await checkRes.json();
      setAiReviewResult({
        success: checkData.success,
        verified: checkData.verified,
        reasoning: checkData.reasoning || "No explanation provided.",
        phase: 'ai',
      });
    } catch (e: any) {
      console.error(e);
      setAiReviewResult({
        success: false,
        verified: false,
        reasoning: e.message || "An unexpected error occurred during submission.",
        phase: 'ai',
      });
    } finally {
      setIsAIReviewing(false);
    }
  };

  // Retake: go back to photo capture (step 1) without deleting anything from Firestore
  const handleRetakeImage = async () => {
    setAiReviewResult(null);
    setIsAIReviewing(false);
    setReportImage(null);
    setOriginalExifCoords(null);
    setAdjustedCoords(null);
    setSubmittedReportId(null);
    setPendingReportPayload(null);
    setReportStep(1); // Back to photo capture
  };

  // Cancel: exit entirely without deleting anything from Firestore
  const handleDeleteAndCancel = async () => {
    cancelReporting();
  };

  // Confirm (Send for Review / Request Review): create report in Firestore and enrich in background
  const handleConfirmReport = async () => {
    const payload = pendingReportPayload;
    const coords = adjustedCoords;
    const isVerified = aiReviewResult?.verified;
    cancelReporting(); // Reset UI immediately — enrichment runs in background

    if (!payload || !coords) return;

    try {
      const status = isVerified ? "verified" : "pending";
      const payloadToWrite = {
        ...payload,
        status,
      };

      const reportId = await addRecord(payloadToWrite);
      setSubmittedReportId(reportId);
    } catch (e) {
      console.error("Report submission failed:", e);
    }
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

        <MapEventsHandler
          reportingMode={reportingMode}
          origin={origin}
          destination={destination}
          pointsConfirmed={pointsConfirmed}
          setOrigin={(pos) => { setOrigin(pos); setDestination(null); setCurrentPathEncoded(null); setCurrentRouteDistance(null); setPointsConfirmed(false); setRouteError(null); }}
          setDestination={setDestination}
          reportStep={reportStep}
          originalExifCoords={originalExifCoords}
          setAdjustedCoords={setAdjustedCoords}
        />

        {/* Existing Reports */}
        <RenderReports
          reports={reports}
          detailReportId={detailReportId}
          setDetailReportId={setDetailReportId}
          pendingDeepLinkId={pendingDeepLinkId}
          setPendingDeepLinkId={setPendingDeepLinkId}
          onSelectAuthority={(auth: any) => {
            setAuthoritySubject(auth);
            setAuthorityOpen(true);
            setDetailReportId(null);
          }}
        />

        {/* Step 3 marker adjustments & circle constraint */}
        {reportStep === 3 && originalExifCoords && (
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
        {reportStep === 3 && adjustedCoords && (
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
        {reportStep === 3 && originalExifCoords && (
          <MapFlyHandler coords={originalExifCoords} />
        )}

        {/* Current Reporting Route — only after user confirms both points */}
        {reportingMode && origin && destination && (
          <RouteDisplay
            origin={origin}
            destination={destination}
            severity={reportingSeverity}
            onRouteFound={(encodedPath, distanceM) => { setCurrentPathEncoded(encodedPath); setCurrentRouteDistance(distanceM); setRouteError(null); }}
            onError={(msg) => { setRouteError(msg); setCurrentPathEncoded(null); }}
          />
        )}

        {/* Markers while picking points */}
        {reportingMode && origin && !pointsConfirmed && redMarkerIcon && (
          <Marker position={origin} icon={redMarkerIcon} />
        )}
        {reportingMode && destination && !pointsConfirmed && redMarkerIcon && (
          <Marker position={destination} icon={redMarkerIcon} />
        )}

        <ReportingOverlay
          reportsCount={reports.length}
          reportingMode={reportingMode}
          setReportingMode={setReportingMode}
          origin={origin}
          destination={destination}
          pointsConfirmed={pointsConfirmed}
          onConfirmPoints={() => setPointsConfirmed(true)}
          currentPathEncoded={currentPathEncoded}
          currentRouteDistance={currentRouteDistance}
          routeError={routeError}
          severity={reportingSeverity}
          setSeverity={setReportingSeverity}
          onCancel={cancelReporting}
          setReportStep={setReportStep}
        />

        <MapSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </MapContainer>

      {reportStep === 1 && (
        <PhotoCaptureModal
          onClose={cancelReporting}
          onPhotoSelected={handleReportPhotoChange}
          errorMsg={exifError}
          setErrorMsg={setExifError}
          setCoords={(coords) => {
            setOriginalExifCoords(coords);
            setAdjustedCoords(coords);
          }}
        />
      )}

      {reportStep === 3 && (
        <MapAdjustmentOverlay
          onConfirm={() => setReportStep(4)}
          onCancel={cancelReporting}
        />
      )}

      {reportStep === 4 && reportImage && adjustedCoords && (
        <SubmitReportForm
          image={reportImage}
          coords={adjustedCoords}
          onCancel={cancelReporting}
          onSubmit={handleReportSubmit}
        />
      )}

      {(isAIReviewing || aiReviewResult) && reportImage && (
        <AIReviewOverlay
          image={reportImage}
          isReviewing={isAIReviewing}
          reviewPhase={reviewPhase}
          result={aiReviewResult}
          onConfirm={handleConfirmReport}
          onRetake={handleRetakeImage}
          onCancel={handleDeleteAndCancel}
        />
      )}

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
                  setReportingMode(true);
                  setReportStep(1);
                } else {
                  setShowSignInReportPrompt(true);
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
            onClick={() => setLeaderboardOpen(true)}
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
                setProfileOpen(true);
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
            onClick={() => setSearchOpen((o) => !o)}
            className={`p-2 bg-white/90 dark:bg-black/90 border rounded shadow-md transition-all ${searchOpen
              ? "border-blue-400 dark:border-cyan-400 text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-900/30 shadow-[0_0_12px_rgba(0,100,255,0.25)] dark:shadow-[0_0_12px_rgba(0,255,255,0.25)]"
              : "border-neutral-200 dark:border-cyan-500/30 text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-cyan-900/30 hover:shadow-[0_0_12px_rgba(0,100,255,0.2)] dark:hover:shadow-[0_0_12px_rgba(0,255,255,0.2)]"
              }`}
            title="Search Location"
          >
            <Search className="w-5 h-5" />
          </button>
          {/* Help / Guide */}
          <button
            onClick={() => setGuideOpen(true)}
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
      {showSignInReportPrompt && (
        <SignInToReportModal
          onClose={() => setShowSignInReportPrompt(false)}
          onAnonymous={() => {
            setShowSignInReportPrompt(false);
            setReportingMode(true);
            setReportStep(1);
          }}
        />
      )}

      <ReportsMarquee reports={reports} onSelect={setPendingDeepLinkId} />

      {/* Profile Panel — own profile (logged in) or any contributor's public profile */}
      {((user && !user.isAnonymous) || profileSubject) && (
        <ProfilePanel
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          user={user ?? null}
          subject={profileSubject ?? undefined}
          reports={reports}
          onLogout={logout}
          onNavigateToReport={(id) => { setProfileOpen(false); setPendingDeepLinkId(id); }}
        />
      )}
      <AuthorityProfilePanel
        isOpen={authorityOpen}
        onClose={() => setAuthorityOpen(false)}
        subject={authoritySubject}
        reports={reports}
        onNavigateToReport={(id) => { setAuthorityOpen(false); setPendingDeepLinkId(id); }}
      />
      <LeaderboardPanel
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        reports={reports}
        onSelectUser={(u) => {
          setProfileSubject(u);
          setLeaderboardOpen(false);
          setProfileOpen(true);
        }}
      />
      <OnboardingGuide
        isOpen={guideOpen}
        onClose={(completedOrSkipped) => {
          setGuideOpen(false);
          if (completedOrSkipped) {
            localStorage.setItem("chavarundo_guide_seen", "true");
          }
        }}
      />

      {reportingMode && pointsConfirmed && origin && destination && (
        <div className="absolute z-[9999] left-4 bottom-16 w-[312px] pointer-events-auto bg-white/90 dark:bg-black/90 border border-blue-500/50 dark:border-cyan-500/50 rounded-2xl p-4 shadow-[0_0_20px_rgba(0,240,255,0.2)] backdrop-blur-md max-h-[80vh] overflow-y-auto scrollbar-none flex flex-col gap-4">
          <SubmitRouteForm
            currentPathEncoded={currentPathEncoded}
            currentRouteDistance={currentRouteDistance}
            origin={origin}
            severity={reportingSeverity}
            setSeverity={setReportingSeverity}
            onCancel={cancelReporting}
          />
        </div>
      )}
    </div>
  );
}
