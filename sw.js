/* WarGames service worker — makes the app installable and usable offline.
   Bump VERSION whenever site files change so phones pick up the update. */
const VERSION = 'wargames-v1';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/data.js', 'js/model.js', 'js/map.js', 'js/sim.js', 'js/analysis.js', 'js/wargame.js', 'js/app.js',
  'data/countries-50m.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js',
  'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for our own files (so updates show up), cache-first for CDN libraries & fonts.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === location.origin;
  if (sameOrigin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
    );
  } else {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
