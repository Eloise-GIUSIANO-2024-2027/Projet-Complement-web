const CACHE_NAME = "hothothot-v8";
const OFFLINE_URL = "/HTML/offline.html";

const FILES_TO_CACHE = [
    "/HTML/index.html",
    "/CSS/style.css",
    "/JavaScript/eventEmitter.js",
    "/JavaScript/model.js",
    "/JavaScript/view.js",
    "/JavaScript/historique.js",
    "/JavaScript/controller.js",
    "/JavaScript/pwa.js",
    "/manifest.json",
    "/Icons/icon-192.png",
    "/Icons/icon-512.png",
    "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js",
    OFFLINE_URL
];

self.addEventListener("install", (event) => {
    console.log("[SW] Installation…");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES_TO_CACHE);
        }).then(() => {
            console.log("[SW] Page offline mise en cache");
        }).catch((err) => {
            console.error("[SW] Erreur lors de l'installation :", err);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    console.log("[SW] Activation…");
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log("[SW] Suppression ancien cache :", name);
                        return caches.delete(name);
                    })
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (url.protocol === "wss:" || url.protocol === "ws:") return;

    if (url.origin !== self.location.origin) return;
    if (request.method !== "GET") return;

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((cached) => {
                        if (cached) return cached;
                        return caches.match(OFFLINE_URL);
                    });
                })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    return new Response("Ressource non disponible hors ligne.", {
                        status: 503,
                        headers: { "Content-Type": "text/plain; charset=utf-8" },
                    });
                });
        })
    );
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});