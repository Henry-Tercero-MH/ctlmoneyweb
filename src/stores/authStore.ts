import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GoogleProfile {
  email: string;
  name: string;
  picture: string;
}

interface AuthState {
  idToken: string | null;
  profile: GoogleProfile | null;
  /** Epoch ms en que expira el token de acceso de Google (~1h). */
  expiresAt: number | null;
  /** Callback registrado por el proveedor GSI para solicitar un token nuevo. */
  refreshHandler: (() => Promise<void>) | null;
  setSession: (idToken: string, profile: GoogleProfile, expiresIn?: number) => void;
  setRefreshHandler: (fn: () => Promise<void>) => void;
  refresh: () => Promise<void>;
  signOut: () => void;
  /** true si no hay token o ya caducó. */
  isExpired: () => boolean;
}

/**
 * La sesión se guarda en localStorage para sobrevivir a recargas de página.
 * El token de acceso de Google expira en ~1h; al caducar se limpia y se pide
 * iniciar sesión de nuevo.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      idToken: null,
      profile: null,
      expiresAt: null,
      refreshHandler: null,
      setSession: (idToken, profile, expiresIn = 3600) =>
        set({ idToken, profile, expiresAt: Date.now() + expiresIn * 1000 }),
      setRefreshHandler: (fn) => set({ refreshHandler: fn }),
      refresh: async () => {
        const handler = get().refreshHandler;
        if (handler) await handler();
      },
      signOut: () => set({ idToken: null, profile: null, expiresAt: null }),
      isExpired: () => {
        const exp = get().expiresAt;
        return exp === null || Date.now() >= exp;
      },
    }),
    {
      name: 'ctlmoney-auth',
      // refreshHandler no es serializable: solo persistimos la sesión.
      partialize: (s) => ({ idToken: s.idToken, profile: s.profile, expiresAt: s.expiresAt }),
      // Al rehidratar, si el token ya caducó descartamos la sesión.
      onRehydrateStorage: () => (state) => {
        if (state && (state.expiresAt === null || Date.now() >= state.expiresAt)) {
          state.idToken = null;
          state.profile = null;
          state.expiresAt = null;
        }
      },
    },
  ),
);
