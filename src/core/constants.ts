/** Constantes globales: límites de Apps Script, timeouts, claves de caché. */

export const API_ENDPOINT = import.meta.env.VITE_GAS_ENDPOINT ?? '';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

/** Cliente Apps Script: reintentos y backoff. */
export const REQUEST_TIMEOUT_MS = 10_000;
export const MAX_RETRIES = 3;
export const RETRY_DELAYS_MS = [1000, 2000, 4000];

/** React Query */
export const STALE_TIME_MS = 5 * 60 * 1000;
export const GC_TIME_MS = 30 * 60 * 1000;

/** Claves de query de React Query, centralizadas para invalidación coherente. */
export const QK = {
  transactions: (yearMonth: string) => ['transactions', yearMonth] as const,
  transactionSummary: (yearMonth: string) => ['transactionSummary', yearMonth] as const,
  accounts: () => ['accounts'] as const,
  accountBalances: () => ['accountBalances'] as const,
  categories: () => ['categories'] as const,
  settings: () => ['settings'] as const,
  goals: () => ['goals'] as const,
  goalContributions: () => ['goalContributions'] as const,
  installments: () => ['installments'] as const,
} as const;
