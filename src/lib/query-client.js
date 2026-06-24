import { QueryClient, keepPreviousData } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Production-grade defaults for a fast, modern-feeling app:
// - staleTime keeps data "fresh" so pages don't refetch (and flash) on every mount.
// - gcTime is long so cached data survives in memory; the persister mirrors it to
//   localStorage so revisiting a page (or reloading) shows data INSTANTLY while it
//   revalidates in the background (stale-while-revalidate, like FB/Google).
// - keepPreviousData avoids empty flashes when filters/keys change.
export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000, // 5 min fresh — instant nav, no needless refetch
      gcTime: 24 * 60 * 60 * 1000, // keep 24h (persisted across reloads)
      placeholderData: keepPreviousData,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    },
    mutations: { retry: 0 },
  },
});

// localStorage persister — hydrates the cache on load so pages paint immediately.
export const queryPersister = typeof window !== 'undefined'
  ? createSyncStoragePersister({ storage: window.localStorage, key: 'zypra-query-cache', throttleTime: 1000 })
  : undefined;
