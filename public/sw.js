// Boost Hub service worker. It exists mainly so Chrome/Android treats the
// site as installable (having an active fetch handler is part of that
// eligibility check) and to speed up repeat loads a little. It deliberately
// does NOT cache pages, API calls, or Supabase requests -- only hashed
// Next.js static assets (_next/static is immutable, safe to cache forever).
// Caching HTML/API responses here would risk trapping someone on a stale,
// possibly-logged-out version of the app.
const CACHE = 'boosthub-static-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/_next/static/')) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
    )
  );
});
