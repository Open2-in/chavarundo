"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Flag,
  ThumbsUp,
  Trash2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { useWasteReports } from "@/store/firebase";
import type { UserStats } from "@/types";
import { getSeverityColor, formatShortDate } from "@/components/utils";

interface ContributionsListProps {
  myReports: any[];
  stats: UserStats;
  onNavigateToReport?: (reportId: string) => void;
  onClose: () => void;
  /** Whether the viewer owns these reports (controls the delete action). */
  canManage?: boolean;
}

export default function ContributionsList({
  myReports,
  stats,
  onNavigateToReport,
  onClose,
  canManage = true,
}: ContributionsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const deleteRecord = useWasteReports((s) => s.deleteRecord);

  const handleDelete = async (id: string) => {
    setDeletingInProgress(true);
    try {
      await deleteRecord(id);
      setDeletingId(null);
    } catch (err) {
      console.error("Failed to delete report:", err);
    } finally {
      setDeletingInProgress(false);
    }
  };

  const handleViewOnMap = (reportId: string) => {
    onNavigateToReport?.(reportId);
    onClose();
  };

  return (
    <>
      {/* Summary bar */}
      <div className="flex items-center justify-around px-4 py-2 border-b border-gray-200/50 dark:border-cyan-500/20 bg-slate-50 dark:bg-cyan-950/30 font-mono">
        <StatItem value={myReports.length} label="Total" color="text-gray-900 dark:text-cyan-400" />
        <div className="w-px h-8 bg-emerald-200/50 dark:bg-cyan-500/20" />
        <StatItem value={stats.highSeverity} label="High" color="text-red-600 dark:text-[#ff003c]" />
        <div className="w-px h-8 bg-emerald-200/50 dark:bg-cyan-500/20" />
        <StatItem value={stats.mediumSeverity} label="Medium" color="text-orange-700 dark:text-[#ff9900]" />
        <div className="w-px h-8 bg-emerald-200/50 dark:bg-cyan-500/20" />
        <StatItem value={stats.lowSeverity} label="Low" color="text-sky-700 dark:text-[#00f0ff]" />
      </div>

      {/* Report list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {myReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-cyan-500/50 font-mono">
            <Flag className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs uppercase tracking-widest">
              No contributions yet
            </span>
            <span className="text-[10px] mt-1 text-gray-500 dark:text-cyan-500/30">
              {canManage
                ? "Your reports will appear here"
                : "This contributor's reports will appear here"}
            </span>
          </div>
        ) : (
          myReports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.25 }}
              className="border border-gray-200/30 dark:border-cyan-500/20 rounded-lg overflow-hidden font-mono bg-white/50 dark:bg-neutral-900/50 hover:border-gray-300/50 dark:hover:border-cyan-500/30 transition-colors"
            >
              {/* Report card */}
              <div className="px-3 py-2.5 flex items-start gap-2.5">
                {/* Severity dot */}
                <div className="shrink-0 mt-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getSeverityColor(report.severity),
                      boxShadow: `0 0 8px ${getSeverityColor(report.severity)}60`,
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-gray-900 dark:text-cyan-300 truncate leading-tight">
                    {report.address || "Unknown Location"}
                  </div>
                  {report.district && (
                    <div className="text-[9px] text-gray-700 dark:text-cyan-500/40 truncate">
                      {report.district}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
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
                    {report.status === "completed" && (
                      <span className="text-[8px] uppercase tracking-wider font-bold px-1 py-px border border-emerald-500/60 bg-emerald-500/10 text-gray-700 flex items-center gap-0.5">
                        <svg className="w-2 h-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                        Fixed
                      </span>
                    )}
                    <span className="text-[9px] text-gray-500 dark:text-cyan-500/40">
                      {formatShortDate(report)}
                    </span>
                    {((report.upvoterIds || []).length > 0 ||
                      (report.downvoterIds || []).length > 0) && (
                      <span className="text-[9px] text-gray-500 dark:text-cyan-500/40 flex items-center gap-0.5">
                        <ThumbsUp className="w-2.5 h-2.5" />
                        {(report.upvoterIds || []).length -
                          (report.downvoterIds || []).length}
                      </span>
                    )}
                  </div>
                  {report.notes && (
                    <div className="text-[9px] text-gray-900/60 dark:text-cyan-500/40 mt-1 line-clamp-1 italic">
                      &ldquo;{report.notes}&rdquo;
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex flex-col gap-1">
                  {onNavigateToReport && (
                    <button
                      onClick={() => handleViewOnMap(report.id)}
                      className="p-1.5 rounded text-gray-500 dark:text-cyan-500/60 hover:text-gray-900 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-cyan-900/40 transition-colors"
                      title="View on map"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() =>
                        setDeletingId(
                          deletingId === report.id ? null : report.id
                        )
                      }
                      className="p-1.5 rounded text-gray-500 dark:text-cyan-500/30 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Delete report"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Delete confirmation */}
              <AnimatePresence>
                {deletingId === report.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-2 bg-red-50/80 dark:bg-red-950/30 border-t border-red-200/50 dark:border-red-500/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Delete this report?
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-900 dark:text-cyan-400 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-cyan-500/30 rounded hover:bg-slate-50 dark:hover:bg-cyan-950/50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(report.id)}
                          disabled={deletingInProgress}
                          className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white bg-red-500 dark:bg-red-600 border border-red-500 dark:border-red-500 rounded hover:bg-red-600 dark:hover:bg-red-500 transition-colors disabled:opacity-50"
                        >
                          {deletingInProgress ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </>
  );
}

function StatItem({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-lg font-bold tabular-nums ${color}`}>
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/50">
        {label}
      </span>
    </div>
  );
}
