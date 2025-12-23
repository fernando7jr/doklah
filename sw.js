// Service Worker for offline-first PWA
const CACHE_NAME = "doklah-v1";
const urlsToCache = [
  "/",
  "/doklah/",
  "/doklah/index.html",
  "/doklah/styles.css",
  "/doklah/app.js",
  "/doklah/health.js",
  "/doklah/i18n.js",
  "/doklah/chart.js",
  "/doklah/settings.js",
  "/doklah/manifest.json",
  "/doklah/sw.js",
  "/doklah/data/child.json",
  // Icons - cache for offline PWA display
  "/doklah/icon/favicon-16x16.png",
  "/doklah/icon/favicon-32x32.png",
  "/doklah/icon/favicon.ico",
  "/doklah/icon/apple-touch-icon.png",
  "/doklah/icon/android-chrome-192x192.png",
  "/doklah/icon/android-chrome-512x512.png",
  // Bootstrap CSS and JS from CDN - cache for offline use
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js",
];

// Install event - cache all assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn("Some assets could not be cached during install:", err);
        // Continue even if some assets fail
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache-first strategy with support for CDN resources
self.addEventListener("fetch", (event) => {
  // Handle Bootstrap CDN requests (cache indefinitely)
  if (
    event.request.url.includes("cdn.jsdelivr.net") &&
    event.request.url.includes("bootstrap")
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Return cached Bootstrap CDN resource if available
        if (response) {
          return response;
        }

        // Try to fetch from CDN
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200) {
              return response;
            }

            // Cache Bootstrap resources indefinitely
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // Return cached version if network fails
            return caches.match(event.request);
          });
      })
    );
    return;
  }

  // Skip other cross-origin requests (non-Bootstrap CDN)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        return response;
      }

      // Try to fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache if not successful
          if (
            !response ||
            response.status !== 200 ||
            response.type === "error"
          ) {
            return response;
          }

          // Cache successful responses
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Return offline fallback if available
          return caches.match("/doklah/index.html");
        });
    })
  );
});
