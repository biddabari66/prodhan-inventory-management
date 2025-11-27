import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * EXPERT DATA PREFETCHER V2
 * Aggressive background prefetching with smart cache management
 */

// Optimized prefetch configs with smaller initial loads
const PREFETCH_QUERIES = {
  users: {
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date', 50),
    staleTime: 5 * 60 * 1000,
  },
  currentUser: {
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000,
  },
  admissions: {
    queryKey: ['admissions'],
    queryFn: () => base44.entities.Admission.list('-admission_date', 100),
    staleTime: 3 * 60 * 1000,
  },
  leads: {
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date', 100),
    staleTime: 2 * 60 * 1000,
  },
  expenses: {
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-expense_date', 50),
    staleTime: 3 * 60 * 1000,
  },
  incomes: {
    queryKey: ['incomes'],
    queryFn: () => base44.entities.Income.list('-income_date', 50),
    staleTime: 3 * 60 * 1000,
  },
  inventory: {
    queryKey: ['inventory'],
    queryFn: () => base44.entities.Inventory.list('-updated_date', 200),
    staleTime: 5 * 60 * 1000,
  },
  attendance: {
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list('-date', 50),
    staleTime: 2 * 60 * 1000,
  },
  tasks: {
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 50),
    staleTime: 3 * 60 * 1000,
  },
  orders: {
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-order_date', 100),
    staleTime: 2 * 60 * 1000,
  },
  customers: {
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 100),
    staleTime: 5 * 60 * 1000,
  },
  suppliers: {
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    staleTime: 10 * 60 * 1000,
  },
};

// Track prefetched keys to avoid duplicate fetches
const prefetchedKeys = new Set();

export const usePrefetchData = (dataKeys = []) => {
  const queryClient = useQueryClient();
  const prefetchedRef = useRef(new Set());

  useEffect(() => {
    const keysToFetch = dataKeys.filter(k => !prefetchedRef.current.has(k));
    if (keysToFetch.length === 0) return;

    const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 100));
    
    idleCallback(() => {
      keysToFetch.forEach(key => {
        const config = PREFETCH_QUERIES[key];
        if (config && !prefetchedKeys.has(key)) {
          prefetchedKeys.add(key);
          prefetchedRef.current.add(key);
          
          queryClient.prefetchQuery({
            queryKey: config.queryKey,
            queryFn: config.queryFn,
            staleTime: config.staleTime,
          }).catch(() => {
            prefetchedKeys.delete(key);
          });
        }
      });
    }, { timeout: 3000 });
  }, [dataKeys.join(','), queryClient]);
};

// Hook to prefetch on link hover with debouncing
export const usePrefetchOnHover = () => {
  const queryClient = useQueryClient();
  const timeoutRef = useRef(null);

  const prefetchForRoute = useCallback((pathname) => {
    // Return props to attach to link elements
    return {
      onMouseEnter: () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        timeoutRef.current = setTimeout(() => {
          const routeDataMap = {
            '/Dashboard': ['admissions', 'leads'],
            '/Attendance': ['attendance'],
            '/CRM': ['leads'],
            '/InventoryOverview': ['inventory'],
            '/Admissions': ['admissions'],
            '/Expenses': ['expenses'],
            '/Income': ['incomes'],
            '/Sales': ['orders', 'customers'],
            '/PurchaseOrders': ['inventory', 'suppliers'],
          };

          const dataKeys = routeDataMap[pathname] || [];
          
          dataKeys.forEach(key => {
            const config = PREFETCH_QUERIES[key];
            if (config && !prefetchedKeys.has(key)) {
              prefetchedKeys.add(key);
              queryClient.prefetchQuery({
                queryKey: config.queryKey,
                queryFn: config.queryFn,
                staleTime: config.staleTime,
              }).catch(() => prefetchedKeys.delete(key));
            }
          });
        }, 150);
      },
      onMouseLeave: () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    };
  }, [queryClient]);

  return { prefetchForRoute };
};

// Batch prefetch for critical data on app startup
export const prefetchCriticalData = async (queryClient) => {
  const criticalKeys = ['currentUser'];
  
  await Promise.allSettled(
    criticalKeys.map(key => {
      const config = PREFETCH_QUERIES[key];
      if (config) {
        return queryClient.prefetchQuery({
          queryKey: config.queryKey,
          queryFn: config.queryFn,
          staleTime: config.staleTime,
        });
      }
      return Promise.resolve();
    })
  );
};

export default usePrefetchData;