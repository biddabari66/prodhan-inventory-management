/**
 * PRODUCTION-READY QUERY OPTIMIZATION
 * Centralized query configuration for blazing-fast performance
 */

// OPTIMIZED: Default query options for all entities
export const QUERY_DEFAULTS = {
  // Core data - longer cache, less refetch
  inventory: {
    staleTime: 3 * 60 * 1000,      // 3 minutes
    gcTime: 10 * 60 * 1000,        // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  orders: {
    staleTime: 2 * 60 * 1000,      // 2 minutes
    gcTime: 5 * 60 * 1000,         // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',      // Always fresh for critical data
  },
  
  customers: {
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 10 * 60 * 1000,        // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  // Rarely changing data
  suppliers: {
    staleTime: 10 * 60 * 1000,     // 10 minutes
    gcTime: 30 * 60 * 1000,        // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  categories: {
    staleTime: 15 * 60 * 1000,     // 15 minutes
    gcTime: 60 * 60 * 1000,        // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  // User data - moderate caching
  user: {
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 15 * 60 * 1000,        // 15 minutes
    refetchOnWindowFocus: true,    // Refetch on focus for security
  },
};

/**
 * Get optimized query options for an entity type
 */
export const getQueryOptions = (entityType = 'default') => {
  return QUERY_DEFAULTS[entityType] || {
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  };
};

/**
 * Prefetch helper for critical data
 */
export const prefetchCriticalData = async (queryClient, entities) => {
  const prefetchPromises = [];
  
  if (entities.includes('inventory')) {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['inventory'],
        queryFn: () => entities.Inventory?.list(),
        ...QUERY_DEFAULTS.inventory
      })
    );
  }
  
  if (entities.includes('orders')) {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['orders'],
        queryFn: () => entities.Order?.list('-order_date', 500),
        ...QUERY_DEFAULTS.orders
      })
    );
  }
  
  await Promise.all(prefetchPromises);
};

export default {
  QUERY_DEFAULTS,
  getQueryOptions,
  prefetchCriticalData
};