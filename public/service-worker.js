// BeeERP Service Worker — minimal caching strategy
const CACHE_NAME = 'beeErp-v1';
const STATIC_ASSETS = ['/'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Only cache GET requests, skip API calls
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((res) => {
                // Cache successful HTML/JS/CSS responses
                if (res.ok && ['text/html', 'application/javascript', 'text/css'].some(
                    (t) => res.headers.get('content-type')?.includes(t)
                )) {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
                }
                return res;
            })
            .catch(() => caches.match(event.request))
    );
});
