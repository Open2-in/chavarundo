"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { User, FileText, LogOut, Flag, ChevronRight } from "lucide-react";

import type { ProfilePanelProps, PanelView } from "./types";
import { computeUserStats } from "./types";
import UserCard from "./UserCard";
import StatsGrid from "./StatsGrid";
import SeverityBreakdown from "./SeverityBreakdown";
import ActivityDetails from "./ActivityDetails";
import ContributionsList from "./ContributionsList";

import Sheet from "@/components/base/Sheet";
import Button from "@/components/base/Button";

export default function ProfilePanel({
  isOpen,
  onClose,
  user,
  reports = [],
  onLogout,
  onNavigateToReport,
  subject,
}: ProfilePanelProps) {
  const [view, setView] = useState<PanelView>("profile");

  // Whose profile is shown: an explicit subject, else the logged-in user.
  const subjectUid = subject?.uid ?? user?.uid ?? "";
  const isOwnProfile = !subject || subject.uid === user?.uid;

  const myReports = useMemo(
    () => reports.filter((r) => r.userId === subjectUid),
    [reports, subjectUid]
  );

  const stats = useMemo(
    () => computeUserStats(myReports, reports, subjectUid),
    [reports, myReports, subjectUid]
  );

  // Display identity for the header / UserCard.
  const displayName = isOwnProfile
    ? user?.displayName || "Anonymous User"
    : subject?.name || "Anonymous User";
  const displayPhoto = isOwnProfile ? user?.photoURL : subject?.photoURL;
  const subtitle = isOwnProfile
    ? user?.email || (user?.isAnonymous ? "Anonymous account" : "No email")
    : undefined;

  // Reset view when panel closes
  const handleClose = () => {
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setView("profile"), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const sheetTitle = view === "contributions"
    ? isOwnProfile
      ? "My Contributions"
      : "Contributions"
    : isOwnProfile
      ? "Profile"
      : displayName;

  const sheetIcon = view === "profile" ? (
    <User className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
  ) : (
    <FileText className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
  );

  const headerRight = view === "contributions" && (
    <button
      onClick={() => setView("profile")}
      className="px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider text-blue-500 dark:text-cyan-500 hover:bg-blue-100 dark:hover:bg-cyan-900/40 transition-colors"
    >
      ← Back
    </button>
  );

  const footer = isOwnProfile && view === "profile" && (
    <div className="px-4 py-3">
      <Button
        onClick={() => {
          onLogout();
          handleClose();
        }}
        variant="ghost"
        className="w-full flex items-center justify-center gap-2 py-2.5 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-500/50"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <Sheet
          onClose={handleClose}
          title={sheetTitle}
          icon={sheetIcon}
          headerRight={headerRight}
          footer={footer}
        >
          {/* ===== PROFILE VIEW ===== */}
          {view === "profile" && (
            <div className="flex-1">
              <UserCard
                name={displayName}
                photoURL={displayPhoto}
                subtitle={subtitle}
                stats={stats}
              />
              <StatsGrid stats={stats} />
              <SeverityBreakdown stats={stats} />
              <ActivityDetails stats={stats} />

              {/* Contributions button */}
              <div className="px-4 py-3 border-t border-blue-200/50 dark:border-cyan-500/20">
                <button
                  onClick={() => setView("contributions")}
                  className="w-full flex items-center justify-between gap-2 px-3 py-3 text-[11px] font-bold uppercase tracking-widest font-mono text-blue-700 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-950/40 border border-blue-200 dark:border-cyan-500/30 rounded-lg hover:bg-blue-100 dark:hover:bg-cyan-900/40 hover:border-blue-300 dark:hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(0,100,255,0.1)] dark:hover:shadow-[0_0_12px_rgba(0,255,255,0.1)] transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{isOwnProfile ? "My Contributions" : "Contributions"}</span>
                    <span className="text-[9px] font-normal normal-case px-1.5 py-0.5 rounded bg-blue-200/50 dark:bg-cyan-800/40 text-blue-600 dark:text-cyan-400 tabular-nums">
                      {myReports.length}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-400 dark:text-cyan-500/50 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Empty state */}
              {stats.totalReports === 0 && (
                <div className="px-4 py-8 flex flex-col items-center text-center font-mono">
                  <Flag className="w-10 h-10 text-blue-300 dark:text-cyan-500/30 mb-3" />
                  <div className="text-xs text-blue-600 dark:text-cyan-400 font-bold uppercase tracking-widest mb-1">
                    No reports yet
                  </div>
                  <div className="text-[10px] text-blue-400/70 dark:text-cyan-500/40 max-w-[220px]">
                    {isOwnProfile
                      ? "Start reporting road waste on the map to see your stats here!"
                      : "This contributor hasn't reported any road waste yet."}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== CONTRIBUTIONS VIEW ===== */}
          {view === "contributions" && (
            <ContributionsList
              myReports={myReports}
              stats={stats}
              onNavigateToReport={onNavigateToReport}
              onClose={handleClose}
              canManage={isOwnProfile}
            />
          )}
        </Sheet>
      )}
    </AnimatePresence>
  );
}
