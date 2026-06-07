# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev       # Start development server
pnpm run build     # Production build
pnpm run lint      # Run ESLint
pnpm run clean     # Clean Next.js build artifacts
npx tsc --noEmit   # Type-check without emitting
```

## Architecture Overview

**Chavarundo** is a community road waste and garbage tracker for Kerala. It is a Next.js 15 (App Router) single-page app centered around a dynamic Leaflet map.

### Directory Structure & Conventions

- **`components/base/`** — Reusable, atomic, and premium UI components (`Button`, `Card`, `Dialog`, `Input`, `Sheet`, `Textarea`, `Modal`) exported via `components/base/index.ts`. Always prefer base components over styling custom raw HTML tags.
- **`components/report/`** — Report wizard and details forms (`PhotoCaptureModal`, `MapAdjustmentOverlay`, `SubmitReportForm`, `AIReviewOverlay`, `SignInToReportModal`) dispatched by the switcher component `AddGarbageReport.tsx`, exported via `components/report/index.ts`.
- **`components/utils/`** — Centralized helpers for maps and profiles, exported via `components/utils/index.ts`. Follow descriptive naming conventions (e.g., `getSeverityColor`).
- **`store/`** — Zustand state stores. Keep React selector hooks at the bottom of the corresponding store file (e.g. `useUI` in `uiStore.tsx`, `useMapSelection` in `mapStore.tsx`, etc.).
- **`public/svgpath/`** — Static illustrations as standard XML SVGs with kebab-case attributes (no JSX camelCase).
- **`data/`** — Centralized slide metadata and JSON content configs.

### Data Flow & State Management

1. **Real-time reads**: A single `onSnapshot` listener on the `waste_reports` Firestore collection drives the map.
2. **Writing a report**: User snaps/uploads a photo. The app parses the image geotag, and the user can adjust the location by clicking/dragging a single pin on the map within a 30m constraint radius of the image coordinates. Nominatim reverse-geocodes the location, `/api/constituency` resolves AC/PC/LSGD boundaries via point-in-polygon, and the report is saved to Firestore.
3. **Global Panels & Sheets (`activePanel`)**: UI overlays (Profile, Leaderboard, Search, Onboarding Guide, Report Details) are managed centrally in `uiStore.tsx`. The `reportDetail` panel tracks selection via `detailReportId` in `mapStore.tsx`. Opening a new panel automatically triggers a `useEffect` inside `RenderReports.tsx` that cleans up and dismisses the selected report ID.
4. **SVG Cache Store (`useSVG`)**: SVG illustrations are fetched dynamically from `/public/svgpath/`. The `useSVG(url)` hook checks the Zustand memory cache, falls back to `localStorage` (`svg-cache:<url>`), and fetches from the network on miss, saving to both caches.

## Coding Rules

- **Use Reusable Base Components**: Never write custom-styled raw buttons, text inputs, textareas, or modal card backdrops. Import from `@/components/base` instead.
- **No Inline SVGs in Components**: Move illustrations to `/public/svgpath/` and fetch them dynamically using the `useSVG` caching hook. Render using `dangerouslySetInnerHTML`.
- **Maintain Colocated Hooks**: Keep store hooks (like `useMapSelection`) at the bottom of their respective Zustand store files.
- **Responsive Animations**: Use `motion/react` (framer-motion) with strict exit and transition bounds. Slide elements must have `overflow-hidden` or `overflow-x-hidden` on parent containers to prevent scrollbar flashes.
- **Enforce Type Safety**: Ensure all changes pass `pnpm exec tsc --noEmit` before concluding.
