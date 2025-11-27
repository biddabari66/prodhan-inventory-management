import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * OPTIMIZED QUERY PROVIDER
 * Configured for maximum performance with smart caching and background updates
 */

// Create a single optimized QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 2 minutes - reduces unnecessary refetches
      staleTime: 2 * 60 * 1000,
      // Cache data for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Don't refetch on window focus for better performance
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect automatically
      refetchOnReconnect: false,
      // Keep previous data while fetching new data
      placeholderData: (previousData) => previousData,
      // Network mode - always try cache first
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Network mode for mutations
      networkMode: 'offlineFirst',
    },
  },
});

// Pre-warm cache from localStorage on startup
const prewarmCache = () => {
  try {
    const cachedKeys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
    cachedKeys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          const { data, timestamp, ttl } = JSON.parse(item);
          if (Date.now() - timestamp < ttl) {
            const queryKey = key.replace('cache_', '').split('_');
            queryClient.setQueryData(queryKey, data);
          }
        } catch (e) {
          // Invalid cache entry, ignore
        }
      }
    });
    console.log('⚡ Cache pre-warmed from localStorage');
  } catch (e) {
    console.warn('Cache pre-warm failed:', e);
  }
};

// Run prewarm on module load
prewarmCache();

export { queryClient };

export default function OptimizedQueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}