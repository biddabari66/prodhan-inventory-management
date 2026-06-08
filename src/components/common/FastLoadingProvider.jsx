import React, { useEffect, useState, useCallback, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';

/**
 * EXPERT FAST LOADING PROVIDER V2
 * Implements aggressive prefetching, instant navigation, and smart caching
 */

// Prefetch map with actual entity fetchers
const PREFETCH_CONFIG = {
  '/Dashboard': [
    { key: ['dashboard-stats'], fn: () => Promise.all([
      erp.entities.Admission.list('-admission_date', 100),
      erp.entities.Lead.list('-created_date', 100),
    ])},
  ],
  '/Attendance': [
    { key: ['attendance'], fn: () => erp.entities.Attendance.list('-date', 50) },
  ],
  '/CRM': [
    { key: ['leads'], fn: () => erp.entities.Lead.list('-created_date', 200) },
  ],
  '/InventoryOverview': [
    { key: ['inventory'], fn: () => erp.entities.Inventory.list() },
  ],
  '/Sales': [
    { key: ['orders'], fn: () => erp.entities.Order.list('-order_date', 100) },
    { key: ['customers'], fn: () => erp.entities.Customer.list() },
  ],
  '/PurchaseOrders': [
    { key: ['purchaseOrders'], fn: () => erp.entities.PurchaseOrder.list('-created_date', 100) },
    { key: ['inventory'], fn: () => erp.entities.Inventory.list() },
  ],
  '/Admissions': [
    { key: ['admissions'], fn: () => erp.entities.Admission.list('-admission_date', 200) },
  ],
  '/Expenses': [
    { key: ['expenses'], fn: () => erp.entities.Expense.list('-expense_date', 100) },
  ],
  '/Income': [
    { key: ['incomes'], fn: () => erp.entities.Income.list('-income_date', 100) },
  ],
};

// Lightweight transition - no blocking loader
const FastTransition = memo(({ children }) => {
  return <div className="animate-in fade-in duration-150">{children}</div>;
});

FastTransition.displayName = 'FastTransition';

export default function FastLoadingProvider({ children }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [prefetchedRoutes, setPrefetchedRoutes] = useState(new Set());

  // Prefetch route data with actual queries
  const prefetchRoute = useCallback(async (pathname) => {
    if (prefetchedRoutes.has(pathname)) return;
    
    const config = PREFETCH_CONFIG[pathname];
    if (!config) return;

    console.log(`⚡ Prefetching: ${pathname}`);
    
    try {
      await Promise.all(
        config.map(({ key, fn }) => 
          queryClient.prefetchQuery({
            queryKey: key,
            queryFn: fn,
            staleTime: 3 * 60 * 1000, // 3 minutes
          })
        )
      );
      setPrefetchedRoutes(prev => new Set([...prev, pathname]));
      console.log(`✅ Prefetched: ${pathname}`);
    } catch (e) {
      console.warn(`⚠️ Prefetch failed for ${pathname}`);
    }
  }, [queryClient, prefetchedRoutes]);

  // Prefetch current route on mount/change
  useEffect(() => {
    prefetchRoute(location.pathname);
  }, [location.pathname, prefetchRoute]);

  // Prefetch on link hover (intelligent preloading)
  useEffect(() => {
    let hoverTimeout;
    
    const handleLinkHover = (e) => {
      const link = e.target.closest('a');
      if (!link?.href?.includes(window.location.origin)) return;
      
      const path = new URL(link.href).pathname;
      if (PREFETCH_CONFIG[path] && !prefetchedRoutes.has(path)) {
        // Small delay to avoid prefetching on accidental hovers
        hoverTimeout = setTimeout(() => prefetchRoute(path), 100);
      }
    };

    const handleLinkLeave = () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };

    document.addEventListener('mouseover', handleLinkHover, { passive: true });
    document.addEventListener('mouseout', handleLinkLeave, { passive: true });
    
    return () => {
      document.removeEventListener('mouseover', handleLinkHover);
      document.removeEventListener('mouseout', handleLinkLeave);
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [prefetchRoute, prefetchedRoutes]);

  // Prefetch adjacent routes for instant navigation
  useEffect(() => {
    const adjacentRoutes = {
      '/Dashboard': ['/Attendance', '/CRM', '/InventoryOverview'],
      '/InventoryOverview': ['/Sales', '/PurchaseOrders'],
      '/Sales': ['/InventoryOverview', '/PurchaseOrders'],
    };

    const routes = adjacentRoutes[location.pathname];
    if (routes) {
      // Prefetch after a short delay using idle time
      const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
      idleCallback(() => {
        routes.forEach(route => prefetchRoute(route));
      });
    }
  }, [location.pathname, prefetchRoute]);

  return (
    <FastTransition>
      {children}
    </FastTransition>
  );
}