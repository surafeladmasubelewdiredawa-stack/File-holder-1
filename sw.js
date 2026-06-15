const CACHE_NAME = 'doc-hub-v2';
const URLS_TO_CACHE = [
  './',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap'
];

// Install: Cache all essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching app shell');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Fetch: Serve from Cache if offline, else fetch from network
self.addEventListener('fetch', event => {
  // Don't cache Firebase database calls or Cloudinary uploads
  if (event.request.url.includes('firebaseio.com') || event.request.url.includes('cloudinary.com') || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Return cache if found, else try network
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // If valid, clone and put in cache for future
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => {
        // If offline and not in cache, return simple offline page
        if (event.request.mode === 'navigate') {
          return caches.match('./');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});