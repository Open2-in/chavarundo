import { useState, useEffect, useRef } from "react";
import { useMap, useMapEvents, Marker, Polyline, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { decode } from "@googlemaps/polyline-codec";
import { AnimatePresence } from "motion/react";
import { ThumbsUp, ThumbsDown, X, Camera, Trash2 } from "lucide-react";
import { deleteField } from "firebase/firestore";

import { useAuthStore } from "@/lib/store";
import { loginAnonymously } from "@/lib/firebase";
import { getConstituency } from "@/lib/constituency";
import { useWasteReports } from "@/store/firebase";
import { getColor, createDotIcon, getRoadAuthority, clampReporterName, saveReporterName } from "../utils";
import ReportDetailSheet from "./ReportDetailSheet";

interface RenderReportsProps {
  reports: any[];
  detailReportId: string | null;
  setDetailReportId: (id: string | null) => void;
  pendingDeepLinkId: string | null;
  setPendingDeepLinkId: (id: string | null) => void;
  onSelectAuthority?: (auth: any) => void;
}

export default function RenderReports({
  reports,
  detailReportId,
  setDetailReportId,
  pendingDeepLinkId,
  setPendingDeepLinkId,
  onSelectAuthority,
}: RenderReportsProps) {
  const user = useAuthStore((state) => state.user);
  const { deleteRecord, editRecord, voteRecord } = useWasteReports();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editSeverity, setEditSeverity] = useState<"low" | "medium" | "high">("low");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editReporterName, setEditReporterName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [constituencyMap, setConstituencyMap] = useState<Record<string, any>>({});
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    if (detailReportId && map) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.scrollWheelZoom.disable();
    } else if (map) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
    }
  }, [detailReportId, map]);

  useEffect(() => {
    if (!pendingDeepLinkId || !map) return;
    const report = reports.find((r) => r.id === pendingDeepLinkId);
    if (!report) return;
    const openPopup = () => {
      setDetailReportId(pendingDeepLinkId);
      setPendingDeepLinkId(null);
    };
    if (report.encodedPath) {
      const path = decode(report.encodedPath) as [number, number][];
      if (path.length <= 1) {
        map.flyTo(path[0], 16, { duration: 1.2 });
        map.once("moveend", openPopup);
      } else {
        const bounds = L.latLngBounds(path);
        map.flyToBounds(bounds, { padding: [80, 80], duration: 1.2 });
        map.once("moveend", openPopup);
      }
    } else {
      openPopup();
    }
  }, [pendingDeepLinkId, map, reports, setDetailReportId, setPendingDeepLinkId]);

  useMapEvents({
    zoomend() {
      if (map) {
        setZoom(map.getZoom());
      }
    },
    popupclose() {
      setEditingId(null);
      setDeletingId(null);
    },
  });

  const fetchConstituency = async (report: any) => {
    if (report.acName || constituencyMap[report.id] !== undefined) return;
    if (!report.encodedPath) return;
    try {
      const { decode } = await import("@googlemaps/polyline-codec");
      const path = decode(report.encodedPath);
      if (!path.length) return;
      const [lat, lng] = path[0];
      const info = await getConstituency(lat, lng);
      setConstituencyMap((prev) => ({ ...prev, [report.id]: info }));
    } catch { }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteRecord(id);
      setDeletingId(null);
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setEditImageUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSavingEdit(true);
    try {
      const updates: any = {
        severity: editSeverity,
        userName: editReporterName.trim() || "Anonymous",
      };
      if (editNotes.trim()) {
        updates.notes = editNotes.trim();
      } else {
        updates.notes = deleteField();
      }
      if (editImageUrl) {
        updates.imageUrl = editImageUrl;
      } else {
        updates.imageUrl = deleteField();
      }
      await editRecord(id, updates);
      saveReporterName(editReporterName);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleVote = async (
    reportId: string,
    type: "up" | "down",
    currentUpvoters: string[],
    currentDownvoters: string[],
  ) => {
    let voter = user;
    if (!voter) {
      await loginAnonymously();
      const { auth: firebaseAuth } = await import("@/lib/firebase");
      voter = firebaseAuth.currentUser;
      if (!voter) return;
    }
    try {
      await voteRecord(reportId, type, voter.uid, currentUpvoters, currentDownvoters);
    } catch (error) {
      console.error("Error voting: ", error);
    }
  };

  const showPolylines = zoom >= 14;

  const renderPopup = (report: any) => {
    const upvoters = report.upvoterIds || [];
    const downvoters = report.downvoterIds || [];
    const hasUpvoted = user && upvoters.includes(user.uid);
    const hasDownvoted = user && downvoters.includes(user.uid);
    const upvoteCount = upvoters.length;
    const downvoteCount = downvoters.length;

    return (
      <Popup className="futuristic-popup">
        <div className="flex flex-col gap-1 font-mono min-w-[180px] sm:min-w-[200px] bg-white/95 dark:bg-black/90 text-blue-800 dark:text-cyan-400 p-1.5 border border-blue-200 dark:border-cyan-500/30">
          <h3 className="font-bold text-[10px] uppercase tracking-widest border-b border-blue-200 dark:border-cyan-500/30 pb-0.5 m-0 flex justify-between items-center pr-4">
            <span>Waste Detected</span>
            <div className="flex gap-2">
              {(upvoteCount > 0 || downvoteCount > 0) && (
                <span
                  className={`flex items-center gap-0.5 text-[8px] ${upvoteCount - downvoteCount < 0 ? "text-red-500" : "text-blue-700 dark:text-cyan-400"}`}
                >
                  {upvoteCount - downvoteCount < 0 ? (
                    <ThumbsDown className="w-2 h-2 fill-red-500" />
                  ) : (
                    <ThumbsUp className="w-2 h-2 fill-blue-700 dark:fill-cyan-400" />
                  )}
                  {upvoteCount - downvoteCount}
                </span>
              )}
            </div>
          </h3>

          {editingId !== report.id && (
            <>
              {report.imageUrl && (
                <div className="w-full h-12 mt-0.5 border border-blue-200 dark:border-cyan-500/30 object-cover overflow-hidden">
                  <img
                    src={report.imageUrl}
                    alt="Road Waste"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="text-[9px] m-0 text-blue-600/80 dark:text-cyan-500/70 uppercase leading-tight line-clamp-1">
                <span className="text-blue-700 dark:text-cyan-500 font-bold inline mr-1">
                  Loc:
                </span>
                {report.district ? `${report.district} - ` : ""}
                {report.address || "Unknown Location"}
              </div>

              {report.roadAuthority ? (() => {
                const auth = getRoadAuthority(report.highwayTag);
                const label = report.roadAuthority === "ward" ? "Ward Member" : report.roadAuthority === "lsgd" ? "Panchayat / LSGD" : report.roadAuthority === "pwd" ? "MLA / State PWD" : "MP / NHAI";
                return (
                  <div className="text-[9px] m-0 uppercase leading-tight border-l-2 pl-1 flex flex-col gap-0.5" style={{ borderColor: auth.color + "80" }}>
                    <span style={{ color: auth.color }}><span className="font-bold">Auth:</span> {auth.label}</span>
                    <span className="text-blue-500/80 dark:text-cyan-500/60">→ {label}</span>
                  </div>
                );
              })() : (() => {
                const ac = report.acName ? report : constituencyMap[report.id];
                if (ac === undefined) return (
                  <div className="text-[9px] text-blue-400 dark:text-cyan-500/40 italic">loading…</div>
                );
                if (!ac) return null;
                return (
                  <div className="text-[9px] m-0 text-orange-400/90 uppercase leading-tight border-l-2 border-orange-400/50 pl-1 flex flex-col gap-0.5">
                    {ac.lsgdLabel && <span><span className="font-bold">Body:</span> {ac.lsgdLabel}</span>}
                    {ac.acName && <span><span className="font-bold">AC:</span> {ac.acName}{ac.pcName ? ` · ${ac.pcName} PC` : ""}</span>}
                  </div>
                );
              })()}

              <div className="text-[9px] m-0 text-blue-600/80 dark:text-cyan-500/70 uppercase leading-tight flex overflow-hidden">
                <span className="text-blue-700 dark:text-cyan-500 font-bold inline mr-1 shrink-0">
                  By:
                </span>
                <span className="truncate">
                  {(report.userName || "Unknown User").substring(0, 15)}
                  {(report.userName || "Unknown User").length > 15 ? "..." : ""}
                </span>
              </div>

              {report.notes && (
                <div className="text-[9px] m-0 text-blue-800 dark:text-cyan-400 break-words border-l border-blue-400 dark:border-cyan-500/50 pl-1 leading-tight line-clamp-2">
                  "{report.notes}"
                </div>
              )}

              {report.createdAt && (
                <div className="text-[10px] m-0 text-blue-600/80 dark:text-cyan-500/70 uppercase">
                  <span className="text-blue-700 dark:text-cyan-500 font-bold mr-1">Log:</span>
                  {new Date(
                    report.createdAt.toDate?.() || report.createdAt,
                  ).toLocaleString()}
                </div>
              )}
              <div className="flex justify-between items-center mt-1">
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold border border-blue-400 dark:border-cyan-500/50 text-blue-700 dark:text-cyan-400">
                    {report.status?.toUpperCase() || "REPORTED"}
                  </span>
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold text-black border"
                    style={{
                      backgroundColor: getColor(report.severity),
                      borderColor: getColor(report.severity),
                    }}
                  >
                    {report.severity?.toUpperCase() || "LOW"}
                  </span>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVote(report.id, "up", upvoters, downvoters);
                    }}
                    className={`flex items-center gap-1 p-1 rounded-sm border transition-all text-[10px] font-bold ${hasUpvoted ? "border-blue-600 dark:border-cyan-400 bg-blue-100 dark:bg-cyan-900/50 text-blue-700 dark:text-cyan-400" : "border-blue-200 dark:border-transparent text-blue-500 dark:text-cyan-500/50 hover:bg-blue-100 dark:hover:bg-blue-100/30 dark:bg-cyan-900/30 hover:text-blue-700 dark:hover:text-cyan-400"}`}
                    title="Upvote"
                  >
                    <ThumbsUp
                      className={`w-3 h-3 ${hasUpvoted ? "fill-blue-700 dark:fill-cyan-400" : ""}`}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVote(report.id, "down", upvoters, downvoters);
                    }}
                    className={`flex items-center gap-1 p-1 rounded-sm border transition-all text-[10px] font-bold ${hasDownvoted ? "border-red-500 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-500" : "border-blue-200 dark:border-transparent text-blue-500 dark:text-cyan-500/50 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-500"}`}
                    title="Downvote"
                  >
                    <ThumbsDown
                      className={`w-3 h-3 ${hasDownvoted ? "fill-red-500" : ""}`}
                    />
                  </button>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDetailReportId(report.id);
                }}
                className="w-full mt-1 py-1.5 text-[9px] font-bold uppercase tracking-widest text-blue-700 dark:text-cyan-300 bg-blue-100 dark:bg-cyan-900/40 hover:bg-blue-200 dark:hover:bg-blue-50/60 dark:bg-cyan-800/60 border-t border-blue-300 dark:border-cyan-400/40 hover:border-blue-400 dark:hover:border-blue-400 dark:border-cyan-400 shadow-[0_0_6px_rgba(0,100,255,0.1)] dark:shadow-[0_0_6px_rgba(0,255,255,0.15)] hover:shadow-[0_0_10px_rgba(0,100,255,0.2)] dark:hover:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all"
              >
                View Details ↓
              </button>
            </>
          )}

          {user?.uid === report.userId &&
            (deletingId === report.id ? (
              <div className="mt-2 flex flex-col items-center gap-2 border-t pt-2 border-blue-500/30 dark:border-cyan-500/30">
                <span className="text-[10px] uppercase font-bold text-red-500">
                  Delete Report?
                </span>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={(e) => handleDelete(report.id, e)}
                    className="flex-1 bg-red-500 hover:bg-red-400 text-black px-2 py-1 uppercase text-[10px] font-bold transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(null);
                    }}
                    className="flex-1 bg-blue-100/50 dark:bg-cyan-900/50 hover:bg-blue-50/50 dark:bg-cyan-800/50 text-blue-600 dark:text-cyan-400 border border-blue-500/50 dark:border-cyan-500/50 px-2 py-1 uppercase text-[10px] font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : editingId === report.id ? (
              <div className="mt-2 flex flex-col items-start gap-2 border-t pt-2 border-blue-500/30 dark:border-cyan-500/30">
                <div className="w-full">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-blue-700/70 dark:text-cyan-500/70 border-l-2 border-blue-500 dark:border-cyan-500 pl-2">
                    Reported As
                  </label>
                  <input
                    type="text"
                    value={editReporterName}
                    onChange={(e) =>
                      setEditReporterName(clampReporterName(e.target.value))
                    }
                    placeholder="Anonymous"
                    className="w-full bg-blue-100/20 dark:bg-cyan-900/20 text-blue-600 dark:text-cyan-400 border border-blue-500/50 dark:border-cyan-500/50 p-1 mt-1 text-[10px] outline-none focus:border-blue-400 dark:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all placeholder:text-blue-400/50 dark:placeholder:text-cyan-500/30"
                  />
                </div>
                <div className="w-full">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-blue-700/70 dark:text-cyan-500/70 border-l-2 border-blue-500 dark:border-cyan-500 pl-2">
                    Severity
                  </label>
                  <select
                    value={editSeverity}
                    onChange={(e) =>
                      setEditSeverity(
                        e.target.value as "low" | "medium" | "high",
                      )
                    }
                    className="w-full bg-blue-100/20 dark:bg-cyan-900/20 text-blue-600 dark:text-cyan-400 border border-blue-500/50 dark:border-cyan-500/50 p-1 mt-1 text-[10px] uppercase outline-none focus:border-blue-400 dark:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="w-full">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-blue-700/70 dark:text-cyan-500/70 border-l-2 border-blue-500 dark:border-cyan-500 pl-2">
                    Notes
                  </label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-blue-100/20 dark:bg-cyan-900/20 text-blue-600 dark:text-cyan-400 border border-blue-500/50 dark:border-cyan-500/50 p-1 mt-1 text-[10px] uppercase outline-none min-h-[40px] resize-none focus:border-blue-400 dark:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all"
                    placeholder="Update notes..."
                  />
                </div>
                <div className="w-full">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-blue-700/70 dark:text-cyan-500/70 border-l-2 border-blue-500 dark:border-cyan-500 pl-2">
                    Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={editFileInputRef}
                    onChange={handleEditImageChange}
                  />
                  {editImageUrl ? (
                    <div className="relative mt-1 border border-blue-500/50 dark:border-cyan-500/50 p-1 w-full max-h-20 overflow-hidden flex justify-center bg-white/50 dark:bg-black/50">
                      <img
                        src={editImageUrl}
                        alt="edit preview"
                        className="max-h-16 object-contain"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setEditImageUrl(null);
                        }}
                        className="absolute top-1 right-1 bg-white/80 dark:bg-black/80 p-0.5 border border-blue-500/50 dark:border-cyan-500/50 text-blue-600 dark:text-cyan-400 hover:text-red-500"
                        type="button"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        editFileInputRef.current?.click();
                      }}
                      className="mt-1 w-full border border-blue-500/50 dark:border-cyan-500/50 border-dashed text-blue-700 dark:text-cyan-500 p-1 text-[10px] hover:bg-blue-100/30 dark:bg-cyan-900/30"
                      type="button"
                    >
                      <Camera className="w-3 h-3 mx-auto" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2 w-full mt-1">
                  <button
                    onClick={(e) => handleSaveEdit(report.id, e)}
                    disabled={isSavingEdit}
                    className="flex-1 bg-blue-600 dark:bg-cyan-500 hover:bg-blue-700 dark:hover:bg-cyan-400 text-white dark:text-black px-2 py-1 uppercase text-[10px] font-bold transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(null);
                    }}
                    className="flex-1 bg-blue-100/50 dark:bg-cyan-900/50 hover:bg-blue-50/50 dark:bg-cyan-800/50 text-blue-600 dark:text-cyan-400 border border-blue-500/50 dark:border-cyan-500/50 px-2 py-1 uppercase text-[10px] font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditNotes(report.notes || "");
                    setEditSeverity(report.severity || "low");
                    setEditImageUrl(report.imageUrl || null);
                    setEditReporterName(report.userName || "");
                    setEditingId(report.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 bg-blue-100 dark:bg-cyan-500/10 hover:bg-blue-200 dark:hover:bg-cyan-500/20 text-blue-700 dark:text-cyan-400 border border-blue-400 dark:border-cyan-500/50 px-2 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-colors dark:shadow-[0_0_10px_rgba(0,255,255,0.1)]"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(report.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-2 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-colors shadow-[0_0_10px_rgba(255,0,60,0.1)]"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            ))}
        </div>
      </Popup>
    );
  };

  return (
    <>
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={60}
        iconCreateFunction={(cluster: any) => {
          const markers = cluster.getAllChildMarkers();

          let highCount = 0;
          let mediumCount = 0;
          let lowCount = 0;

          markers.forEach((marker: any) => {
            const sev = marker.options.icon.options.severity || "low";
            if (sev === "high") highCount++;
            else if (sev === "medium") mediumCount++;
            else lowCount++;
          });

          const totalWeight = highCount * 3 + mediumCount * 2 + lowCount * 1;
          const avgWeight = totalWeight / markers.length;

          let light = "#a0ffff", mid = "#00f0ff", dark = "#008fab";
          if (avgWeight >= 2.5) {
            light = "#ff8099"; mid = "#ff003c"; dark = "#8b0020";
          } else if (avgWeight >= 1.5) {
            light = "#ffd080"; mid = "#ff9900"; dark = "#a05c00";
          }

          return L.divIcon({
            html: `
              <div style="
                width:28px;height:28px;border-radius:50%;
                background:radial-gradient(circle at 35% 30%, ${light} 0%, ${mid} 45%, ${dark} 100%);
                box-shadow:0 0 8px ${mid}bb, inset 0 1px 3px rgba(255,255,255,0.3);
                display:flex;align-items:center;justify-content:center;
                font-size:9px;font-weight:bold;color:#001a1f;font-family:monospace;
              ">${markers.length}</div>
            `,
            className: "bg-transparent",
            iconSize: L.point(28, 28, true),
          });
        }}
      >
        {reports.map((report) => {
          if (!report.encodedPath) return null;
          try {
            const path = decode(report.encodedPath).map(
              ([lat, lng]) => [lat, lng] as [number, number],
            );
            if (path.length === 0) return null;
            const displaySeverity =
              editingId === report.id ? editSeverity : report.severity;
            const dot = createDotIcon(
              getColor(displaySeverity),
              displaySeverity || "low",
              detailReportId === report.id,
            );
            return (
              <Marker
                key={`marker-${report.id}`}
                position={path[0]}
                icon={dot || L.Icon.Default.prototype}
                eventHandlers={{
                  click: (e: any) => {
                    if (e.target && e.target._map) {
                      const currentZoom = e.target._map.getZoom();
                      e.target._map.flyTo(path[0], Math.max(currentZoom, 16), { duration: 1 });
                    }
                    fetchConstituency(report);
                  },
                }}
              >
                {renderPopup(report)}
              </Marker>
            );
          } catch (e) {
            return null;
          }
        })}
      </MarkerClusterGroup>

      {showPolylines &&
        reports.map((report) => {
          if (!report.encodedPath) return null;
          try {
            const path = decode(report.encodedPath).map(
              ([lat, lng]) => [lat, lng] as [number, number],
            );
            if (path.length <= 1) return null;
            const displaySeverity =
              editingId === report.id ? editSeverity : report.severity;
            return (
              <Polyline
                key={`line-${report.id}`}
                positions={path}
                pathOptions={{
                  className:
                    displaySeverity === "high"
                      ? "animated-polyline-high"
                      : "animated-polyline",
                  color: getColor(displaySeverity),
                  weight: displaySeverity === "high" ? 6 : 4,
                  opacity: 0.8,
                }}
                eventHandlers={{
                  click: (e: any) => {
                    if (e.target && e.target._map) {
                      const currentZoom = e.target._map.getZoom();
                      if (currentZoom >= 16) {
                        e.target._map.flyTo(L.latLngBounds(path).getCenter(), currentZoom, {
                          duration: 0.8,
                        });
                      } else {
                        e.target._map.flyToBounds(L.latLngBounds(path), {
                          maxZoom: 16,
                          padding: [50, 50],
                          duration: 0.8,
                        });
                      }
                    }
                    fetchConstituency(report);
                    e.target?.openPopup(e.latlng);
                  },
                }}
              >
                {renderPopup(report)}
              </Polyline>
            );
          } catch (e) {
            return null;
          }
        })}

      <AnimatePresence>
        {detailReportId && (() => {
          const liveReport = reports.find((r) => r.id === detailReportId);
          if (!liveReport) return null;
          const ac = liveReport.acName ? liveReport : constituencyMap[liveReport.id];
          return (
            <ReportDetailSheet
              key={detailReportId}
              report={liveReport}
              ac={ac}
              user={user}
              onVote={handleVote}
              onClose={() => setDetailReportId(null)}
              onSelectAuthority={onSelectAuthority}
            />
          );
        })()}
      </AnimatePresence>
    </>
  );
}
