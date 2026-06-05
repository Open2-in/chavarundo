<div align="center">
  <img src="public/favicon.svg" alt="Chavarundo Logo" width="100" />
  <h1>Chavarundo?</h1>
  <p><strong>Community-driven Road Waste & Garbage Tracking Platform</strong></p>
  <p>
    <a href="https://chavarundo.open2.in" target="_blank"><strong>🌐 chavarundo.open2.in</strong></a>
  </p>
  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#contributing">Contributing</a> •
    <a href="https://github.com/open2-in/chavarundo/issues/new" target="_blank">🐛 Report a Bug</a> •
    <a href="#license">License</a>
  </p>
</div>

---

**Chavarundo?** is an open-source, community-driven platform designed to crowdsource the mapping of road waste and public garbage dumps in Kerala. By empowering users to report, vote on, and avoid or target polluted areas for cleanup, the project aims to promote cleanliness and hold authorities accountable.

*The name "Chavarundo" translates roughly to "Is there waste?" in Malayalam.*

## 🚀 Features

- 🗺️ **Interactive Dark Map:** A sleek, fully featured interactive map for browsing and hunting for waste spots seamlessly.
- ✍️ **Route Drawing Engine:** Automatically maps out the most accurate waste segment using OSRM routing. No more guessing exactly where the garbage starts and ends.
- 🚦 **Severity Indicators:** Color-coded paths and neon markers denote the severity of the waste spot (Low, Medium, High).
- 👍 **Voting System:** Community members can upvote or downvote reported spots to ensure report accuracy and prioritize cleanup efforts.
- 📸 **Image Uploading:** Users can attach visual evidence of waste (compressed to 800×800 JPEG client-side before saving).
- 🔐 **Authentication:** Secure Google Sign-In using Firebase Authentication.
- ⚡ **Realtime Updates:** Reports and votes sync instantly to all connected users without a page reload using Firestore real-time listeners.
- 🛡️ **App Check:** reCAPTCHA v3-backed Firebase App Check protects all API routes and Firestore writes from abuse.
- 🔍 **Location Search:** OpenStreetMap Nominatim-powered address search to quickly navigate the map.

## 🛠️ Tech Stack

**Frontend**
- [Next.js 15 (App Router)](https://nextjs.org/)
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Leaflet](https://leafletjs.com/) & [react-leaflet](https://react-leaflet.js.org/) for interactive maps
- [react-leaflet-cluster](https://github.com/akursat/react-leaflet-cluster) for marker clustering
- [Framer Motion](https://www.framer.com/motion/) for animations
- [Lucide React](https://lucide.dev/) for iconography

**Backend & Data**
- [Firebase Firestore](https://firebase.google.com/docs/firestore) (Database — images stored as base64)
- [Firebase Auth](https://firebase.google.com/docs/auth) (Google Provider Auth)
- [Firebase App Check](https://firebase.google.com/docs/app-check) (reCAPTCHA v3 — protects API routes and Firestore from abuse)

**External APIs**
- [OSRM Router API](http://project-osrm.org/) for routing polylines
- [Nominatim](https://nominatim.org/) for reverse geocoding and address search
- [Open Data Kerala](https://kerala.gov.in/) GeoJSON for constituency/LSGD point-in-polygon lookup
- [Google Maps Polyline Codec](https://github.com/googlemaps/js-polyline-codec) for encoding/decoding OSRM routes

## 🏁 Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:
- Node.js (v18 or higher)
- npm or yarn or pnpm
- A Firebase Project (with Firestore and Authentication enabled)
- Firebase App Check configured with reCAPTCHA v3

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/open2-in/chavarundo.git
   cd chavarundo
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory based on the `.env.example`:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_v3_site_key
   ```

4. **Run the development server:**
   ```bash
   pnpm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the application running.

## 🤝 Contributing

This is an open-source project, and contributions are highly appreciated! Whether it's adding new features, fixing bugs, or improving documentation, you can help make **Chavarundo?** better.

### How to Contribute

1. Fork the project.
2. Create your Feature Branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the Branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request.

### Development Guidelines
- Always format your code before committing (`pnpm run lint`).
- Keep components modular and reusable where possible.
- Update documentation when adding new configuration or system capabilities.

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature idea? Please open an issue on the [Issue Tracker](https://github.com/open2-in/chavarundo/issues/new).

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">
  <sub>Built with ❤️ by the open-source community for a cleaner Kerala.</sub>
</div>
