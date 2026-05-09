// Service Worker cache strategy:
// - HTML navigations: network-first (so updates arrive immediately), fallback to cached/offline
// - Static assets (css/js/fonts/images/lst): stale-while-revalidate (fast + auto-update)
//
// Keep cache names stable and always refresh when online, so users receive the newest version
// without needing to manually clear cache.

const CACHE_PREFIX = "radio-dinle";
const CACHE_CORE = `${CACHE_PREFIX}:core`;
const CACHE_RUNTIME = `${CACHE_PREFIX}:runtime`;
const OFFLINE_URL = "./offline.html";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./version.json",
  "./appIcon/Radio.ico",
  "./appIcon/Radio512.png",
  "./appIcon/Radio192.png",
  "./appIcon/FavIcon-Radio.32.png",
  "./fonts/digital.ttf",
  "./fonts/amanda.ttf",
  OFFLINE_URL,
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_CORE);
      await cache.addAll(CORE_ASSETS);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (!name.startsWith(CACHE_PREFIX)) return null;
          if (name !== CACHE_CORE && name !== CACHE_RUNTIME) return caches.delete(name);
          return null;
        })
      );
    })()
  );
});

function isSameOrigin(requestUrl) {
  try {
    return new URL(requestUrl).origin === self.location.origin;
  } catch {
    return false;
  }
}

function isStaticAsset(url) {
  return (
    /\.(?:css|js|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|otf|json|lst|m3u|m3u8)(?:\?|#|$)/i.test(url)
  );
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_RUNTIME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await fetchPromise) || cached;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_CORE);
  try {
    const res = await fetch(request, { cache: "no-store" });
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    return cached || (await cache.match("./index.html")) || (await cache.match(OFFLINE_URL));
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = req.url || "";

  // Only handle GET requests; let POST etc. pass through.
  if (req.method !== "GET") return;
  if (!isSameOrigin(url)) return;

  // Navigations (new page loads)
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Static assets (including ?v= cache busters)
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});
