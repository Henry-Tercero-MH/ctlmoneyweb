import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CreditCard } from '@/core/creditCard';

interface CreditCardsState {
  cards: CreditCard[];
  upsert: (card: CreditCard) => void;
  remove: (id: string) => void;
}

/** Tarjetas guardadas localmente (localStorage). No requieren backend. */
export const useCreditCardsStore = create<CreditCardsState>()(
  persist(
    (set) => ({
      cards: [],
      upsert: (card) =>
        set((s) => ({
          cards: s.cards.some((c) => c.id === card.id)
            ? s.cards.map((c) => (c.id === card.id ? card : c))
            : [...s.cards, card],
        })),
      remove: (id) => set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),
    }),
    { name: 'ctlmoney-cards' },
  ),
);
