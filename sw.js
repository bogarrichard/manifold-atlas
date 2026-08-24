// App-shell cache for offline + installability. Bump CACHE on every release that
// touches a precached file — it's the only invalidation signal there is with no build
// step to fingerprint filenames.
const CACHE = 'atlas-shell-v1';

const SHELL = [
  './',
  'index.html',
  'style.css',
  'manifest.json',
  'engine.js',
  'hub.js',
  'kit.js',
  'icons.js',
  'content/hu.js',
  'content/en.js',
  'content/ja.js',
  'journeys/geometry-flat.js',
  'journeys/geometry-se2.js',
  'journeys/geometry-se3.js',
  'journeys/geometry-sim3.js',
  'journeys/geometry-so2.js',
  'journeys/geometry-so3.js',
  'journeys/optimization-gd.js',
  'journeys/optimization-gn.js',
  'journeys/optimization-lm.js',
  'journeys/slam-factor-graph.js',
  'journeys/slam-pipeline.js',
  'journeys/so3-optimization.js',
  'vendor/three.min.js',
  'pwa-icons/icon-192.png',
  'pwa-icons/icon-512.png',
  'pwa-icons/icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first: everything here is a static, versioned-by-CACHE-name asset, so a hit
// is always correct and a miss falls through to the network (and gets cached for
// next time). ?journey=&lang= are query strings on index.html, not separate files, so
// the shell list above already covers every URL the app actually requests.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
