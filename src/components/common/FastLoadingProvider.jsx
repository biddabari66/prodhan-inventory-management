import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * 🚀 ULTRA-FAST LOADING PROVIDER
 * Advanced performance optimization with intelligent caching and prefetching
 */

const FastLoadingContext = createContext();

// Advanced cache with TTL and priority
class SmartCache {
  constructor() {
    this.cache = new Map();
    this.priorities = new Map();
    this.maxSize = 100;
  }

  set(key, value, ttl = 5 * 60 * 1000, priority = 1) {
    if (this.cache.size >= this.maxSize) {
      this.evictLowestPriority();
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl,
      hits: 0
    });
    this.priorities.set(key, priority);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.priorities.delete(key);
      return null;
    }

    // Increment hit counter for LRU
    item.hits++;
    return item.data;
  }

  evictLowestPriority() {
    let lowestPriority = Infinity;
    let lowestKey = null;

    for (const [key, priority] of this.priorities.entries()) {
      const item = this.cache.get(key);
      const score = priority * (item?.hits || 1);
      
      if (score < lowestPriority) {
        lowestPriority = score;
        lowestKey = key;
      }
    }

    if (lowestKey) {
      this.cache.delete(lowestKey);
      this.priorities.delete(lowestKey);
    }
  }

  clear() {
    this.cache.clear();
    this.priorities.clear();
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check expiration
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

const globalCache = new SmartCache();

export const useFastLoading = () => {
  const context = useContext(FastLoadingContext);
  if (!context) {
    throw new Error('useFastLoading must be used within FastLoadingProvider');
  }
  return context;
};

export default function FastLoadingProvider({ children }) {
  const [prefetchQueue, setPrefetchQueue] = useState([]);

  // Batch fetch function with deduplication
  const batchFetch = useCallback(async (requests) => {
    const uniqueRequests = [...new Map(requests.map(r => [r.key, r])).values()];
    
    const results = await Promise.allSettled(
      uniqueRequests.map(async (request) => {
        // Check cache first
        if (globalCache.has(request.key)) {
          return { key: request.key, data: globalCache.get(request.key), fromCache: true };
        }

        try {
          const data = await request.fetcher();
          globalCache.set(request.key, data, request.ttl || 5 * 60 * 1000, request.priority || 1);
          return { key: request.key, data, fromCache: false };
        } catch (error) {
          console.error(`Fetch failed for ${request.key}:`, error);
          return { key: request.key, error, fromCache: false };
        }
      })
    );

    return results;
  }, []);

  // Smart prefetch with idle time detection
  useEffect(() => {
    if (prefetchQueue.length === 0) return;

    // Use requestIdleCallback for non-critical prefetching
    const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));

    const handle = idleCallback(() => {
      batchFetch(prefetchQueue);
      setPrefetchQueue([]);
    });

    return () => {
      if (window.cancelIdleCallback) {
        window.cancelIdleCallback(handle);
      } else {
        clearTimeout(handle);
      }
    };
  }, [prefetchQueue, batchFetch]);

  const cachedFetch = useCallback(async (key, fetcher, options = {}) => {
    const { ttl = 5 * 60 * 1000, priority = 1, force = false } = options;

    // Return from cache if available and not forced
    if (!force && globalCache.has(key)) {
      console.log(`⚡ Cache hit: ${key}`);
      return globalCache.get(key);
    }

    console.log(`📡 Fetching: ${key}`);
    try {
      const data = await fetcher();
      globalCache.set(key, data, ttl, priority);
      return data;
    } catch (error) {
      console.error(`Fetch error for ${key}:`, error);
      throw error;
    }
  }, []);

  const prefetch = useCallback((key, fetcher, options = {}) => {
    if (globalCache.has(key)) {
      console.log(`⚡ Already cached: ${key}`);
      return;
    }

    setPrefetchQueue(prev => [
      ...prev,
      { key, fetcher, ...options }
    ]);
  }, []);

  const clearCache = useCallback((key) => {
    if (key) {
      globalCache.cache.delete(key);
      globalCache.priorities.delete(key);
    } else {
      globalCache.clear();
    }
  }, []);

  const value = {
    cachedFetch,
    prefetch,
    clearCache,
    cache: globalCache
  };

  return (
    <FastLoadingContext.Provider value={value}>
      {children}
    </FastLoadingContext.Provider>
  );
}

// Hook for optimized data fetching
export const useOptimizedFetch = (key, fetcher, options = {}) => {
  const { cachedFetch } = useFastLoading();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const result = await cachedFetch(key, fetcher, options);
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [key, cachedFetch]);

  return { data, isLoading, error };
};