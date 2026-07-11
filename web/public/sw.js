/* Sikhi University (Astro) service worker — offline app shell + course data.
   Redirect-safe: never returns a redirected response (Safari rejects those for navigations). */
var CACHE = 'su-web-v15';
var CORE = ['/', '/catalog', '/about', '/professors', '/paths', '/search', '/dashboard', '/read', '/santhiya', '/assets/icon.svg', '/assets/icon-192.png', '/assets/apple-touch-icon.png', '/assets/data/professors.json', '/manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE).catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});
// Domain migration: the site's canonical home is sikhiuni.com. A copy of this
// SW installed under a legacy origin would keep serving cached pages there and
// trap returning PWA users on the old domain (its fetch handler follows the
// Worker's 301 internally, so the address bar never moves). On a legacy host,
// unregister and drop caches so the next navigation hits the network and the
// 301 performs a real, visible move to sikhiuni.com.
var LEGACY_HOSTS = ['sikh-university.dosanjhlabs.com', 'sikh-university.jasvant-dosanjh.workers.dev'];
var IS_LEGACY = LEGACY_HOSTS.indexOf(self.location.hostname) !== -1;

self.addEventListener('activate', function (e) {
  if (IS_LEGACY) {
    e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.claim(); }));
    return;
  }
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});

// Rebuild a response without the "redirected" flag (which navigations reject).
function clean(res) {
  if (!res || !res.redirected) return res;
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
}
function cacheable(res) { return res && res.ok && !res.redirected && res.type === 'basic'; }

self.addEventListener('fetch', function (e) {
  if (IS_LEGACY) return; // let navigations hit the network → 301 → sikhiuni.com
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

  if (url.pathname.indexOf('courses.json') !== -1 || url.pathname.indexOf('professors.json') !== -1 || url.pathname.indexOf('/data/') === 0) {
    e.respondWith(fetch(req).then(function (res) { if (cacheable(res)) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); } return res; }).catch(function () { return caches.match(req); }));
    return;
  }

  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) { if (cacheable(res)) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); } return res; });
  }));
});

// Offline course packs (E1): the course page posts its own URL + same-origin images
// here; we add them to the cache so the lesson reads offline. Third-party audio/YouTube
// and the live BaniDB verse viewer are excluded — they need a connection and degrade
// gracefully. Reports back so the button can show a "Saved" state.
self.addEventListener('message', function (e) {
  var d = e.data || {};
  if (d.type === 'cache-pack' && Array.isArray(d.urls)) {
    e.waitUntil(caches.open(CACHE).then(function (c) {
      return Promise.all(d.urls.map(function (u) {
        return fetch(u, { credentials: 'same-origin' }).then(function (res) {
          if (res && res.ok && res.type === 'basic') return c.put(u, res.clone());
        }).catch(function () {});
      }));
    }).then(function () {
      if (e.source) e.source.postMessage({ type: 'pack-cached', id: d.id, ok: true });
    }).catch(function () {
      if (e.source) e.source.postMessage({ type: 'pack-cached', id: d.id, ok: false });
    }));
  }
});
