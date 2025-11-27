import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * CACHED QUERY HOOK V2
 * Ultra-fast queries with localStorage persistence and stale-while-revalidate
 */

// Simple cache manager
const cache = {
  get: (key) => {
    try {
      const item = localStorage.getItem(`q_${key}`);
      if (!item) return null;
      const { data, exp } = JSON.parse(item);
      if (Date.now() > exp) {
        localStorage.removeItem(`q_${key}`);
        return null;
      }
      return data;
    } catch { return null; }
  },
  set: (key, data, ttl = 300000) => {
    try {
      localStorage.setItem(`q_${key}`, JSON.stringify({ data, exp: Date.now() + ttl }));
    } catch { /* quota exceeded, ignore */ }
  }
};

export const useCachedQuery = (queryKey, queryFn, options = {}) => {
  const cacheKey = Array.isArray(queryKey) ? queryKey.join('_') : queryKey;
  const cacheTTL = options.cacheTTL || 5 * 60 * 1000;

  // Get cached data synchronously for instant display
  const cachedData = useMemo(() => cache.get(cacheKey), [cacheKey]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await queryFn();
      if (data) cache.set(cacheKey, data, cacheTTL);
      return data;
    },
    initialData: cachedData,
    staleTime: cachedData ? cacheTTL : 0, // If cached, don't refetch immediately
    gcTime: cacheTTL * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: !cachedData, // Only refetch on mount if no cache
    ...options
  });

  return query;
};

/**
 * INSTANT QUERY - Shows cached data immediately, updates in background
 */
export const useInstantQuery = (queryKey, queryFn, options = {}) => {
  const cacheKey = Array.isArray(queryKey) ? queryKey.join('_') : queryKey;
  const cachedData = useMemo(() => cache.get(cacheKey), [cacheKey]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const data = await queryFn();
      if (data) cache.set(cacheKey, data, 10 * 60 * 1000);
      return data;
    },
    initialData: cachedData,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
    ...options
  });
};

/**
 * PREFETCH QUERY
 */
export const usePrefetchQuery = (queryKey, queryFn) => {
  const queryClient = useQueryClient();
  
  return useCallback(() => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000
    });
  }, [queryClient, queryKey, queryFn]);
};

export default useCachedQuery;