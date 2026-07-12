const CACHE_NAME = 'Dawn-Noon-calculator-v2';

// 1. Offline වැඩ කිරීමට නම් ඇප් එකට අත්‍යවශ්‍යම සියලුම ලිපිනයන් (HTML, CSS, Icons) මුලින්ම Cache කළ යුතුය.
const CACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

// INSTALL - මූලික ගොනු සියල්ල තැන්පත් කිරීම
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_ASSETS))
  );
});

// ACTIVATE - පැරණි Cache ඉවත් කිරීම
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

// FETCH - Offline සහ Online අවස්ථා පාලනය
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1. Google Analytics මඟ හැරීම
  if (req.url.includes('googletagmanager.com') || req.url.includes('google-analytics.com')) {
    return;
  }

  // 2. GET requests පමණක් පරීක්ෂා කිරීම
  if (req.method !== 'GET') {
    return;
  }

  // 3. Navigation Requests (පිටු මාරුවීමේදී - Network First සමඟ Offline Fallback)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
          return networkResponse;
        })
        .catch(async () => {
          // Internet නැති විට (Offline) Cache එකෙන් පිටුව ලබා දීම
          const cachedPage = await caches.match(req);
          if (cachedPage) return cachedPage;

          const cachedIndex = await caches.match('./index.html') || await caches.match('./');
          return cachedIndex;
        })
    );
    return;
  }

  // 4. Static Assets - CSS, JS, Images (Cache First සමඟ Offline ආරක්ෂාව)
  event.respondWith(
    caches.match(req)
      .then((cachedResponse) => {
        // Cache එකේ තිබේ නම් එය ලබා දෙයි
        if (cachedResponse) {
          return cachedResponse;
        }

        // Cache එකේ නැත්නම් Internet හරහා ලබා ගෙන Cache එකට දමයි
        return fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
            }
            return networkResponse;
          })
          .catch(() => {
            // ⚠️ Offline වෙලාවක බාහිර JS (html2canvas) එකක් ඉල්ලුවොත්, මෙතැනදී error එකක් නොවී බේරා ගනී
            return new Response('Offline content not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
