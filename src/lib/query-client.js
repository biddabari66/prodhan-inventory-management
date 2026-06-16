import { QueryClient, keepPreviousData } from '@tanstack/react-query';

// Production-grade defaults:
// - staleTime keeps data "fresh" so pages don't refetch (and flash) on every mount.
// - cached data shows instantly on revisit; keepPreviousData avoids empty flashes
//   when filters/keys change.
// - retry with backoff smooths over transient network/cold-start "failed to load".
export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 60 * 1000, // 1 min — no needless refetch flashes
      gcTime: 10 * 60 * 1000, // keep cache 10 min
      placeholderData: keepPreviousData, // show last data instead of blank while refetching
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    },
    mutations: { retry: 0 },
  },
});
