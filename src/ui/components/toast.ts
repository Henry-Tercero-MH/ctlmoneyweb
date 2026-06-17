import { create } from 'zustand';

export interface ToastItem {
  id: number;
  message: string;
  tone: 'neutral' | 'error' | 'success';
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastItem['tone']) => void;
  dismiss: (id: number) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'neutral') => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  info: (m: string) => useToastStore.getState().push(m, 'neutral'),
  error: (m: string) => useToastStore.getState().push(m, 'error'),
  success: (m: string) => useToastStore.getState().push(m, 'success'),
};
