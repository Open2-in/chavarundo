import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getReport, WasteReport } from "@/lib/firebase-server";
import { decode } from "@googlemaps/polyline-codec";

// Cloudflare Pages requires Edge Runtime for all dynamic routes.
// nodejs_compat flag in wrangler.toml enables Node.js APIs needed by firebase-admin.
export const runtime = "edge";

// ISR: serve from cache; revalidate in background every 24 h.
// Report metadata (address, constituency, severity) is immutable after filing.
// Votes are allowed to be up to 24 h stale on this SEO page.
export const revalidate = 86400;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityLabel(s: WasteReport["severity"]) {
  return { low: "Low", medium: "Medium", high: "High" }[s] ?? s;
}
function severityColor(s: WasteReport["severity"]) {
  return { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" }[s] ?? "#94a3b8";
}
function statusLabel(s: WasteReport["status"]) {
  const map: Record<string, string> = {
    reported: "Reported",
    confirmed: "Confirmed",
    fixed: "Fixed",
    pending: "Pending Review",
    verified: "Verified",
  };
  return map[s as string] ?? s;
}

/** Decode polyline and return the midpoint coordinate */
function midpoint(encodedPath: string): [number, number] | null {
  try {
    const pts = decode(encodedPath, 5);
    if (!pts.length) return null;
    const mid = pts[Math.floor(pts.length / 2)];
    return [mid[0], mid[1]];
  } catch {
    return null;
  }
}

function formatDate(ts: WasteReport["createdAt"]): string {
  if (!ts) return "Unknown date";
  try {
    const d = ts.toDate();
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "Unknown date";
  }
}

function formatDistance(m?: number): string {
  if (!m) return "";
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${m} m`;
}

function buildTitle(r: WasteReport): string {
  const place = r.address || r.district || "Kerala";
  return `Road Waste on ${place} — ${r.acName ?? r.district ?? "Kerala"} | Chavarundo`;
}

function buildDescription(r: WasteReport): string {
  const parts: string[] = [];
  // Lead with notes if present — user-written text is the most unique SEO signal
  if (r.notes) {
    const snippet = r.notes.length > 120 ? r.notes.slice(0, 117).trimEnd() + "…" : r.notes;
    parts.push(snippet);
  }
  parts.push(`${severityLabel(r.severity)} severity road waste reported on ${formatDate(r.createdAt)}.`);
  parts.push(`Status: ${statusLabel(r.status)}.`);
  if (r.wardName) parts.push(`Located in ${r.wardName} ward, ${r.lsgd ?? ""} ${r.lsgdLabel ? `(${r.lsgdLabel})` : ""}.`);
  if (r.distanceM) parts.push(`${formatDistance(r.distanceM)} road segment affected.`);
  if (r.acName) parts.push(`Assembly constituency: ${r.acName}.`);
  // Trim to 300 chars — Google shows ~155 but longer descriptions can still match snippets
  const full = parts.join(" ").replace(/\s{2,}/g, " ").trim();
  return full.length > 300 ? full.slice(0, 297) + "…" : full;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const r = await getReport(id);
  if (!r) return { title: "Report not found | Chavarundo" };

  const title = buildTitle(r);
  const description = buildDescription(r);
  const url = `https://chavarundo.open2.in/report/${id}`;

  return {
    title,
    description,
    keywords: [
      "waste",
      "garbage dump",
      r.district,
      r.acName,
      r.lsgd,
      r.wardName,
      "Kerala road waste",
      "chavaru",
      "waste cleanup",
    ]
      .filter(Boolean)
      .join(", "),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Chavarundo?",
      locale: "en_IN",
      type: "article",
      images: [
        {
          url: `/report/${id}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/report/${id}/opengraph-image`],
      site: "@chavarundo",
    },
  };
}

// ---------------------------------------------------------------------------
// JSON-LD structured data
// ---------------------------------------------------------------------------

function buildJsonLd(r: WasteReport, id: string) {
  const coord = midpoint(r.encodedPath);
  const url = `https://chavarundo.open2.in/report/${id}`;
  const votes = (r.upvoterIds?.length ?? 0) - (r.downvoterIds?.length ?? 0);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: buildTitle(r),
    description: buildDescription(r),
    url,
    datePublished: r.createdAt?.toDate?.().toISOString() ?? undefined,
    author: { "@type": "Person", name: r.userName ?? "Anonymous" },
    publisher: {
      "@type": "Organization",
      name: "Chavarundo",
      url: "https://chavarundo.open2.in",
    },
    about: {
      "@type": "Place",
      name: r.address || r.district || "Kerala",
      ...(coord
        ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: coord[0],
            longitude: coord[1],
          },
        }
        : {}),
      address: {
        "@type": "PostalAddress",
        addressLocality: r.lsgd ?? r.district,
        addressRegion: "Kerala",
        postalCode: r.pincode,
        addressCountry: "IN",
      },
    },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: Math.max(0, votes),
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getReport(id);
  if (!r) notFound();

  const color = severityColor(r.severity);
  const coord = midpoint(r.encodedPath);
  const votes = (r.upvoterIds?.length ?? 0) - (r.downvoterIds?.length ?? 0);
  const osmUrl = coord
    ? `https://www.openstreetmap.org/?mlat=${coord[0]}&mlon=${coord[1]}#map=17/${coord[0]}/${coord[1]}`
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // Script-safe: replace </ with </ so user-controlled strings
          // (address, userName, etc.) can't break out of the JSON-LD script block.
          __html: JSON.stringify(buildJsonLd(r, id)).replace(/</g, "\\u003c"),
        }}
      />

      <div className="min-h-screen bg-slate-50 dark:bg-[#020810] text-slate-900 dark:text-white font-sans">
        {/* Top accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-emerald-500 dark:via-cyan-400 to-transparent" />

        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-white/5">
          <Link
            href="/"
            className="text-cyan-700 dark:text-cyan-400 font-mono text-lg font-bold tracking-tight hover:text-cyan-800 dark:hover:text-cyan-300 transition-colors"
          >
            Chavarundo?
          </Link>
          <Link
            href="/"
            className="text-xs text-cyan-700 dark:text-cyan-400/70 border border-cyan-300 dark:border-cyan-400/20 rounded-full px-4 py-1.5 hover:border-cyan-500 dark:hover:border-cyan-400/50 hover:text-cyan-800 dark:hover:text-cyan-400 transition-all font-mono tracking-widest"
          >
            VIEW MAP
          </Link>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">

          {/* Severity badge + status */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-xs font-mono tracking-widest px-3 py-1 rounded-full border font-bold uppercase"
              style={{
                color,
                borderColor: `${color}40`,
                backgroundColor: `${color}10`,
              }}
            >
              {severityLabel(r.severity)} Severity
            </span>
            <span className="text-xs font-mono tracking-widest px-3 py-1 rounded-full border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50 bg-slate-100 dark:bg-white/5 uppercase">
              {statusLabel(r.status)}
            </span>
            {r.distanceM && (
              <span className="text-xs font-mono text-gray-400 dark:text-white/30 tracking-widest">
                {formatDistance(r.distanceM)} affected
              </span>
            )}
          </div>

          {/* Address / title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-gray-900 dark:text-white flex items-center flex-wrap">
              <span>{r.address || "Road Waste Report"}</span>
              {r.status === "verified" && (
                <span className="inline-flex items-center ml-2 align-middle text-cyan-600 dark:text-cyan-400 shrink-0" title="AI Verified Report">
                  <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </span>
              )}
            </h1>
            {r.district && (
              <p className="text-gray-500 dark:text-white/40 mt-1 text-sm font-mono">{r.district}, Kerala</p>
            )}
          </div>

          {/* Location card — links to OpenStreetMap */}
          {osmUrl && coord && (
            <a
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] px-5 py-4 hover:border-cyan-500/30 dark:hover:border-cyan-400/30 hover:bg-cyan-50/50 dark:hover:bg-cyan-400/5 hover:shadow-sm transition-all group"
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-700 dark:text-white/70 font-mono truncate">{r.address}</div>
                <div className="text-xs text-gray-400 dark:text-white/30 font-mono mt-0.5">
                  {coord[0].toFixed(5)}, {coord[1].toFixed(5)}
                </div>
              </div>
              <div className="text-xs text-cyan-700 dark:text-cyan-400/50 font-mono tracking-widest group-hover:text-cyan-800 dark:group-hover:text-cyan-400 transition-colors flex-shrink-0">
                OSM ↗
              </div>
            </a>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "Reported", value: formatDate(r.createdAt) },
              { label: "Votes", value: votes >= 0 ? `+${votes}` : `${votes}` },
              r.acName ? { label: "Assembly", value: r.acName } : null,
              r.pcName ? { label: "Parliament", value: r.pcName } : null,
              r.lsgd ? { label: r.lsgdLabel ?? "LSGD", value: r.lsgd } : null,
              r.wardName ? { label: "Ward", value: `${r.wardName}${r.wardNo ? ` (#${r.wardNo})` : ""}` } : null,
              r.pincode ? { label: "Pincode", value: r.pincode } : null,
              r.distanceM ? { label: "Length", value: formatDistance(r.distanceM) } : null,
            ]
              .filter(Boolean)
              .map((item) => (
                <div
                  key={item!.label}
                  className="rounded-lg border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.02] px-4 py-3 shadow-sm"
                >
                  <div className="text-[10px] font-mono text-gray-400 dark:text-white/30 tracking-widest uppercase mb-1">
                    {item!.label}
                  </div>
                  <div className="text-sm font-medium text-gray-800 dark:text-white/80 truncate">{item!.value}</div>
                </div>
              ))}
          </div>

          {/* Notes */}
          {r.notes && (
            <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] px-5 py-4 shadow-sm">
              <div className="text-[10px] font-mono text-gray-400 dark:text-white/30 tracking-widest uppercase mb-2">
                Notes
              </div>
              <p className="text-sm text-gray-700 dark:text-white/70 leading-relaxed">{r.notes}</p>
            </div>
          )}

          {/* Photo */}
          {r.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.imageUrl}
                alt={`Photo of road waste on ${r.address}`}
                className="w-full object-cover max-h-80"
              />
            </div>
          )}

          {/* CTA */}
          <div className="pt-2 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/?id=${id}`}
                className="flex-1 text-center rounded-xl border border-cyan-300 dark:border-cyan-400/30 bg-cyan-50/50 dark:bg-cyan-400/5 text-cyan-700 dark:text-cyan-400 font-mono text-sm py-3.5 tracking-widest hover:bg-cyan-100/50 dark:hover:bg-cyan-400/10 hover:border-cyan-400 dark:hover:border-cyan-400/60 transition-all"
              >
                VIEW ON MAP →
              </Link>
              <Link
                href="/"
                className="flex-1 text-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-gray-500 dark:text-white/50 font-mono text-sm py-3.5 tracking-widest hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:text-gray-700 dark:hover:text-white/70 transition-all"
              >
                ALL REPORTS
              </Link>
            </div>
            {r.status !== "completed" && (
              <Link
                href={`/?id=${id}&action=cleanup`}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 font-mono text-sm py-3.5 tracking-widest hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10 hover:border-emerald-500 dark:hover:border-emerald-500/60 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                MARK AS CLEANED
              </Link>
            )}
          </div>

          {/* Reporter */}
          <p className="text-xs text-gray-400 dark:text-white/20 font-mono">
            Reported by {r.userName ?? "Anonymous"} · chavarundo.open2.in
          </p>
        </main>
      </div>
    </>
  );
}
