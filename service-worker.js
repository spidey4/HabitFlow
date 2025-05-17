// service-worker.js
const CACHE_NAME = 'habitflow-vanilla-cache-v1';
const urlsToCache = [
  '.', // Cache-uiește directorul curent (index.html dacă e setat ca default)
  'index.html',
  'manifest.json',
  // Adaugă aici căi către imagini, fonturi locale dacă le folosești, etc.
  // De ex: 'icons/icon-192x192.png', 'icons/icon-512x512.png'
  // Momentan, Tailwind și Poppins sunt luate prin CDN, deci nu trebuie adăugate aici.
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache deschis, adăugare fișiere app shell');
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'}))); // Forțează reîncărcarea din rețea la instalare
      })
      .catch(err => {
        console.error("[Service Worker] Eroare la adăugarea în cache:", err);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Ștergere cache vechi:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Se concentrează pe cache-first pentru resursele definite
  if (urlsToCache.some(url => event.request.url.endsWith(url.replace(/^\.?\//, '')) || event.request.url === self.registration.scope)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response; // Servește din cache
          }
          // Încearcă să obții din rețea și adaugă în cache
          return fetch(event.request).then(
            networkResponse => {
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'default') {
                return networkResponse;
              }
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              return networkResponse;
            }
          );
        })
        .catch(() => {
          // Opțional: returnează o pagină offline de fallback dacă fetch-ul eșuează și nu e în cache
          // if (event.request.mode === 'navigate') return caches.match('offline.html');
        })
    );
  } else {
    // Pentru alte request-uri (ex: API-uri externe, CDN-uri care nu sunt în urlsToCache), folosește strategia network-first sau network-only
    event.respondWith(
        fetch(event.request).catch(() => { /* Ocupă-te de erori de rețea cum dorești */ })
    );
  }
});
