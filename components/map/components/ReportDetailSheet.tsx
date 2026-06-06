import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, animate } from "motion/react";
import { Share2, X, ThumbsUp, ThumbsDown } from "lucide-react";
import { decode } from "@googlemaps/polyline-codec";

import { getWardMember, type WardMember } from "@/lib/ward-member";
import { getMla, getMp } from "@/lib/mla-mp";
import { useWasteReports } from "@/store/firebase";
import { getColor } from "../utils";
import MiniMap from "./MiniMap";

interface ReportDetailSheetProps {
  report: any;
  ac: any;
  user: any;
  onVote: (
    reportId: string,
    type: "up" | "down",
    currentUpvoters: string[],
    currentDownvoters: string[]
  ) => Promise<void>;
  onClose: () => void;
  onSelectAuthority?: (auth: any) => void;
}

export default function ReportDetailSheet({
  report,
  ac: initialAc,
  user,
  onVote,
  onClose,
  onSelectAuthority,
}: ReportDetailSheetProps) {
  const [ac, setAc] = useState(initialAc ?? null);
  const [wardMember, setWardMember] = useState<WardMember | null>(null);
  const wardMemberFetched = useRef(false);
  const constituencyFetched = useRef(false);
  const { editRecord } = useWasteReports();

  useEffect(() => {
    if (wardMemberFetched.current) return;
    const secLsgCode = report.secLsgCode ?? ac?.secLsgCode;
    const wardNo = report.wardNo ?? ac?.wardNo;
    const lsgd = report.lsgd ?? ac?.lsgd;
    if (wardNo == null || (!secLsgCode && !lsgd)) return;
    wardMemberFetched.current = true;
    getWardMember(secLsgCode, wardNo, lsgd)
      .then(data => { if (data?.memberName) setWardMember(data); })
      .catch(() => { });
  }, [ac, report.secLsgCode, report.wardNo, report.lsgd]);

  useEffect(() => {
    const missingConstituency = report.acNo == null || report.pcName == null;
    const missingWard = report.wardNo == null || report.secLsgCode == null;
    if (!missingConstituency && !missingWard && ac) return;
    if (!report.encodedPath) return;
    if (constituencyFetched.current) return;
    constituencyFetched.current = true;
    (async () => {
      try {
        const { decode } = await import("@googlemaps/polyline-codec");
        const path = decode(report.encodedPath);
        if (!path.length) return;

        // Try midpoint → origin → end until we find a result with wardNo
        const candidates: [number, number][] = [
          path[Math.floor(path.length / 2)],
          path[0],
          path[path.length - 1],
        ];

        let best: any = null;
        for (const [lat, lng] of candidates) {
          const { getConstituency } = await import("@/lib/constituency");
          const result = await getConstituency(lat, lng);
          if (!result) continue;
          if (!best) best = result;
          if (result.wardNo != null) { best = result; break; }
        }

        if (!best) return;
        setAc(best);
        const updates: Record<string, any> = {};
        if (missingConstituency) {
          updates.acNo = best.acNo;
          updates.acName = best.acName;
          updates.pcName = best.pcName;
          if (best.lsgd) updates.lsgd = best.lsgd;
          if (best.lsgdType) updates.lsgdType = best.lsgdType;
          if (best.lsgdLabel) updates.lsgdLabel = best.lsgdLabel;
        }
        if (missingWard) {
          if (best.wardNo != null) updates.wardNo = best.wardNo;
          if (best.wardName) updates.wardName = best.wardName;
          if (best.secLsgCode) updates.secLsgCode = best.secLsgCode;
        }
        if (Object.keys(updates).length) {
          editRecord(report.id, updates).catch(() => { });
        }
      } catch { }
    })();
  }, [report.encodedPath, report.id, ac, editRecord]);

  const upvoters = report.upvoterIds || [];
  const downvoters = report.downvoterIds || [];
  const hasUpvoted = user && upvoters.includes(user.uid);
  const hasDownvoted = user && downvoters.includes(user.uid);
  const color = getColor(report.severity);

  const shareUrl = `https://chavarundo.open2.in?id=${report.id}`;
  const reporterLine = report.userName && report.notes
    ? `${report.userName} says: "${report.notes}"`
    : report.userName
      ? `Reported by ${report.userName}`
      : report.notes
        ? `"${report.notes}"`
        : null;
  const shareText = [
    `🚧 Road waste reported in ${report.address || "Unknown Location"}`,
    `Severity: ${(report.severity || "low").toUpperCase()} | Score: ${upvoters.length - downvoters.length > 0 ? "+" : ""}${upvoters.length - downvoters.length}`,
    reporterLine,
    `Reported on Chavarundo?`,
  ].filter(Boolean).join("\n");

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Chavarundo — Road Waste Report", text: shareText, url: shareUrl });
        return;
      } catch { }
    }
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).catch(() => { });
  };

  const dragY = useMotionValue(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Non-passive touch handler: scrolls content normally, but when at top and
  // pulling down, hands off to sheet-dismiss animation instead.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let startY = 0;
    let active = false;

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      active = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - startY;
      if (!active) {
        if (el.scrollTop <= 0 && dy > 8) active = true;
        else return;
      }
      e.preventDefault(); // block scroll — we're dismissing the sheet
      dragY.set(Math.max(0, dy));
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 100) {
        onClose();
      } else {
        animate(dragY, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragY, onClose]);

  // Handle-bar drag (pointer-based, works on desktop too)
  function startHandleDrag(e: React.PointerEvent) {
    e.stopPropagation();
    const startY = e.clientY;
    const startVal = dragY.get();

    const onMove = (ev: PointerEvent) => {
      dragY.set(Math.max(0, startVal + ev.clientY - startY));
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const dy = ev.clientY - startY;
      if (dy > 100) onClose();
      else animate(dragY, 0, { type: "spring", stiffness: 300, damping: 30 });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[2500] bg-white/50 dark:bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        onPointerDown={(e) => e.nativeEvent.stopPropagation()}
        onTouchStart={(e) => e.nativeEvent.stopPropagation()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-[600px] z-[2501] bg-white/95 dark:bg-black/95 border-t border-blue-500/40 dark:border-cyan-500/40 rounded-t-2xl font-mono max-h-[85vh] flex flex-col shadow-[0_-8px_40px_rgba(0,255,255,0.1)]"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.nativeEvent.stopPropagation()}
        onTouchStart={(e) => e.nativeEvent.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ y: dragY }}
      >
        {/* Handle — drag to dismiss */}
        <div
          className="flex justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing"
          onPointerDown={startHandleDrag}
        >
          <div className="w-12 h-1.5 rounded-full bg-blue-50/40 dark:bg-cyan-500/40" />
        </div>
        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="overflow-y-auto flex-1"
        >

          {/* Header */}
          <div className="flex items-start justify-between px-4 pt-2 pb-3 border-b border-blue-500/20 dark:border-cyan-500/20">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-blue-700/60 dark:text-cyan-500/60 mb-1">Waste Report</div>
              <div className="text-sm font-bold text-blue-600 dark:text-cyan-400 flex items-center flex-wrap gap-1">
                <span>{report.address || "Unknown Location"}</span>
                {report.status === "verified" && (
                  <span className="inline-flex items-center text-cyan-400 shrink-0" title="AI Verified Report">
                    <svg className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </span>
                )}
              </div>
              {ac && (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {ac.lsgdLabel && (
                    <div
                      onClick={() => {
                        if (onSelectAuthority) {
                          onSelectAuthority({
                            type: "lsgd",
                            name: ac.lsgdLabel || "Local Body",
                            idKey: report.secLsgCode || ac?.secLsgCode || report.lsgCode || ac?.lsgCode || report.lsgd || ac?.lsgd,
                            label: "Local Self Government"
                          });
                        }
                      }}
                      className="text-[10px] text-orange-400/80 cursor-pointer hover:underline hover:text-orange-300 transition-colors"
                    >
                      {ac.lsgdLabel}
                    </div>
                  )}
                  {ac.acName && (
                    <div
                      onClick={() => {
                        if (onSelectAuthority) {
                          const acNo = report.acNo ?? ac?.acNo;
                          const mla = getMla(acNo);
                          onSelectAuthority({
                            type: "mla",
                            name: mla?.name ?? `MLA for ${ac.acName}`,
                            party: mla?.party,
                            phone: mla?.phone,
                            email: mla?.email,
                            idKey: acNo,
                            label: `${ac.acName} Constituency`
                          });
                        }
                      }}
                      className="text-[10px] text-orange-400/60 cursor-pointer hover:underline hover:text-orange-300 transition-colors"
                    >
                      {ac.acName} AC{ac.pcName ? ` · ${ac.pcName} PC` : ""}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 ml-3 mt-1 shrink-0">
              <button onClick={handleShare} className="text-blue-700/50 dark:text-cyan-500/50 hover:text-blue-600 dark:text-cyan-400">
                <Share2 className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="text-blue-700/50 dark:text-cyan-500/50 hover:text-blue-600 dark:text-cyan-400">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 flex flex-col gap-3">
            {/* Mini map */}
            {report.encodedPath && (
              <MiniMap reportId={report.id} encodedPath={report.encodedPath} severity={report.severity || "low"} roadAuthority={report.roadAuthority} highwayTag={report.highwayTag} />
            )}

            {/* Severity + Status + Score */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 text-[9px] uppercase font-bold text-black" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}>
                {report.severity?.toUpperCase() || "LOW"}
              </span>
              <span className="px-2 py-0.5 text-[9px] uppercase font-bold border border-blue-500/50 dark:border-cyan-500/50 text-blue-600 dark:text-cyan-400">
                {report.status?.toUpperCase() || "REPORTED"}
              </span>
              <span className="text-[9px] text-blue-700/60 dark:text-cyan-500/60 ml-auto">
                Score: <span className={upvoters.length - downvoters.length < 0 ? "text-red-400" : "text-blue-600 dark:text-cyan-400"}>
                  {upvoters.length - downvoters.length > 0 ? "+" : ""}{upvoters.length - downvoters.length}
                </span>
              </span>
            </div>

            {/* Image */}
            {report.imageUrl && (
              <div className="w-full rounded border border-blue-500/30 dark:border-cyan-500/30 overflow-hidden">
                <img src={report.imageUrl} alt="Road Waste" className="w-full object-cover max-h-48" />
              </div>
            )}

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
              <div>
                <div className="text-blue-700/50 dark:text-cyan-500/50 uppercase tracking-widest mb-0.5">Reported By</div>
                <div className="text-blue-500 dark:text-cyan-300 font-bold">{report.userName || "Anonymous"}</div>
              </div>
              <div>
                <div className="text-blue-700/50 dark:text-cyan-500/50 uppercase tracking-widest mb-0.5">Date</div>
                <div className="text-blue-500 dark:text-cyan-300 font-bold">
                  {report.createdAt
                    ? new Date(report.createdAt.toDate?.() || report.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"}
                </div>
              </div>
              {report.district && (
                <div
                  onClick={() => {
                    if (onSelectAuthority) {
                      onSelectAuthority({
                        type: "district",
                        name: report.district,
                        idKey: report.district,
                        label: "District Administration"
                      });
                    }
                  }}
                  className="cursor-pointer group"
                >
                  <div className="text-blue-700/50 dark:text-cyan-500/50 uppercase tracking-widest mb-0.5">District</div>
                  <div className="text-blue-500 dark:text-cyan-300 font-bold group-hover:underline group-hover:text-blue-600 dark:group-hover:text-cyan-400">{report.district}</div>
                </div>
              )}
              {(report.wardNo != null || ac?.wardNo != null) && (
                <div
                  onClick={() => {
                    if (onSelectAuthority) {
                      const wNo = report.wardNo ?? ac?.wardNo;
                      const wName = report.wardName ?? ac?.wardName;
                      onSelectAuthority({
                        type: "ward",
                        name: `${wName || "Ward"} (#${wNo})`,
                        idKey: report.secLsgCode || ac?.secLsgCode || report.lsgCode || ac?.lsgCode || report.lsgd || ac?.lsgd,
                        subIdKey: wNo,
                        label: `${ac?.lsgdLabel || report.lsgdLabel || "Local Body"}`
                      });
                    }
                  }}
                  className="cursor-pointer group"
                >
                  <div className="text-blue-700/50 dark:text-cyan-500/50 uppercase tracking-widest mb-0.5">Ward</div>
                  <div className="text-blue-500 dark:text-cyan-300 font-bold group-hover:underline group-hover:text-blue-600 dark:group-hover:text-cyan-400">
                    {report.wardName ?? ac?.wardName} (#{report.wardNo ?? ac?.wardNo})
                  </div>
                </div>
              )}
              {(() => {
                const acNo = report.acNo ?? ac?.acNo;
                const pcName = report.pcName ?? ac?.pcName;
                const mla = getMla(acNo);
                const mp = getMp(pcName);
                const PhoneIcon = () => (
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C9.61 21 3 14.39 3 6a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
                  </svg>
                );
                const MailIcon = () => (
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                );
                const ContactCell = ({ label, name, party, phone, email, onClick }: { label: string; name: string; party?: string | null; phone?: string | null; email?: string | null; onClick?: () => void }) => (
                  <div
                    onClick={onClick}
                    className={onClick ? "group cursor-pointer" : ""}
                  >
                    <div className="text-blue-700/50 dark:text-cyan-500/50 uppercase tracking-widest mb-0.5">{label}</div>
                    <div
                      className={`text-blue-500 dark:text-cyan-300 font-bold leading-tight ${onClick ? "group-hover:underline group-hover:text-blue-600 dark:group-hover:text-cyan-400" : ""}`}
                    >
                      {name}
                    </div>
                    {party && <div className="text-blue-600/60 dark:text-cyan-400/60 text-[9px] mt-0.5 leading-tight">{party}</div>}
                    {(phone || email) && (
                      <div className="flex gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
                        {phone && (
                          <a href={`tel:${phone}`} aria-label={`Call ${name}`}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[9px] font-bold uppercase tracking-widest hover:bg-green-500/20 transition-colors">
                            <PhoneIcon /> Call
                          </a>
                        )}
                        {email && (
                          <a href={`mailto:${email}`} aria-label={`Email ${name}`}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50/10 dark:bg-cyan-500/10 border border-blue-500/30 dark:border-cyan-500/30 text-blue-600 dark:text-cyan-400 text-[9px] font-bold uppercase tracking-widest hover:bg-blue-50/20 dark:bg-cyan-500/20 transition-colors">
                            <MailIcon /> Mail
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
                return (
                  <>
                    {wardMember && (
                      <ContactCell
                        label={`Ward Member`}
                        name={wardMember.memberName ?? ""}
                        party={wardMember.party}
                        phone={wardMember.phone}
                        onClick={() => {
                          if (onSelectAuthority) {
                            onSelectAuthority({
                              type: "ward",
                              name: wardMember.memberName ?? "Ward Member",
                              party: wardMember.party,
                              phone: wardMember.phone,
                              idKey: wardMember.lsgiCode || report.secLsgCode || ac?.secLsgCode,
                              subIdKey: report.wardNo ?? ac?.wardNo,
                              label: `${wardMember.lsgiName || ac?.lsgdLabel || "Local Body"} - Ward ${report.wardNo ?? ac?.wardNo}`
                            });
                          }
                        }}
                      />
                    )}
                    {mla && (
                      <ContactCell
                        label={`MLA`}
                        name={mla.name}
                        phone={mla.phone}
                        email={mla.email}
                        onClick={() => {
                          if (onSelectAuthority) {
                            onSelectAuthority({
                              type: "mla",
                              name: mla.name,
                              party: mla.party,
                              phone: mla.phone,
                              email: mla.email,
                              idKey: acNo,
                              label: `${ac?.acName || "Unknown"} Constituency`
                            });
                          }
                        }}
                      />
                    )}
                    {mp && (
                      <ContactCell
                        label={`MP`}
                        name={mp.name}
                        phone={mp.phone}
                        email={mp.email}
                        onClick={() => {
                          if (onSelectAuthority) {
                            onSelectAuthority({
                              type: "mp",
                              name: mp.name,
                              party: mp.party,
                              phone: mp.phone,
                              email: mp.email,
                              idKey: pcName,
                              label: `${pcName || "Unknown"} Parliamentary Constituency`
                            });
                          }
                        }}
                      />
                    )}
                  </>
                );
              })()}
            </div>

            {/* Notes */}
            {report.notes && (
              <div className="border-l-2 border-blue-500/40 dark:border-cyan-500/40 pl-3 text-[11px] text-blue-600/80 dark:text-cyan-400/80 italic leading-relaxed">
                "{report.notes}"
              </div>
            )}

            {/* Vote nudge */}
            <div className="rounded border border-blue-500/20 dark:border-cyan-500/20 bg-blue-150/40 dark:bg-cyan-950/40 px-3 py-2 text-[10px] leading-relaxed text-blue-600/80 dark:text-cyan-400/80">
              <span className="font-bold text-blue-600 dark:text-cyan-400">Confirm</span> if you&apos;ve seen this road waste —
              more confirmations make the report credible and increase the chance of{" "}
              <span className="font-bold text-blue-500 dark:text-cyan-300">government action</span>.{" "}
              <span className="font-bold text-red-400">Dispute</span> only if this spot is clean or the report is inaccurate.{" "}
              <button
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="font-bold text-blue-500 dark:text-cyan-300 underline underline-offset-2 hover:text-blue-400 dark:text-cyan-200 transition-colors"
              >
                Share
              </button>{" "}
              with neighbours &amp; friends to get more votes.
            </div>

            {/* Vote buttons */}
            <div className="flex gap-2 pt-1 border-t border-blue-500/20 dark:border-cyan-500/20">
              <button
                onClick={(e) => { e.stopPropagation(); onVote(report.id, "up", upvoters, downvoters); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase border transition-all ${hasUpvoted ? "border-blue-400 dark:border-cyan-400 bg-blue-100/50 dark:bg-cyan-900/50 text-blue-600 dark:text-cyan-400" : "border-blue-500/30 dark:border-cyan-500/30 text-blue-700/50 dark:text-cyan-500/50 hover:bg-blue-100/30 dark:bg-cyan-900/30 hover:text-blue-600 dark:text-cyan-400"}`}
              >
                <ThumbsUp className={`w-3 h-3 ${hasUpvoted ? "fill-cyan-400" : ""}`} />
                Confirm ({upvoters.length})
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onVote(report.id, "down", upvoters, downvoters); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase border transition-all ${hasDownvoted ? "border-red-500 bg-red-900/50 text-red-500" : "border-blue-500/30 dark:border-cyan-500/30 text-blue-700/50 dark:text-cyan-500/50 hover:bg-red-900/30 hover:text-red-500"}`}
              >
                <ThumbsDown className={`w-3 h-3 ${hasDownvoted ? "fill-red-500" : ""}`} />
                Dispute ({downvoters.length})
              </button>
            </div>
          </div>

          <div style={{ height: "max(0.75rem, var(--sab))" }} />
        </div>{/* end scrollable content */}
      </motion.div>
    </>
  );
}
