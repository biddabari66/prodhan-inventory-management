import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * 🚀 ULTRA-OPTIMIZED CACHED QUERY HOOK
 * Combines React Query with localStorage and aggressive memory caching
 */

// In-memory cache for instant reads
const memoryCache = new Map();
const MEMORY_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export const useCachedQuery = (queryKey, queryFn, options = {}) => {
  const {
    cacheTTL = 5 * 60 * 1000, // 5 minutes default
    staleTime = 3 * 60 * 1000, // 3 minutes default
    useMemoryCache = true,
    useLocalStorage = true,
    ...reactQueryOptions
  } = options;

  const queryClient = useQueryClient();
  const cacheKey = `rq_cache_${JSON.stringify(queryKey)}`;
  const memoryCacheKey = `mem_${JSON.stringify(queryKey)}`;

  // Check memory cache first (ultra-fast)
  const getMemoryCache = () => {
    if (!useMemoryCache) return null;
    
    const cached = memoryCache.get(memoryCacheKey);
    if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL) {
      return cached.data;
    }
    return null;
  };

  // Check localStorage second (fast)
  const getLocalStorageCache = () => {
    if (!useLocalStorage) return null;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheTTL) {
          return data;
        }
        localStorage.removeItem(cacheKey);
      }
    } catch (error) {
      console.warn('Cache read failed:', error);
    }
    return null;
  };

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      // Try memory cache first
      const memCached = getMemoryCache();
      if (memCached) {
        console.log(`⚡⚡ Memory cache hit: ${queryKey[0]}`);
        return memCached;
      }

      // Try localStorage second
      const lsCached = getLocalStorageCache();
      if (lsCached) {
        console.log(`⚡ LocalStorage cache hit: ${queryKey[0]}`);
        // Also set in memory cache for next time
        if (useMemoryCache) {
          memoryCache.set(memoryCacheKey, { data: lsCached, timestamp: Date.now() });
        }
        return lsCached;
      }

      // Fetch fresh data
      console.log(`📡 Fetching fresh: ${queryKey[0]}`);
      const freshData = await queryFn();

      // Cache in memory
      if (useMemoryCache) {
        memoryCache.set(memoryCacheKey, { data: freshData, timestamp: Date.now() });
      }

      // Cache in localStorage
      if (useLocalStorage) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: freshData,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.warn('Cache write failed:', error);
        }
      }

      return freshData;
    },
    staleTime,
    gcTime: cacheTTL,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...reactQueryOptions
  });

  return query;
};

// Prefetch hook for background loading
export const usePrefetchQuery = () => {
  const queryClient = useQueryClient();

  return (queryKey, queryFn, options = {}) => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000,
      ...options
    });
  };
};

// Clear all caches
export const clearAllCaches = () => {
  // Clear memory cache
  memoryCache.clear();
  
  // Clear localStorage caches
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('rq_cache_') || key.startsWith('cache_')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('🧹 All caches cleared');
};