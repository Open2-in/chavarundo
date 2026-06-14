"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Flag, ThumbsUp, Crown, Medal } from "lucide-react";

import { Sheet } from "@/components/base";
import { useUI } from "@/store/uiStore";
import { useMapSelection } from "@/store/mapStore";
import { useWasteReports } from "@/store/firebase";

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userPhotoURL?: string;
  reportCount: number;
  totalUpvotes: number;
  totalDownvotes: number;
  netVotes: number;
  /** Combined score = reportCount + netVotes (upvotes − downvotes). */
  score: number;
}

export default function LeaderboardPanel() {
  const { activePanel, setActivePanel } = useUI();
  const isOpen = activePanel === "leaderboard";
  const reports = useWasteReports((s) => s.reports);
  const { setProfileSubject } = useMapSelection();

  const onClose = () => setActivePanel(null);
  const onSelectUser = (u: { uid: string; name: string; photoURL?: string }) => {
    setProfileSubject(u);
    setActivePanel('profile');
  };
  const { leaderboard, totalUpvotes } = useMemo(() => {
    const userMap = new Map<string, LeaderboardEntry>();
    let totalUpvotes = 0;

    for (const report of reports) {
      const uid = report.userId;
      if (!uid) continue;

      const existing = userMap.get(uid);
      const upvotes = (report.upvoterIds || []).length;
      totalUpvotes += upvotes;
      const downvotes = (report.downvoterIds || []).length;

      if (existing) {
        existing.reportCount += 1;
        existing.totalUpvotes += upvotes;
        existing.totalDownvotes += downvotes;
        existing.netVotes += upvotes - downvotes;
        existing.score += 1 + upvotes - downvotes;
        // Backfill a photo from any of the user's reports that has one.
        if (!existing.userPhotoURL && report.userPhotoURL) {
          existing.userPhotoURL = report.userPhotoURL;
        }
      } else {
        userMap.set(uid, {
          userId: uid,
          userName: report.userName || "Anonymous",
          userPhotoURL: report.userPhotoURL || undefined,
          reportCount: 1,
          totalUpvotes: upvotes,
          totalDownvotes: downvotes,
          netVotes: upvotes - downvotes,
          score: 1 + upvotes - downvotes,
        });
      }
    }

    const sortedLeaderboard = Array.from(userMap.values()).sort((a, b) => {
      // Primary: combined score (reports + net votes) desc,
      // tiebreak by report count desc.
      if (b.score !== a.score) return b.score - a.score;
      return b.reportCount - a.reportCount;
    });

    return { leaderboard: sortedLeaderboard, totalUpvotes };
  }, [reports]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-300 drop-shadow-[0_0_6px_rgba(209,213,219,0.5)]" />;
      case 2:
        return <Medal className="w-5 h-5 text-amber-600 drop-shadow-[0_0_6px_rgba(217,119,6,0.5)]" />;
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-[11px] font-bold text-gray-500 dark:text-cyan-500/70 tabular-nums">
            #{index + 1}
          </span>
        );
    }
  };

  const getRankBorder = (index: number) => {
    switch (index) {
      case 0:
        return "border-yellow-400/50 bg-yellow-400/5 dark:bg-yellow-400/10";
      case 1:
        return "border-gray-300/50 bg-gray-300/5 dark:bg-gray-300/10";
      case 2:
        return "border-amber-600/50 bg-amber-600/5 dark:bg-amber-600/10";
      default:
        return "border-gray-200/30 dark:border-cyan-500/20";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Sheet
          onClose={onClose}
          title="Leaderboard"
          icon={<Trophy className="w-5 h-5 text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />}
          footer={
            <p className="text-[9px] uppercase tracking-widest text-gray-500 dark:text-cyan-500/40 text-center py-2.5">
              Ranked by reports + net votes • Updated live
            </p>
          }
        >
          {/* Stats Bar */}
          <div className="flex items-center justify-around px-4 py-2 border-b border-gray-200/50 dark:border-cyan-500/20 bg-slate-50 dark:bg-cyan-950/30">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-gray-900 dark:text-cyan-400 tabular-nums">
                {reports.length}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/50">
                Reports
              </span>
            </div>
            <div className="w-px h-8 bg-emerald-200/50 dark:bg-cyan-500/20" />
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-gray-900 dark:text-cyan-400 tabular-nums">
                {leaderboard.length}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/50">
                Contributors
              </span>
            </div>
            <div className="w-px h-8 bg-emerald-200/50 dark:bg-cyan-500/20" />
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-gray-900 dark:text-cyan-400 tabular-nums">
                {totalUpvotes}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/50">
                Upvotes
              </span>
            </div>
          </div>

          {/* Leaderboard List */}
          <div className="px-3 py-2 space-y-1.5">
            {leaderboard.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-cyan-500/50">
                <Flag className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs uppercase tracking-widest">
                  No reports yet
                </span>
              </div>
            ) : (
              leaderboard.map((entry, index) => (
                <motion.button
                  key={entry.userId}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.3 }}
                  onClick={() =>
                    onSelectUser({
                      uid: entry.userId,
                      name: entry.userName,
                      photoURL: entry.userPhotoURL,
                    })
                  }
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${getRankBorder(index)} hover:scale-[1.01] hover:shadow-md cursor-pointer`}
                >
                  {/* Rank */}
                  <div className="shrink-0">{getRankIcon(index)}</div>

                  {/* Avatar */}
                  {entry.userPhotoURL ? (
                    <img
                      src={entry.userPhotoURL}
                      alt={entry.userName}
                      referrerPolicy="no-referrer"
                      className="shrink-0 w-8 h-8 rounded-full border border-gray-300/60 dark:border-cyan-500/40 object-cover"
                    />
                  ) : (
                    <div className="shrink-0 w-8 h-8 rounded-full border border-gray-300/60 dark:border-cyan-500/40 bg-slate-100 dark:bg-cyan-900/50 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-cyan-400">
                      {getInitials(entry.userName)}
                    </div>
                  )}

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-bold truncate ${index === 0
                          ? "text-amber-800 dark:text-yellow-400"
                          : "text-gray-900 dark:text-cyan-300"
                          }`}
                      >
                        {entry.userName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-gray-700 dark:text-cyan-500/50 flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        {entry.reportCount} report{entry.reportCount !== 1 ? "s" : ""}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wider flex items-center gap-1 ${entry.netVotes >= 0
                          ? "text-green-700 dark:text-green-400/70"
                          : "text-red-600 dark:text-red-400/70"
                          }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        {entry.netVotes >= 0 ? "+" : ""}
                        {entry.netVotes} net
                      </span>
                    </div>
                  </div>

                  {/* Score Badge */}
                  <div className="shrink-0 flex flex-col items-center">
                    <span
                      className={`text-base font-bold tabular-nums ${index === 0
                        ? "text-amber-800 dark:text-yellow-400"
                        : index === 1
                          ? "text-gray-500 dark:text-gray-300"
                          : index === 2
                            ? "text-amber-700 dark:text-amber-500"
                            : "text-gray-900 dark:text-cyan-400"
                        }`}
                    >
                      {entry.score}
                    </span>
                    <span className="text-[8px] uppercase tracking-widest text-gray-500 dark:text-cyan-500/40">
                      pts
                    </span>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </Sheet>
      )}
    </AnimatePresence>
  );
}
