import { QueryClient } from '@tanstack/react-query';
import { STALE_TIME_MS, GC_TIME_MS } from '@/core/constants';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      gcTime: GC_TIME_MS,
      retry: false, // el retry lo gestiona el cliente Apps Script (backoff)
      refetchOnWindowFocus: false,
    },
  },
});
