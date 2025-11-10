import React, { useEffect, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * EXPERT PERFORMANCE OPTIMIZATION UTILITIES
 * Production-grade performance monitoring and optimization
 */

// Debounce hook for expensive operations
export const useDebounce = (callback, delay = 500) => {
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

// Throttle hook for high-frequency events
export const useThrottle = (callback, limit = 1000) => {
  const inThrottle = useRef(false);

  return useCallback((...args) => {
    if (!inThrottle.current) {
      callback(...args);
      inThrottle.current = true;
      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }, [callback, limit]);
};

// Intersection Observer for lazy loading
export const useIntersectionObserver = (callback, options = {}) => {
  const observerRef = useRef(null);
  const elementsRef = useRef(new Set());

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observerRef.current?.unobserve(entry.target);
          elementsRef.current.delete(entry.target);
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.01,
      ...options
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [callback, options]);

  const observe = useCallback((element) => {
    if (element && observerRef.current) {
      observerRef.current.observe(element);
      elementsRef.current.add(element);
    }
  }, []);

  return observe;
};

// Performance monitoring
export const usePerformanceMonitor = (componentName) => {
  const renderCount = useRef(0);
  const renderTimes = useRef([]);

  useEffect(() => {
    renderCount.current += 1;
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      renderTimes.current.push(renderTime);

      if (renderCount.current % 10 === 0) {
        const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
        console.log(`[Performance] ${componentName}: ${renderCount.current} renders, avg ${avgRenderTime.toFixed(2)}ms`);
        
        if (avgRenderTime > 16) {
          console.warn(`⚠️ ${componentName} is rendering slowly (${avgRenderTime.toFixed(2)}ms). Consider optimization.`);
        }
      }
    };
  });
};

// Local storage cache with expiration
export const CacheManager = {
  set: (key, data, ttl = 5 * 60 * 1000) => {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Cache set failed:', error);
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
    } catch (error) {
      console.warn('Cache get failed:', error);
      return null;
    }
  },

  clear: (key) => {
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  },

  clearAll: () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Cache clear all failed:', error);
    }
  }
};

// Batch API requests
export class RequestBatcher {
  constructor(batchFn, delay = 50) {
    this.batchFn = batchFn;
    this.delay = delay;
    this.queue = [];
    this.timeoutId = null;
  }

  add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

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

// Prefetch resources
export const prefetchResource = (url, type = 'fetch') => {
  if (type === 'image') {
    const img = new Image();
    img.src = url;
  } else {
    fetch(url, { method: 'GET', mode: 'no-cors' }).catch(() => {});
  }
};

// Service Worker registration
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Network status monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState(
    navigator.connection?.effectiveType || 'unknown'
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Some features may not work.');
    };

    const handleConnectionChange = () => {
      setConnectionType(navigator.connection?.effectiveType || 'unknown');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.connection?.addEventListener('change', handleConnectionChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.connection?.removeEventListener('change', handleConnectionChange);
    };
  }, []);

  return { isOnline, connectionType };
};

// Image lazy loader component
export const LazyImage = React.memo(({ src, alt, className, placeholder }) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {inView ? (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        placeholder || <div className="bg-gray-200 animate-pulse" style={{ aspectRatio: '16/9' }} />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

// Virtual scroll hook
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);

  const visibleItems = items.slice(
    Math.max(0, visibleStart - 5),
    Math.min(items.length, visibleEnd + 5)
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = Math.max(0, visibleStart - 5) * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  };
};

// Memory usage monitor
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState(null);

  useEffect(() => {
    if (performance.memory) {
      const updateMemory = () => {
        setMemoryInfo({
          usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
          totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
          limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)
        });
      };

      updateMemory();
      const interval = setInterval(updateMemory, 10000);
      return () => clearInterval(interval);
    }
  }, []);

  return memoryInfo;
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
  useVirtualScroll,
  useMemoryMonitor
};