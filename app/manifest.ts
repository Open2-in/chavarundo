import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chavarundo? | Community Public Waste & Garbage Tracker for Kerala",
    short_name: "Chavarundo",
    description: "Community-driven public waste and garbage tracking map. Report and track public waste (chavaru) in Kerala.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#00f0ff",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    categories: ["navigation", "utilities", "travel"],
    lang: "en-IN",
  };
}
