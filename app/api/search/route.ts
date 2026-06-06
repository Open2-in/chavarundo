import { NextRequest, NextResponse } from "next/server";
import { verifyAppCheckToken } from "@/lib/appcheck-verify";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const appCheckToken = req.headers.get("X-Firebase-AppCheck");
  if (!(await verifyAppCheckToken(appCheckToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json([]);

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=10&countrycodes=in&addressdetails=1`,
    {
      headers: {
        "User-Agent": "Chavarundo/1.0 (https://chavarundo.open2.in; mailto:ananthanarayanank@gmail.com)",
      },
    },
  );

  if (!res.ok) return NextResponse.json([]);

  const data = await res.json();
  const items = Array.isArray(data) ? data : [];

  const results = items.map((item: any) => {
    const displayName = item.display_name || "";
    const parts = displayName.split(",");
    const name = parts[0]?.trim() || "";
    const subtitle = parts.slice(1).join(",").trim();

    return {
      display_name: displayName,
      name: name,
      subtitle: subtitle,
      lat: String(item.lat ?? ""),
      lon: String(item.lon ?? ""),
      address: item.address,
    };
  });

  return NextResponse.json(results);
}

