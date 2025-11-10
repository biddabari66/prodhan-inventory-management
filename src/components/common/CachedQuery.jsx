import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CacheManager } from './PerformanceOptimizer';

/**
 * CACHED QUERY HOOK
 * Wraps @tanstack/react-query with localStorage caching for instant loads
 */

export const useCachedQuery = (queryKey, queryFn, options = {}) => {
  const cacheKey = Array.isArray(queryKey) ? queryKey.join('_') : queryKey;
  const cacheTTL = options.cacheTTL || 5 * 60 * 1000; // 5 minutes default

  // Get initial data from cache
  const initialData = CacheManager.get(cacheKey);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await queryFn();
      // Cache successful responses
      if (data) {
        CacheManager.set(cacheKey, data, cacheTTL);
      }
      return data;
    },
    initialData: initialData || undefined,
    staleTime: cacheTTL / 2, // Data becomes stale at half the cache TTL
    ...options
  });

  return query;
};

/**
 * PREFETCH QUERY
 * Prefetch data in the background for instant page loads
 */
export const usePrefetchQuery = (queryClient, queryKey, queryFn) => {
  const prefetch = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000
    });
  }, [queryClient, queryKey, queryFn]);

  return prefetch;
};

export default useCachedQuery;