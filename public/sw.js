// Minimal service worker for PWA installability.
// Network-first for navigations; pass-through for everything else.
// Intentionally avoids aggressive caching to prevent stale builds.

const VERSION = "v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Network-first for HTML navigations
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(VERSION);
        const cached = await cache.match("/");
        return cached || Response.error();
      })
    );
    return;
  }
});
