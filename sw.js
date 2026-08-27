// App-shell cache for offline + installability. Bump CACHE on every release that
// touches a precached file — it's the only invalidation signal there is with no build
// step to fingerprint filenames.
const CACHE = 'atlas-shell-v2';

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

/* Local dev: this worker deletes itself instead of caching anything.

   index.html carries its own "don't register on localhost" guard, but that guard alone
   cannot break an install that already happened: a controlling worker serves index.html
   from its own cache, and a cached copy that predates the guard still contains the old
   unconditional registration — so the stale page re-registers the worker and the worker
   re-serves the stale page, each keeping the other alive. No edit to index.html can reach
   a browser stuck in that loop, because index.html is exactly what is being served stale.

   The worker script is the one file that is never answered from this cache — the browser
   revalidates it against the network on its own update checks — so it is the only place a
   kill switch is guaranteed to arrive. Deleting the caches, unregistering, and then
   navigating every controlled tab completes the teardown without anyone clearing site
   data by hand. Registering no fetch handler leaves every request going straight to the
   network, which is what the no-build-step dev loop (`python3 serve.py`) expects. */
const LOOPBACK = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);

if (LOOPBACK) {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', e => {
    e.waitUntil(
      caches
        .keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll({type: 'window'}))
        .then(clients => clients.forEach(c => c.navigate(c.url)))
    );
  });
} else {
  /* Layout data is precached one file at a time with each failure swallowed, rather than
   being listed in SHELL: addAll() rejects the whole install if any one entry 404s, so a
   single missing layout file would cost the site its service worker — and with it offline
   support for everything else. Journeys keep their layout in layouts/<id>.json, so these
   are needed offline; layouts.json is the optional override on top. The list is derived
   from SHELL's journey scripts rather than written out again, since a worker cannot read
   the journey registry and one hand-kept copy of those ids is enough. */
  const LAYOUTS = ['layouts.json'].concat(
    SHELL.filter(p => p.startsWith('journeys/')).map(p =>
      p.replace(/^journeys\/(.*)\.js$/, 'layouts/$1.json')
    )
  );

  self.addEventListener('install', e => {
    e.waitUntil(
      caches
        .open(CACHE)
        .then(c =>
          c.addAll(SHELL).then(() => Promise.all(LAYOUTS.map(u => c.add(u).catch(() => {}))))
        )
        .then(() => self.skipWaiting())
    );
  });

  self.addEventListener('activate', e => {
    e.waitUntil(
      caches
        .keys()
        .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim())
    );
  });

  // The one URL every navigation resolves to. `'./'` in SHELL above precaches exactly this.
  const SHELL_URL = new URL('./', self.location).href;

  // Cache-first: everything here is a static, versioned-by-CACHE-name asset, so a hit is
  // always correct and a miss falls through to the network (and gets cached for next time).
  self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    if (url.origin !== self.location.origin) return;

    /* Navigations are matched against SHELL_URL explicitly rather than against the request.
     They always carry a query here (`?journey=…&lang=…`), and caches.match() keys on the
     FULL url — query string included — so `/?journey=geometry-se3` does NOT match the
     precached `./`. The old code therefore treated every journey/language URL as a cache
     miss: it went to the network and was then stored under its own key. That put each
     such URL on its own vintage, frozen whenever it was first visited, while the no-query
     assets (engine.js, style.css, …) stayed frozen at *install* time. Any edit between
     those two moments shipped a mismatched pair — most visibly a fresh index.html whose
     markup the stale engine.js knows nothing about, so a control declared in one and
     wired up in the other renders as an empty section, on some journey URLs but not
     others. Collapsing every navigation onto the single precached shell restores what a
     version-named app-shell cache is for: one vintage, replaced atomically by a CACHE
     bump. Navigations are also never written back to the cache — `./` already is it. */
    if (e.request.mode === 'navigate') {
      e.respondWith(caches.match(SHELL_URL).then(hit => hit || fetch(e.request)));
      return;
    }

    e.respondWith(
      caches.match(e.request).then(
        hit =>
          hit ||
          fetch(e.request).then(res => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then(c => c.put(e.request, copy));
            }
            return res;
          })
      )
    );
  });
} // end !LOOPBACK
