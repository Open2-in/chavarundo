import { Flag, ThumbsUp, TrendingUp } from "lucide-react";
import type { UserStats } from "@/types";

interface StatsGridProps {
  stats: UserStats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="flex flex-col bg-cyan-500/5 dark:bg-cyan-500/10 border-b border-gray-200/50 dark:border-cyan-500/20">
      {/* Row 1: Reports Status */}
      <div className="grid grid-cols-3 gap-px border-b border-gray-200/50 dark:border-cyan-500/20">
        <div className="bg-white/95 dark:bg-neutral-950/95 flex flex-col items-center py-3 font-mono">
          <span className="text-xl font-bold text-gray-900 dark:text-cyan-400 tabular-nums">
            {stats.totalReports}
          </span>
          <span className="text-[8px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/40 flex items-center gap-0.5">
            <Flag className="w-2.5 h-2.5" /> Total
          </span>
        </div>
        <div className="bg-white/95 dark:bg-neutral-950/95 flex flex-col items-center py-3 font-mono">
          <span className="text-xl font-bold text-amber-800 dark:text-yellow-400 tabular-nums">
            {stats.openReports ?? 0}
          </span>
          <span className="text-[8px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/40 flex items-center gap-0.5">
            <Flag className="w-2.5 h-2.5" /> Open
          </span>
        </div>
        <div className="bg-white/95 dark:bg-neutral-950/95 flex flex-col items-center py-3 font-mono">
          <span className="text-xl font-bold text-gray-900 dark:text-gray-500 tabular-nums">
            {stats.completedReports ?? 0}
          </span>
          <span className="text-[8px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/40 flex items-center gap-0.5">
            <svg className="w-2.5 h-2.5 text-gray-700" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg> Fixed
          </span>
        </div>
      </div>
      {/* Row 2: Voting Score */}
      <div className="grid grid-cols-3 gap-px">
        <div className="bg-white/95 dark:bg-neutral-950/95 flex flex-col items-center py-3 font-mono">
          <span className="text-xl font-bold text-green-700 dark:text-green-400 tabular-nums">
            {stats.totalUpvotes}
          </span>
          <span className="text-[8px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/40 flex items-center gap-0.5">
            <ThumbsUp className="w-2.5 h-2.5" /> Upvotes
          </span>
        </div>
        <div className="bg-white/95 dark:bg-neutral-950/95 flex flex-col items-center py-3 font-mono">
          <span className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">
            {stats.totalDownvotes}
          </span>
          <span className="text-[8px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/40 flex items-center gap-0.5">
            <TrendingUp className="w-2.5 h-2.5 rotate-180" /> Downvotes
          </span>
        </div>
        <div className="bg-white/95 dark:bg-neutral-950/95 flex flex-col items-center py-3 font-mono">
          <span
            className={`text-xl font-bold tabular-nums ${
              stats.netVotes >= 0
                ? "text-gray-900 dark:text-cyan-400"
                : "text-red-600"
            }`}
          >
            {stats.netVotes > 0 ? "+" : ""}
            {stats.netVotes}
          </span>
          <span className="text-[8px] uppercase tracking-widest text-gray-700 dark:text-cyan-500/40 flex items-center gap-0.5">
            <TrendingUp className="w-2.5 h-2.5" /> Net Score
          </span>
        </div>
      </div>
    </div>
  );
}
