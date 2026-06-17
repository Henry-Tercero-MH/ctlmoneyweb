import { create } from 'zustand';
import type { CurrencyCode } from '@/core/money';

type Theme = 'light' | 'dark';

interface UiState {
  theme: Theme;
  activeCurrency: CurrencyCode;
  registerOpen: boolean;
  setTheme: (t: Theme) => void;
  setCurrency: (c: CurrencyCode) => void;
  openRegister: () => void;
  closeRegister: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'light',
  activeCurrency: 'GTQ',
  registerOpen: false,
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  setCurrency: (activeCurrency) => set({ activeCurrency }),
  openRegister: () => set({ registerOpen: true }),
  closeRegister: () => set({ registerOpen: false }),
}));
