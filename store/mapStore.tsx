"use client";

import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import { SeverityType, ProfileSubject, AuthoritySubject } from "@/types";
import { useUIStore } from "./uiStore";

interface MapStoreProp {
  severity: SeverityType;
  detailReportId: string | null;
  pendingDeepLinkId: string | null;
  profileSubject: ProfileSubject | null;
  authoritySubject: AuthoritySubject | null;

  setSeverity: (sev: SeverityType) => void;
  setDetailReportId: (id: string | null) => void;
  setPendingDeepLinkId: (id: string | null) => void;
  setProfileSubject: (subject: ProfileSubject | null) => void;
  setAuthoritySubject: (subject: AuthoritySubject | null) => void;
}

export const useMapStore = create<MapStoreProp>((set) => ({
  severity: "low",
  detailReportId: null,
  pendingDeepLinkId: null,
  profileSubject: null,
  authoritySubject: null,

  setSeverity: (sev) => set({ severity: sev }),
  setDetailReportId: (id) => set({ detailReportId: id }),
  setPendingDeepLinkId: (id) => set({ pendingDeepLinkId: id }),
  setProfileSubject: (subject) => set({ profileSubject: subject }),
  setAuthoritySubject: (subject) => set({ authoritySubject: subject }),
}));

export function useMapSelection() {
  const store = useMapStore(
    useShallow((s) => ({
      detailReportId: s.detailReportId,
      setDetailReportId: s.setDetailReportId,
      pendingDeepLinkId: s.pendingDeepLinkId,
      setPendingDeepLinkId: s.setPendingDeepLinkId,
      profileSubject: s.profileSubject,
      setProfileSubject: s.setProfileSubject,
      authoritySubject: s.authoritySubject,
      setAuthoritySubject: s.setAuthoritySubject,
      severity: s.severity,
      setSeverity: s.setSeverity,
    }))
  );

  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const activePanel = useUIStore((s) => s.activePanel);

  const setDetailReportIdWithPanel = (id: string | null) => {
    store.setDetailReportId(id);
    if (id) {
      setActivePanel("reportDetail");
    } else if (activePanel === "reportDetail") {
      setActivePanel(null);
    }
  };

  return {
    ...store,
    setDetailReportId: setDetailReportIdWithPanel,
  };
}
