import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '@/entities/User';
import { Admission } from '@/entities/Admission';
import { Lead } from '@/entities/Lead';
import { Expense } from '@/entities/Expense';
import { Income } from '@/entities/Income';
import { Inventory } from '@/entities/Inventory';
import { Attendance } from '@/entities/Attendance';
import { Task } from '@/entities/Task';
import { Course } from '@/entities/Course';
import { Order } from '@/entities/Order';
import { Customer } from '@/entities/Customer';

/**
 * EXPERT DATA PREFETCHER
 * Intelligently prefetches data in the background for instant page loads
 */

const PREFETCH_QUERIES = {
  users: {
    queryKey: ['users'],
    queryFn: () => User.list(),
    staleTime: 5 * 60 * 1000,
  },
  currentUser: {
    queryKey: ['currentUser'],
    queryFn: () => User.me(),
    staleTime: 5 * 60 * 1000,
  },
  admissions: {
    queryKey: ['admissions'],
    queryFn: () => Admission.list('-admission_date', 500),
    staleTime: 3 * 60 * 1000,
  },
  leads: {
    queryKey: ['leads'],
    queryFn: () => Lead.list('-created_date', 500),
    staleTime: 2 * 60 * 1000,
  },
  expenses: {
    queryKey: ['expenses'],
    queryFn: () => Expense.list('-expense_date', 200),
    staleTime: 3 * 60 * 1000,
  },
  incomes: {
    queryKey: ['incomes'],
    queryFn: () => Income.list('-income_date', 200),
    staleTime: 3 * 60 * 1000,
  },
  inventory: {
    queryKey: ['inventory'],
    queryFn: () => Inventory.list(),
    staleTime: 5 * 60 * 1000,
  },
  attendance: {
    queryKey: ['attendance'],
    queryFn: () => Attendance.list('-date', 100),
    staleTime: 2 * 60 * 1000,
  },
  tasks: {
    queryKey: ['tasks'],
    queryFn: () => Task.list('-created_date', 100),
    staleTime: 3 * 60 * 1000,
  },
  courses: {
    queryKey: ['courses'],
    queryFn: () => Course.list('-created_date', 500),
    staleTime: 10 * 60 * 1000, // Courses change less frequently
  },
  orders: {
    queryKey: ['orders'],
    queryFn: () => Order.list('-order_date', 500),
    staleTime: 2 * 60 * 1000,
  },
  customers: {
    queryKey: ['customers'],
    queryFn: () => Customer.list(),
    staleTime: 5 * 60 * 1000,
  },
};

export const usePrefetchData = (dataKeys = []) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Use requestIdleCallback for non-blocking prefetch
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        prefetchInBackground(dataKeys, queryClient);
      }, { timeout: 2000 });
    } else {
      setTimeout(() => {
        prefetchInBackground(dataKeys, queryClient);
      }, 500);
    }
  }, [dataKeys.join(','), queryClient]);
};

const prefetchInBackground = async (dataKeys, queryClient) => {
  console.log('🔮 Prefetching data:', dataKeys);
  
  for (const key of dataKeys) {
    const queryConfig = PREFETCH_QUERIES[key];
    
    if (queryConfig) {
      try {
        await queryClient.prefetchQuery({
          queryKey: queryConfig.queryKey,
          queryFn: queryConfig.queryFn,
          staleTime: queryConfig.staleTime,
        });
        console.log(`✅ Prefetched: ${key}`);
      } catch (error) {
        console.warn(`⚠️ Prefetch failed for ${key}:`, error.message);
      }
    }
  }
};

// Hook to prefetch on link hover
export const usePrefetchOnHover = () => {
  const queryClient = useQueryClient();

  const prefetchForRoute = (pathname) => {
    const routeDataMap = {
      '/Dashboard': ['users', 'admissions', 'leads', 'expenses', 'incomes'],
      '/Attendance': ['currentUser', 'attendance'],
      '/CRM': ['leads', 'users'],
      '/Inventory': ['inventory'],
      '/Admissions': ['admissions', 'users'],
      '/Expenses': ['expenses', 'users'],
      '/Income': ['incomes', 'users'],
      '/Procurement': ['orders', 'customers', 'inventory'],
      '/Courses': ['courses', 'users'],
    };

    const dataKeys = routeDataMap[pathname] || [];
    
    if (dataKeys.length > 0) {
      prefetchInBackground(dataKeys, queryClient);
    }
  };

  return { prefetchForRoute };
};

export default usePrefetchData;