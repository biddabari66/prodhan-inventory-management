import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * 🚀 ENHANCED SERVICE WORKER FOR PWA
 * Offline-first caching, background sync, push notifications
 */

export const registerEnhancedServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Service worker code as a string to be registered
      const swCode = `
        const CACHE_NAME = 'bee-erp-v1';
        const STATIC_CACHE = 'bee-erp-static-v1';
        const DATA_CACHE = 'bee-erp-data-v1';

        const STATIC_ASSETS = [
          '/',
          '/index.html',
          '/globals.css'
        ];

        // Install event - cache static assets
        self.addEventListener('install', (event) => {
          event.waitUntil(
            caches.open(STATIC_CACHE).then((cache) => {
              return cache.addAll(STATIC_ASSETS);
            })
          );
          self.skipWaiting();
        });

        // Activate event - clean old caches
        self.addEventListener('activate', (event) => {
          event.waitUntil(
            caches.keys().then((cacheNames) => {
              return Promise.all(
                cacheNames.map((cacheName) => {
                  if (cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE) {
                    return caches.delete(cacheName);
                  }
                })
              );
            })
          );
          self.clients.claim();
        });

        // Fetch event - Network first, then cache
        self.addEventListener('fetch', (event) => {
          if (event.request.method !== 'GET') return;

          const { url } = event.request;

          // API requests - Network first, cache fallback
          if (url.includes('/api/') || url.includes('base44')) {
            event.respondWith(
              fetch(event.request)
                .then((response) => {
                  const responseClone = response.clone();
                  caches.open(DATA_CACHE).then((cache) => {
                    cache.put(event.request, responseClone);
                  });
                  return response;
                })
                .catch(() => {
                  return caches.match(event.request);
                })
            );
            return;
          }

          // Static assets - Cache first, network fallback
          event.respondWith(
            caches.match(event.request).then((response) => {
              return response || fetch(event.request).then((fetchResponse) => {
                return caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(event.request, fetchResponse.clone());
                  return fetchResponse;
                });
              });
            })
          );
        });

        // Background sync for offline form submissions
        self.addEventListener('sync', (event) => {
          if (event.tag === 'sync-forms') {
            event.waitUntil(syncPendingForms());
          }
        });

        async function syncPendingForms() {
          // Logic to sync pending form submissions when back online
          const db = await openIndexedDB();
          const pendingForms = await db.getAll('pending-forms');
          
          for (const form of pendingForms) {
            try {
              await fetch(form.url, {
                method: 'POST',
                body: JSON.stringify(form.data)
              });
              await db.delete('pending-forms', form.id);
            } catch (error) {
              console.error('Sync failed:', error);
            }
          }
        }

        function openIndexedDB() {
          return new Promise((resolve, reject) => {
            const request = indexedDB.open('BeeERP', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
              const db = event.target.result;
              if (!db.objectStoreNames.contains('pending-forms')) {
                db.createObjectStore('pending-forms', { keyPath: 'id', autoIncrement: true });
              }
            };
          });
        }
      `;

      // Create blob and register
      const blob = new Blob([swCode], { type: 'application/javascript' });
      const swUrl = URL.createObjectURL(blob);
      
      const registration = await navigator.serviceWorker.register(swUrl);
      console.log('✅ Enhanced Service Worker registered:', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            toast.info('🔄 New version available!', {
              duration: 10000,
              action: {
                label: 'Refresh',
                onClick: () => window.location.reload()
              }
            });
          }
        });
      });

      return registration;
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

export function useEnhancedServiceWorker() {
  useEffect(() => {
    registerEnhancedServiceWorker();

    // Add manifest link
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    document.head.appendChild(manifestLink);

    // Add theme color
    const themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = '#7C3AED';
    document.head.appendChild(themeColor);

    // Add apple touch icon
    const appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.href = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/b15001c35_21a3a661-2715-418e-a106-588f78cb45b6.png';
    document.head.appendChild(appleTouchIcon);
  }, []);
}

export default {
  registerEnhancedServiceWorker,
  useEnhancedServiceWorker
};