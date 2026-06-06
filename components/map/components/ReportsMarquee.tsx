import { getColor } from "../utils";

interface ReportsMarqueeProps {
  reports: any[];
  onSelect: (id: string) => void;
}

export default function ReportsMarquee({ reports, onSelect }: ReportsMarqueeProps) {
  if (!reports || reports.length === 0) return null;
  const latestReports = reports.slice(0, 5);

  const MarqueeItem = ({ report, index }: { report: any; index: number }) => (
    <button
      onClick={() => onSelect(report.id)}
      className="flex items-center shrink-0 whitespace-nowrap gap-2 mx-8 text-blue-700 dark:text-cyan-400 text-[10px] uppercase tracking-widest cursor-pointer hover:opacity-70 transition-opacity"
    >
      <span className="font-bold text-blue-400 dark:text-cyan-600 tabular-nums">#{index + 1}</span>
      <span
        className="w-2 h-2 rounded-full"
        style={{
          backgroundColor: getColor(report.severity),
          boxShadow: `0 0 5px ${getColor(report.severity)}`,
        }}
      ></span>
      <span className="font-bold truncate max-w-[200px]">
        {report.address || "Unknown Location"}
      </span>
      <span className="text-blue-500/70 dark:text-cyan-500/50">
        (
        {new Date(
          report.createdAt?.toDate?.() || report.createdAt || Date.now(),
        ).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
        )
      </span>
    </button>
  );

  return (
    <div className="absolute bottom-0 left-0 w-full bg-white/90 dark:bg-black/90 border-t border-blue-500/30 dark:border-cyan-500/50 pt-2.5 z-[2000] overflow-hidden font-mono flex" style={{ paddingBottom: "max(0.625rem, var(--sab))" }}>
      <div className="flex animate-marquee shrink-0 items-center justify-around min-w-full">
        {latestReports.map((report, i) => (
          <MarqueeItem key={`mq1-${report.id}`} report={report} index={i} />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="flex animate-marquee shrink-0 items-center justify-around min-w-full"
      >
        {latestReports.map((report, i) => (
          <MarqueeItem key={`mq2-${report.id}`} report={report} index={i} />
        ))}
      </div>
    </div>
  );
}
