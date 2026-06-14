/* Sikh University (Astro) service worker — offline app shell + course data. */
var CACHE = 'su-web-v1';
var CORE = ['/', '/index.html', '/catalog.html', '/about.html', '/professors.html', '/paths.html', '/search.html', '/dashboard.html', '/assets/icon.svg', '/assets/data/courses.json', '/assets/data/professors.json', '/manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE).catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url); if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/api/') === 0) return; // never cache APIs
  if (url.pathname.indexOf('courses.json') !== -1 || url.pathname.indexOf('professors.json') !== -1) {
    e.respondWith(fetch(req).then(function (r) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); return r; }).catch(function () { return caches.match(req); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (r) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); return r; }).catch(function () { return caches.match('/index.html'); });
  }));
});
