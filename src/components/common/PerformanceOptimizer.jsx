import React, { useEffect, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

// ULTRA-OPTIMIZED Debounce hook - minimal re-renders
export const useDebounce = (callback, delay = 300) => {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
};

// ULTRA-OPTIMIZED Throttle hook
export const useThrottle = (callback, limit = 300) => {
  const inThrottle = useRef(false);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args) => {
    if (!inThrottle.current) {
      callbackRef.current(...args);
      inThrottle.current = true;
      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }, [limit]);
};

// Lightweight Intersection Observer
export const useIntersectionObserver = (callback, options = {}) => {
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry.target);
        }
      });
    }, {
      rootMargin: '100px',
      threshold: 0.01,
      ...options
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [callback]);

  const observe = useCallback((element) => {
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  }, []);

  return observe;
};

// Minimal performance monitoring (dev only)
export const usePerformanceMonitor = (componentName) => {
  if (process.env.NODE_ENV === 'production') return;
  
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    if (renderCount.current % 50 === 0) {
      console.log(`[Perf] ${componentName}: ${renderCount.current} renders`);
    }
  });
};

// Ultra-lightweight cache with automatic cleanup
export const CacheManager = {
  set: (key, data, ttl = 3 * 60 * 1000) => {
    try {
      const item = { data, timestamp: Date.now(), ttl };
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (e) {
      // Silently fail if storage is full
    }
  },

  get: (key) => {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return null;

      const { data, timestamp, ttl } = JSON.parse(item);
      if (Date.now() - timestamp > ttl) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  clear: (key) => {
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (e) {}
  },

  clearAll: () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {}
  }
};

// Optimized batch request handler
export class RequestBatcher {
  constructor(batchFn, delay = 30) {
    this.batchFn = batchFn;
    this.delay = delay;
    this.queue = [];
    this.timeoutId = null;
  }

  add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      
      if (this.timeoutId) clearTimeout(this.timeoutId);

      this.timeoutId = setTimeout(() => {
        this.flush();
      }, this.delay);
    });
  }

  async flush() {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      const results = await this.batchFn(batch.map(item => item.request));
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(item => item.reject(error));
    }
  }
}

// Prefetch resources (minimal overhead)
export const prefetchResource = (url, type = 'fetch') => {
  if (type === 'image') {
    const img = new Image();
    img.src = url;
  } else {
    fetch(url, { method: 'HEAD' }).catch(() => {});
  }
};

// Service Worker registration (cached)
let swRegistration = null;
export const registerServiceWorker = async () => {
  if (swRegistration) return swRegistration;
  
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker registered');
      return swRegistration;
    } catch (error) {
      console.warn('SW registration failed:', error);
      return null;
    }
  }
  return null;
};

// Network status (cached state)
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};

// Optimized lazy image
export const LazyImage = React.memo(({ src, alt, className }) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {loaded && <img src={src} alt={alt} className="w-full h-full object-cover" />}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

// Virtual scroll for massive lists
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
  const visibleEnd = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + 5);

  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return { visibleItems, totalHeight, offsetY, handleScroll };
};

export default {
  useDebounce,
  useThrottle,
  useIntersectionObserver,
  usePerformanceMonitor,
  CacheManager,
  RequestBatcher,
  prefetchResource,
  registerServiceWorker,
  useNetworkStatus,
  LazyImage,
  useVirtualScroll
};