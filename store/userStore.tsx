import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, loginWithGoogle, loginAnonymously, logout } from "@/lib/firebase";

interface UserState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  loginWithGoogle: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  loginWithGoogle: async () => {
    set({ loading: true });
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Store Google Login failed:", error);
    } finally {
      set({ loading: false });
    }
  },
  loginAnonymously: async () => {
    set({ loading: true });
    try {
      await loginAnonymously();
    } catch (error) {
      console.error("Store Anonymous Login failed:", error);
    } finally {
      set({ loading: false });
    }
  },
  logout: async () => {
    set({ loading: true });
    try {
      await logout();
    } catch (error) {
      console.error("Store Logout failed:", error);
    } finally {
      set({ loading: false });
    }
  },
}));

// Initialize subscription to Firebase auth changes
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (u) => {
    useUserStore.getState().setUser(u);
    useUserStore.getState().setLoading(false);
  });
}

export function useUser() {
  return useUserStore(
    useShallow((s) => ({
      user: s.user,
      loading: s.loading,
      loginWithGoogle: s.loginWithGoogle,
      loginAnonymously: s.loginAnonymously,
      logout: s.logout,
    }))
  );
}
