"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Flag,
  ChevronRight,
  FileText,
  Phone,
  Mail,
  Shield,
  Landmark,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ExternalLink,
} from "lucide-react";

import { getSeverityColor, formatShortDate } from "@/components/utils";
import { Sheet } from "@/components/base";
import { useUI } from "@/store/uiStore";
import { useMapSelection } from "@/store/mapStore";
import { useWasteReports } from "@/store/firebase";

import { AuthoritySubject } from "@/types";

type PanelView = "profile" | "reports";

export default function AuthorityProfilePanel() {
  const { activePanel, setActivePanel } = useUI();
  const isOpen = activePanel === "authority";
  const { authoritySubject: subject, setPendingDeepLinkId } = useMapSelection();
  const reports = useWasteReports((s) => s.reports);

  const [view, setView] = useState<PanelView>("profile");

  // Reset view when panel closes
  const handleClose = () => {
    setActivePanel(null);
  };

  const onNavigateToReport = (id: string) => {
    setActivePanel(null);
    setPendingDeepLinkId(id);
  };

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setView("profile"), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filter reports matching the authority's jurisdiction
  const matchReports = useMemo(() => {
    if (!subject || subject.idKey == null || subject.idKey === "") return [];
    return reports.filter((r) => {
      if (subject.type === "mla") {
        return r.acNo != null && String(r.acNo) === String(subject.idKey);
      }
      if (subject.type === "mp") {
        return (
          r.pcName != null &&
          String(r.pcName).toLowerCase() === String(subject.idKey).toLowerCase()
        );
      }
      if (subject.type === "ward") {
        const matchesLsg =
          (r.secLsgCode != null && String(r.secLsgCode) === String(subject.idKey)) ||
          (r.lsgCode != null && String(r.lsgCode) === String(subject.idKey)) ||
          (r.lsgd != null && String(r.lsgd) === String(subject.idKey));
        return (
          matchesLsg &&
          r.wardNo != null &&
          String(r.wardNo) === String(subject.subIdKey)
        );
      }
      if (subject.type === "lsgd") {
        return (
          (r.secLsgCode != null && String(r.secLsgCode) === String(subject.idKey)) ||
          (r.lsgCode != null && String(r.lsgCode) === String(subject.idKey)) ||
          (r.lsgd != null && String(r.lsgd) === String(subject.idKey)) ||
          (r.lsgdLabel &&
            String(r.lsgdLabel).toLowerCase() ===
              String(subject.name).toLowerCase()) ||
          (r.lsgd &&
            String(r.lsgd).toLowerCase() ===
              String(subject.name).toLowerCase())
        );
      }
      if (subject.type === "district") {
        return (
          r.district != null &&
          String(r.district).toLowerCase() === String(subject.idKey).toLowerCase()
        );
      }
      return false;
    });
  }, [reports, subject]);

  // Calculate statistics for the jurisdiction
  const stats = useMemo(() => {
    let total = matchReports.length;
    let closed = 0;
    let open = 0;
    let highSeverity = 0;
    let mediumSeverity = 0;
    let lowSeverity = 0;

    for (const r of matchReports) {
      if (r.status === "fixed" || r.status === "completed") {
        closed++;
      } else {
        open++;
      }

      if (r.severity === "high") highSeverity++;
      else if (r.severity === "medium") mediumSeverity++;
      else lowSeverity++;
    }

    return {
      total,
      closed,
      open,
      highSeverity,
      mediumSeverity,
      lowSeverity,
    };
  }, [matchReports]);

  if (!subject) return null;

  // Determine role label and icon
  const roleMap: Record<"mla" | "mp" | "ward" | "lsgd" | "district", string> = {
    mla: "Member of Legislative Assembly (MLA)",
    mp: "Member of Parliament (MP)",
    ward: "Ward Member (Local Body Representative)",
    lsgd: "Local Self Government Body (LSGD)",
    district: "District Administration",
  };
  const roleLabel = roleMap[subject.type as "mla" | "mp" | "ward" | "lsgd" | "district"];

  const iconMap: Record<"mla" | "mp" | "ward" | "lsgd" | "district", React.ComponentType<any>> = {
    mla: Shield,
    mp: Landmark,
    ward: User,
    lsgd: Landmark,
    district: Landmark,
  };
  const IconComponent = iconMap[subject.type as "mla" | "mp" | "ward" | "lsgd" | "district"];

  const handleViewOnMap = (reportId: string) => {
    onNavigateToReport(reportId);
    handleClose();
  };

  const sheetTitle = view === "reports" ? "Jurisdiction Reports" : "Representative";

  return (
    <AnimatePresence>
      {isOpen && (
        <Sheet
          onClose={handleClose}
          title={sheetTitle}
          icon={<IconComponent className="w-5 h-5 text-gray-900 dark:text-cyan-400" />}
          headerRight={
            view === "reports" && (
              <button
                onClick={() => setView("profile")}
                className="px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider text-gray-700 dark:text-cyan-500 hover:bg-slate-100 dark:hover:bg-cyan-900/40 transition-colors"
              >
                ← Stats
              </button>
            )
          }
        >
          {/* ===== PROFILE STATS VIEW ===== */}
          {view === "profile" && (
            <div className="flex-1">
              {/* Representative Card */}
              <div className="px-4 py-5 border-b border-gray-200/50 dark:border-cyan-500/20 bg-gradient-to-b from-cyan-500/5 dark:from-cyan-950/30 to-transparent">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 shrink-0 rounded-full border-2 border-gray-300 dark:border-cyan-500/50 bg-slate-100 dark:bg-cyan-900/50 flex items-center justify-center shadow-[0_0_12px_rgba(0,100,255,0.15)] dark:shadow-[0_0_12px_rgba(0,255,255,0.15)]">
                    <IconComponent className="w-7 h-7 text-gray-700 dark:text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0 font-mono">
                    <div className="text-sm font-bold text-gray-900 dark:text-cyan-300 leading-tight">
                      {subject.name}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-gray-700 dark:text-cyan-500/60 mt-1 font-bold">
                      {roleLabel}
                    </div>
                    {subject.label && (
                      <div className="text-[10px] text-orange-700 dark:text-orange-400/80 mt-0.5">
                        {subject.label}
                      </div>
                    )}
                    {subject.party && (
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 italic">
                        Party: {subject.party}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact buttons */}
                {(subject.phone || subject.email) && (
                  <div className="flex gap-2 mt-4 font-mono">
                    {subject.phone && (
                      <a
                        href={`tel:${subject.phone}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded bg-green-500/10 dark:bg-green-500/20 border border-green-500/30 hover:bg-green-500/20 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-widest transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call Member
                      </a>
                    )}
                    {subject.email && (
                      <a
                        href={`mailto:${subject.email}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 dark:border-cyan-500/30 hover:bg-slate-50 dark:hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-400 text-[10px] font-bold uppercase tracking-widest transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" /> Email
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-px bg-cyan-500/10 dark:bg-cyan-500/10 border-b border-gray-200/50 dark:border-cyan-500/20">
                <div className="bg-white/95 dark:bg-neutral-950/95 flex flex-col items-center py-3 font-mono">
                  <span className="text-xl font-bold text-gray-900 dark:text-cyan-400 tabular-nums">
                    {stats.total}
                  </span>
                  <span className="text-[8px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/40 flex items-center gap-0.5">
                    <Flag className="w-2.5 h-2.5" /> Total
                  </span>
                </div>
                <div className="bg-white/95 dark:bg-neutral-950/95 flex flex-col items-center py-3 font-mono">
                  <span className="text-xl font-bold text-orange-500 dark:text-orange-400 tabular-nums">
                    {stats.open}
                  </span>
                  <span className="text-[8px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/40 flex items-center gap-0.5">
                    <AlertCircle className="w-2.5 h-2.5" /> Open
                  </span>
                </div>
                <div className="bg-white/95 dark:bg-neutral-950/95 flex flex-col items-center py-3 font-mono">
                  <span className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                    {stats.closed}
                  </span>
                  <span className="text-[8px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/40 flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Fixed
                  </span>
                </div>
              </div>

              {/* Severity Breakdown */}
              {stats.total > 0 && (
                <div className="px-4 py-4 border-b border-gray-200/50 dark:border-cyan-500/20">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-gray-700 dark:text-cyan-500/40 mb-2.5 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" /> Severity Breakdown
                  </div>
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-cyan-950/50">
                    {stats.highSeverity > 0 && (
                      <div
                        className="bg-[#ff003c] transition-all"
                        style={{
                          width: `${(stats.highSeverity / stats.total) * 100}%`,
                        }}
                        title={`High: ${stats.highSeverity}`}
                      />
                    )}
                    {stats.mediumSeverity > 0 && (
                      <div
                        className="bg-[#ff9900] transition-all"
                        style={{
                          width: `${(stats.mediumSeverity / stats.total) * 100}%`,
                        }}
                        title={`Medium: ${stats.mediumSeverity}`}
                      />
                    )}
                    {stats.lowSeverity > 0 && (
                      <div
                        className="bg-[#00f0ff] transition-all"
                        style={{
                          width: `${(stats.lowSeverity / stats.total) * 100}%`,
                        }}
                        title={`Low: ${stats.lowSeverity}`}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-2 font-mono">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#ff003c]" />
                      <span className="text-[9px] text-gray-900/70 dark:text-cyan-500/60 font-bold">
                        High {stats.highSeverity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#ff9900]" />
                      <span className="text-[9px] text-gray-900/70 dark:text-cyan-500/60 font-bold">
                        Med {stats.mediumSeverity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
                      <span className="text-[9px] text-gray-900/70 dark:text-cyan-500/60 font-bold">
                        Low {stats.lowSeverity}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Toggle to Reports button */}
              <div className="px-4 py-4">
                <button
                  onClick={() => setView("reports")}
                  className="w-full flex items-center justify-between gap-2 px-3 py-3 text-[11px] font-bold uppercase tracking-widest font-mono text-gray-900 dark:text-cyan-400 bg-slate-50 dark:bg-cyan-950/40 border border-gray-200 dark:border-cyan-500/30 rounded-lg hover:bg-slate-100 dark:hover:bg-cyan-900/40 hover:border-gray-300 dark:hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(0,100,255,0.1)] dark:hover:shadow-[0_0_12px_rgba(0,255,255,0.1)] transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>View Jurisdiction Reports</span>
                    <span className="text-[9px] font-normal normal-case px-1.5 py-0.5 rounded bg-emerald-200/50 dark:bg-cyan-800/40 text-gray-900 dark:text-cyan-400 tabular-nums">
                      {matchReports.length}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 dark:text-cyan-500/50 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Empty state */}
              {stats.total === 0 && (
                <div className="px-4 py-8 flex flex-col items-center text-center font-mono">
                  <Flag className="w-10 h-10 text-cyan-500/30 dark:text-cyan-500/30 mb-3" />
                  <div className="text-xs text-gray-900 dark:text-cyan-400 font-bold uppercase tracking-widest mb-1">
                    No Waste Spots Reported
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-cyan-500/40 max-w-[220px]">
                    No road waste has been reported in this jurisdiction yet. Keep up the good work!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== JURISDICTION REPORTS LIST VIEW ===== */}
          {view === "reports" && (
            <>
              {/* Stats Summary Bar */}
              <div className="flex items-center justify-around px-4 py-2 border-b border-gray-200/50 dark:border-cyan-500/20 bg-slate-50 dark:bg-cyan-950/30 font-mono text-[9px] uppercase tracking-widest shrink-0">
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-gray-900 dark:text-cyan-400">
                    {matchReports.length}
                  </span>
                  <span className="text-neutral-400">Total</span>
                </div>
                <div className="w-px h-8 bg-cyan-500/15 dark:bg-cyan-500/20" />
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-orange-500">
                    {stats.open}
                  </span>
                  <span className="text-neutral-400">Open</span>
                </div>
                <div className="w-px h-8 bg-cyan-500/15 dark:bg-cyan-500/20" />
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-green-500">
                    {stats.closed}
                  </span>
                  <span className="text-neutral-400">Fixed</span>
                </div>
              </div>

              {/* Reports list scroll container */}
              <div className="px-3 py-3 space-y-2 bg-slate-50/50 dark:bg-neutral-900/10">
                {matchReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-cyan-500/50">
                    <Flag className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-xs uppercase tracking-widest">
                      No reports listed
                    </span>
                  </div>
                ) : (
                  matchReports.map((report, index) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.2 }}
                      className="border border-gray-200/30 dark:border-cyan-500/20 rounded-lg overflow-hidden font-mono bg-white/50 dark:bg-neutral-900/50 hover:border-gray-300/50 dark:hover:border-cyan-500/30 transition-colors"
                    >
                      <div className="px-3 py-2.5 flex items-start gap-2.5">
                        {/* Severity indicator dot */}
                        <div className="shrink-0 mt-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: getSeverityColor(report.severity),
                              boxShadow: `0 0 8px ${getSeverityColor(report.severity)}60`,
                            }}
                          />
                        </div>

                        {/* Info details */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-gray-900 dark:text-cyan-300 truncate leading-tight">
                            {report.address || "Unknown Location"}
                          </div>
                          {report.district && (
                            <div className="text-[9px] text-gray-700 dark:text-cyan-500/40 truncate">
                              {report.district}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className="text-[8px] uppercase tracking-wider font-bold px-1 py-px border"
                              style={{
                                color: getSeverityColor(report.severity),
                                borderColor: getSeverityColor(report.severity) + "60",
                                backgroundColor: getSeverityColor(report.severity) + "10",
                              }}
                            >
                              {(report.severity || "low").toUpperCase()}
                            </span>
                            {report.status === "completed" || report.status === "fixed" ? (
                              <span className="text-[8px] uppercase tracking-wider font-bold px-1 py-px border border-emerald-500/60 bg-emerald-500/10 text-gray-700 flex items-center gap-0.5">
                                <svg className="w-2 h-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                                Fixed
                              </span>
                            ) : (
                              <span
                                className="text-[8px] uppercase tracking-wider font-bold px-1 py-px border border-cyan-500/20 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400 bg-cyan-500/5 dark:bg-cyan-500/10"
                              >
                                {(report.status || "reported").toUpperCase()}
                              </span>
                            )}
                            <span className="text-[9px] text-gray-500 dark:text-cyan-500/40">
                              {formatShortDate(report)}
                            </span>
                          </div>
                          {report.notes && (
                            <div className="text-[9px] text-gray-900/60 dark:text-cyan-500/40 mt-1 line-clamp-1 italic">
                              &ldquo;{report.notes}&rdquo;
                            </div>
                          )}
                        </div>

                        {/* Map navigation shortcut */}
                        <div className="shrink-0">
                          <button
                            onClick={() => handleViewOnMap(report.id)}
                            className="p-1.5 rounded text-gray-500 dark:text-cyan-500/60 hover:text-gray-900 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-cyan-900/40 transition-colors"
                            title="View on map"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </>
          )}
        </Sheet>
      )}
    </AnimatePresence>
  );
}
