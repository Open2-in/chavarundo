import { create } from "zustand";
import { useShallow } from "zustand/shallow";

export type ActivePanelType =
  | "profile"
  | "leaderboard"
  | "authority"
  | "search"
  | "guide"
  | "signInPrompt"
  | "reportDetail"
  | "about"
  | null;


interface UIStoreProp {
  activePanel: ActivePanelType;
  setActivePanel: (panel: ActivePanelType) => void;
}

export const useUIStore = create<UIStoreProp>((set) => ({
  activePanel: null,
  setActivePanel: (panel) => set({ activePanel: panel }),
}));

export function useUI() {
  return useUIStore(
    useShallow((s) => ({
      activePanel: s.activePanel,
      setActivePanel: s.setActivePanel,
    }))
  );
}
