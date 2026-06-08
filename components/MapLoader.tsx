"use client";

import dynamic from "next/dynamic";
import type { SerializedReport } from "@/lib/firebase-server";

const LeafletWasteMap = dynamic(() => import("./map"), {
  ssr: false,
});

export default function MapLoader({ initialReports }: { initialReports?: SerializedReport[] }) {
  return <LeafletWasteMap initialReports={initialReports} />;
}


