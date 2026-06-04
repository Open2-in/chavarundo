import { NextRequest, NextResponse } from "next/server";
import { verifyAppCheckToken } from "@/lib/appcheck-verify";
import raw from "@/data/ward_members.json";

// Re-indexed by "secLsgCode|wardNo" (wardNo zero-padded to 3 digits)
let _index: Record<string, any> | null = null;
export const runtime = 'edge';
function getIndex() {
  if (_index) return _index;

  // Raw keys: "districtIdx|lsgiCode|wardNo" — re-index by "lsgiCode|wardNo"
  const idx: Record<string, any> = {};
  for (const [key, val] of Object.entries(raw as Record<string, any>)) {
    const parts = key.split("|");
    if (parts.length < 3) continue;
    idx[`${parts[1]}|${parts[2]}`] = val;
  }
  _index = idx;
  return _index;
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("X-Firebase-AppCheck");
  if (!token || !(await verifyAppCheckToken(token))) {
    return NextResponse.json(null, { status: 401 });
  }

  const secLsgCode = req.nextUrl.searchParams.get("secLsgCode") ?? "";
  const wardNo = req.nextUrl.searchParams.get("wardNo") ?? "";
  const lsgd = req.nextUrl.searchParams.get("lsgd") ?? "";

  if (!wardNo || (!secLsgCode && !lsgd)) return NextResponse.json(null);

  try {
    const index = await getIndex();
    const padded = String(wardNo).padStart(3, "0");

    let member = secLsgCode ? (index[`${secLsgCode}|${padded}`] ?? null) : null;
    if (!member && lsgd) {
      member = index[`LSGD:${lsgd}|${padded}`] ?? null;
    }

    return NextResponse.json(member, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch (e) {
    console.error("Ward member lookup error:", e);
    return NextResponse.json(null, { status: 500 });
  }
}
