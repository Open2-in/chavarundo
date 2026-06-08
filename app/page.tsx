import MapLoader from "@/components/MapLoader";
import { getRecentReports } from "@/lib/firebase-server";
import SeoAboutModal from "@/components/map/components/SeoAboutModal";

// ISR: regenerate every 60 seconds so initial map data stays fresh.
// onSnapshot handles real-time updates after hydration anyway.
export const revalidate = 60;

export default async function Home() {
  // Pre-fetch recent reports server-side so the map has data on first paint.
  // onSnapshot in LeafletWasteMap takes over with live updates after hydration.
  const initialReports = await getRecentReports(50);

  return (
    <main>
      {/* Full-screen interactive map — seeded with SSR data */}
      <div className="h-screen w-screen">
        <MapLoader initialReports={initialReports} />
      </div>

      {/* Server-rendered content for SEO — wrapped in a visually hidden modal until toggled */}
      <SeoAboutModal>
        <section id="seo-content" className="bg-white dark:bg-black text-black dark:text-white font-mono px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-700 dark:text-cyan-400 mb-4">
          Chavarundo — Community Public Waste & Garbage Tracker for Kerala
        </h1>
        <p className="text-blue-800/80 dark:text-cyan-300/80 text-sm leading-relaxed mb-8">
          Chavarundo (ചവറുണ്ടോ — "Is there waste?") is a free, community-driven map
          where residents of Kerala can report, track, and vote on public garbage dumps
          in their area. Reports include photo evidence, severity, location address, and the responsible
          authority — from Ward Members to LSGD and NHAI.
        </p>

        <h2 className="text-lg font-bold text-blue-700 dark:text-cyan-400 mb-3">How it works</h2>
        <ol className="text-blue-800/80 dark:text-cyan-300/70 text-sm space-y-2 mb-8 list-decimal list-inside">
          <li><strong>Snap a Photo</strong>: Tap the Report (+) button to take a photo of the waste (with phone GPS turned on).</li>
          <li><strong>Check the Map</strong>: Double-check and adjust the marker pin to pinpoint the exact garbage spot.</li>
          <li><strong>Submit Details</strong>: Choose the severity level (low, medium, high), add optional notes, and submit.</li>
          <li><strong>AI & Proximity Audit</strong>: Our AI verifies the photo and checks that it is placed near a public road.</li>
          <li><strong>Authority Routing</strong>: The app automatically identifies the responsible local body (Ward Member, Panchayat, PWD, or NHAI).</li>
          <li><strong>Community Power</strong>: Upvote reports in your area and share them with neighbors to speed up cleanup.</li>
        </ol>

        <h2 className="text-lg font-bold text-blue-700 dark:text-cyan-400 mb-3">Districts covered</h2>
        <ul className="text-blue-800/80 dark:text-cyan-300/70 text-sm grid grid-cols-2 gap-1 mb-8">
          {[
            "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha",
            "Kottayam", "Idukki", "Ernakulam", "Thrissur",
            "Palakkad", "Malappuram", "Kozhikode", "Wayanad",
            "Kannur", "Kasaragod",
          ].map((d) => (
            <li key={d} className="before:content-['▸'] before:text-blue-500 dark:before:text-cyan-500 before:mr-1">{d}</li>
          ))}
        </ul>

        <h2 className="text-lg font-bold text-blue-700 dark:text-cyan-400 mb-3">Responsible authority classification</h2>
        <ul className="text-blue-800/80 dark:text-cyan-300/70 text-sm space-y-1 mb-8">
          <li><span className="text-yellow-400 font-bold">National Highway / NHAI</span> — Motorway, trunk roads → MP / NHAI</li>
          <li><span className="text-orange-400 font-bold">State PWD</span> — Primary, secondary roads → MLA / State PWD</li>
          <li><span className="text-green-400 font-bold">Panchayat / Municipality / LSGD</span> — Tertiary roads & local waste collection → Local body</li>
          <li><span className="text-blue-600 dark:text-cyan-400 font-bold">Ward Member</span> — Residential and unclassified roads</li>
        </ul>

        <h2 className="text-lg font-bold text-blue-700 dark:text-cyan-400 mb-3">Report public waste in Kerala</h2>
        <p className="text-blue-800/80 dark:text-cyan-300/70 text-sm leading-relaxed">
          Anyone can report public waste on chavarundo.open2.in. Sign in with Google or continue anonymously,
          upload your photo, adjust the location pin on the map, and submit. Your report is instantly visible
          to the community and tagged to the correct government authority responsible for the area. Kerala residents
          can use this data to hold local bodies, PWD, and NHAI accountable for waste cleanup.
        </p>

        <h2 className="text-lg font-bold text-cyan-400 mt-12 mb-6">Frequently Asked Questions</h2>
        <div className="flex flex-col gap-6">

          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-1">Do I need to create an account?</h3>
            <p className="text-cyan-300/60 text-sm leading-relaxed">
              No. You can report anonymously — no account needed.
              If you sign in with Google, you can edit or delete your own reports, and your name is linked to the report.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-1">What happens after I report?</h3>
            <p className="text-cyan-300/60 text-sm leading-relaxed">
              Your report is instantly visible on the map for the whole community. Other users can
              upvote it to signal severity, or dispute it if inaccurate. The report is tagged to the
              responsible authority — Ward Member, Panchayat/LSGD, State PWD, or NHAI/MP — so it
              can be used as evidence when contacting them.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-1">Who cleans the waste?</h3>
            <p className="text-cyan-300/60 text-sm leading-relaxed">
              Responsibility depends on the location type. Residential and unclassified roads fall under
              the Ward Member. Tertiary roads and local waste collection are managed by the Panchayat or LSGD Municipality/Corporation. State and
              primary roads are the responsibility of the State PWD and MLA. National Highways are
              maintained by NHAI. Chavarundo identifies this automatically from OpenStreetMap data.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-cyan-300 mb-1">Is my data private?</h3>
            <p className="text-cyan-300/60 text-sm leading-relaxed">
              For Google sign-in users, only your display name is stored and shown on the report.
              For anonymous reports, only the name you enter (or &ldquo;Anonymous&rdquo;) is stored — no email
              or account details. GPS coordinates come only from the photo you upload; your current
              device location is never requested.
            </p>
          </div>

        </div>
      </section>
      </SeoAboutModal>
    </main>
  );
}
