/* Service Worker for GlobalFX Pro
 * Provides offline support, static asset caching, and PWA installability.
 * Uses cache-first for static assets, network-first for API requests.
 */

const CACHE_NAME = 'globalfx-pro-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/animations.css',
  '/css/responsive.css',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://flagcdn.com/w40/us.png'
];

// ---- Install: pre-cache static shell ---------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ---- Activate: clean old caches --------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ---- Fetch: cache-first for static, network-first for API ------------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API requests: network-first (fall back to cache if offline)
  if (url.pathname.startsWith('/api/') || url.hostname === 'api.frankfurter.dev') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets & navigation: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
