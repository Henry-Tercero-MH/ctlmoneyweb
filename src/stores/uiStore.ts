import { create } from 'zustand';
import type { CurrencyCode } from '@/core/money';
import type { TransactionDTO } from '@/api/types';

type Theme = 'light' | 'dark';

interface UiState {
  theme: Theme;
  activeCurrency: CurrencyCode;
  registerOpen: boolean;
  editingTransaction: TransactionDTO | null;
  setTheme: (t: Theme) => void;
  setCurrency: (c: CurrencyCode) => void;
  openRegister: () => void;
  openEditTransaction: (tx: TransactionDTO) => void;
  closeRegister: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'dark',
  activeCurrency: 'GTQ',
  registerOpen: false,
  editingTransaction: null,
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  setCurrency: (activeCurrency) => set({ activeCurrency }),
  openRegister: () => set({ registerOpen: true, editingTransaction: null }),
  openEditTransaction: (tx) => set({ registerOpen: true, editingTransaction: tx }),
  closeRegister: () => set({ registerOpen: false, editingTransaction: null }),
}));
