const cacheName = "courier-webgl:" + self.registration.scope;
const contentToCache = [
    "Build/Build.loader.js",
    "Build/Build.framework.js",
    "Build/Build.data",
    "Build/Build.wasm",
    "Build/" + "Build.jpg",
    "index.html",
    "TemplateData/style.css",
    "TemplateData/courier-clash-mini-logo.png"
];

self.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    
    e.waitUntil((async function () {
      const cache = await caches.open(cacheName);
      console.log('[Service Worker] Caching all: app shell and content');
      await cache.addAll(contentToCache.map(url => new Request(url, { cache: "reload" })));
      await self.skipWaiting();
    })());
});

self.addEventListener('activate', function (e) {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (e) {
    const request = e.request;
    if (request.method !== "GET" || !request.url.startsWith(self.registration.scope) || request.headers.has("Range")) {
      return;
    }

    // Revalidate hosted builds even when the product version and filenames stay the same.
    const network = fetch(request, { cache: "no-cache" });
    e.waitUntil(network.then(async response => {
      if (!response.ok || response.status === 206) return;
      const copy = response.clone();
      const cache = await caches.open(cacheName);
      await cache.put(request, copy);
    }).catch(() => {}));

    e.respondWith(network.catch(async () => {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") return (await cache.match("index.html")) || Response.error();
      return Response.error();
    }));
});
