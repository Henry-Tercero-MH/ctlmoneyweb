import { create } from 'zustand';

export interface GoogleProfile {
  email: string;
  name: string;
  picture: string;
}

interface AuthState {
  idToken: string | null;
  profile: GoogleProfile | null;
  /** Callback registrado por el proveedor GSI para solicitar un token nuevo. */
  refreshHandler: (() => Promise<void>) | null;
  setSession: (idToken: string, profile: GoogleProfile) => void;
  setRefreshHandler: (fn: () => Promise<void>) => void;
  refresh: () => Promise<void>;
  signOut: () => void;
}

/** El ID token vive SOLO en memoria (no localStorage): expira en ~1h y se refresca. */
export const useAuthStore = create<AuthState>((set, get) => ({
  idToken: null,
  profile: null,
  refreshHandler: null,
  setSession: (idToken, profile) => set({ idToken, profile }),
  setRefreshHandler: (fn) => set({ refreshHandler: fn }),
  refresh: async () => {
    const handler = get().refreshHandler;
    if (handler) await handler();
  },
  signOut: () => set({ idToken: null, profile: null }),
}));
