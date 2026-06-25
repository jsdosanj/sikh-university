/* Sikh University (Astro) service worker — offline app shell + course data.
   Redirect-safe: never returns a redirected response (Safari rejects those for navigations). */
var CACHE = 'su-web-v5';
var CORE = ['/', '/catalog', '/about', '/professors', '/paths', '/search', '/dashboard', '/read', '/santhiya', '/assets/icon.svg', '/assets/icon-192.png', '/assets/apple-touch-icon.png', '/assets/data/professors.json', '/manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE).catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});

// Rebuild a response without the "redirected" flag (which navigations reject).
function clean(res) {
  if (!res || !res.redirected) return res;
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
}
function cacheable(res) { return res && res.ok && !res.redirected && res.type === 'basic'; }

self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url); if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/api/') === 0) return; // never touch APIs
  if (url.pathname.indexOf('/media/') === 0) return; // audio streams direct (range requests); don't cache

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (res) {
      if (cacheable(res)) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
      return clean(res);
    }).catch(function () { return caches.match(req).then(function (h) { return h || caches.match('/'); }); }));
    return;
  }

  if (url.pathname.indexOf('courses.json') !== -1 || url.pathname.indexOf('professors.json') !== -1) {
    e.respondWith(fetch(req).then(function (res) { if (cacheable(res)) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); } return res; }).catch(function () { return caches.match(req); }));
    return;
  }

  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) { if (cacheable(res)) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); } return res; });
  }));
});
