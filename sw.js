const CACHE_NAME = ' Dawn-Noon-calculator-v1';

const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192×192.png',
  '/icon-512X512.png'
];

// INSTALL
self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_ASSETS))
  );
});

// ACTIVATE
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener('fetch', (event) => {

  const req = event.request;

  // Google Analytics requests ignore
  if (
    req.url.includes('googletagmanager.com') ||
    req.url.includes('google-analytics.com')
  ) {
    return;
  }

  // GET requests only
  if (req.method !== 'GET') {
    return;
  }

  // Navigation requests (pages)
  if (req.mode === 'navigate') {

    event.respondWith(
      fetch(req)
        .then((networkResponse) => {

          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(req, responseClone);
            });

          return networkResponse;
        })
        .catch(async () => {

          const cachedPage = await caches.match(req);
          if (cachedPage) {
            return cachedPage;
          }

          const cachedIndex =
            await caches.match('/index.html') ||
            await caches.match('/');

          return cachedIndex;
        })
    );

    return;
  }

  // Static assets (Cache First)
  event.respondWith(
    caches.match(req)
      .then((cachedResponse) => {

        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(req)
          .then((networkResponse) => {

            if (
              networkResponse &&
              networkResponse.status === 200
            ) {

              const responseClone = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(req, responseClone);
                });
            }

            return networkResponse;
          });
      })
  );

});
