import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import { SeverityType, ProfileSubject, AuthoritySubject } from "@/types";

interface MapStoreProp {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  severity: SeverityType;
  currentPathEncoded: string | null;
  currentRouteDistance: number | null;
  pointsConfirmed: boolean;
  routeError: string | null;
  detailReportId: string | null;
  pendingDeepLinkId: string | null;
  profileSubject: ProfileSubject | null;
  authoritySubject: AuthoritySubject | null;

  setOrigin: (pos: { lat: number; lng: number } | null) => void;
  setDestination: (pos: { lat: number; lng: number } | null) => void;
  setSeverity: (sev: SeverityType) => void;
  setPointsConfirmed: (val: boolean) => void;
  setRouteData: (encodedPath: string | null, distanceM: number | null) => void;
  setRouteError: (msg: string | null) => void;
  setDetailReportId: (id: string | null) => void;
  setPendingDeepLinkId: (id: string | null) => void;
  setProfileSubject: (subject: ProfileSubject | null) => void;
  setAuthoritySubject: (subject: AuthoritySubject | null) => void;
  cancelRouteReporting: () => void;
}

export const useMapStore = create<MapStoreProp>((set) => ({
  origin: null,
  destination: null,
  severity: "low",
  currentPathEncoded: null,
  currentRouteDistance: null,
  pointsConfirmed: false,
  routeError: null,
  detailReportId: null,
  pendingDeepLinkId: null,
  profileSubject: null,
  authoritySubject: null,

  setOrigin: (pos) =>
    set({
      origin: pos,
      destination: null,
      currentPathEncoded: null,
      currentRouteDistance: null,
      pointsConfirmed: false,
      routeError: null,
    }),
  setDestination: (pos) => set({ destination: pos }),
  setSeverity: (sev) => set({ severity: sev }),
  setPointsConfirmed: (val) => set({ pointsConfirmed: val }),
  setRouteData: (encodedPath, distanceM) =>
    set({
      currentPathEncoded: encodedPath,
      currentRouteDistance: distanceM,
      routeError: null,
    }),
  setRouteError: (msg) =>
    set({
      routeError: msg,
      currentPathEncoded: null,
      currentRouteDistance: null,
    }),
  setDetailReportId: (id) => set({ detailReportId: id }),
  setPendingDeepLinkId: (id) => set({ pendingDeepLinkId: id }),
  setProfileSubject: (subject) => set({ profileSubject: subject }),
  setAuthoritySubject: (subject) => set({ authoritySubject: subject }),
  cancelRouteReporting: () =>
    set({
      origin: null,
      destination: null,
      currentPathEncoded: null,
      currentRouteDistance: null,
      pointsConfirmed: false,
      routeError: null,
    }),
}));

export function useMapRoute() {
  return useMapStore(
    useShallow((s) => ({
      origin: s.origin,
      destination: s.destination,
      severity: s.severity,
      currentPathEncoded: s.currentPathEncoded,
      currentRouteDistance: s.currentRouteDistance,
      pointsConfirmed: s.pointsConfirmed,
      routeError: s.routeError,
      setOrigin: s.setOrigin,
      setDestination: s.setDestination,
      setSeverity: s.setSeverity,
      setPointsConfirmed: s.setPointsConfirmed,
      setRouteData: s.setRouteData,
      setRouteError: s.setRouteError,
      cancelRouteReporting: s.cancelRouteReporting,
    }))
  );
}

export function useMapSelection() {
  return useMapStore(
    useShallow((s) => ({
      detailReportId: s.detailReportId,
      setDetailReportId: s.setDetailReportId,
      pendingDeepLinkId: s.pendingDeepLinkId,
      setPendingDeepLinkId: s.setPendingDeepLinkId,
      profileSubject: s.profileSubject,
      setProfileSubject: s.setProfileSubject,
      authoritySubject: s.authoritySubject,
      setAuthoritySubject: s.setAuthoritySubject,
    }))
  );
}
