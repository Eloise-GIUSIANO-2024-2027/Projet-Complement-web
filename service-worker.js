"use strict";

const CACHE_NAME = "hothothot-v13";
const OFFLINE_URL = "/HTML/offline.html";

const FILES_TO_CACHE = [
    "/HTML/index.html",
    "/HTML/doc.html",
    "/HTML/install.html",
    "/HTML/compte.html",
    "/JavaScript/tableau.js",
    "/JavaScript/notifications.js",
    "/JavaScript/nav.js",
    "/JavaScript/pwa.js",
    "/JavaScript/sw-registration.js",
    "/manifest.json",
    "/Icons/icon-192.png",
    "/Icons/icon-512.png",
    "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/izitoast/1.4.0/css/iziToast.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/izitoast/1.4.0/js/iziToast.min.js",
    OFFLINE_URL
];

const WS_URL = "wss://ws.hothothot.dog:9502";
const RECONNECT_DELAY_MS = 5000;

const SEUILS = {
    int: [
        { test: t => t < 0,  tag: "int-gel",   titre: "Intérieur – Alerte critique", message: "Canalisations gelées, appelez SOS plombier et mettez un bonnet !" },
        { test: t => t < 12, tag: "int-froid", titre: "Intérieur – Attention",       message: "Montez le chauffage ou mettez un gros pull !" },
        { test: t => t > 50, tag: "int-feu",   titre: "Intérieur – Alerte critique", message: "Appelez les pompiers ou arrêtez votre barbecue !" },
        { test: t => t > 22, tag: "int-chaud", titre: "Intérieur – Attention",       message: "Baissez le chauffage !" },
    ],
    ext: [
        { test: t => t < 0,  tag: "ext-gel",   titre: "Extérieur – Alerte critique", message: "Banquise en vue !" },
        { test: t => t > 35, tag: "ext-chaud", titre: "Extérieur – Alerte critique", message: "Hot Hot Hot !" },
    ],
};

let _ws = null;
let _lastTag = { int: null, ext: null };

function _evaluerTemp(id, temp) {
    const seuils = SEUILS[id] ?? [];

    for (const seuil of seuils) {
        if (seuil.test(temp)) {
            if (_lastTag[id] === seuil.tag) return;
            _lastTag[id] = seuil.tag;

            self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
                if (clients.length > 0) {
                    clients.forEach(client => client.postMessage({
                        type: "TEMP_ALERT",
                        niveau: seuil.niveau,
                        titre: seuil.titre,
                        message: seuil.message,
                    }));
                } else {
                    self.registration.showNotification(seuil.titre, {
                        body: seuil.message,
                        tag: seuil.tag,
                        renotify: true,
                        icon: "/Icons/icon-192.png",
                        badge: "/Icons/icon-96.png",
                    });
                }
            });
            return;
        }
    }

    _lastTag[id] = null;
}

function _handleMessage(rawData) {
    try {
        const parsed = JSON.parse(rawData);
        if (parsed.capteurs && Array.isArray(parsed.capteurs)) {
            parsed.capteurs.forEach(capteur => {
                const id = capteur.Nom === "interieur" ? "int" : "ext";
                _evaluerTemp(id, Number(capteur.Valeur));
            });
        }
    } catch (err) {
        console.error("[SW] Erreur parsing WebSocket :", err);
    }
}

function _connectWs() {
    if (_ws && (_ws.readyState === WebSocket.CONNECTING || _ws.readyState === WebSocket.OPEN)) {
        return;
    }

    _ws = new WebSocket(WS_URL);

    _ws.addEventListener("open", () => {
        _ws.send("hello");
    });

    _ws.addEventListener("message", event => {
        _handleMessage(event.data);
    });

    _ws.addEventListener("close", () => {
        setTimeout(_connectWs, RECONNECT_DELAY_MS);
    });

    _ws.addEventListener("error", () => {
        _ws.close();
    });
}

function _keepAlive() {
    setInterval(() => {
        self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ type: "SW_PING" }));
        });

        if (_ws && _ws.readyState === WebSocket.OPEN) {
            _ws.send("ping");
        } else if (!_ws || _ws.readyState === WebSocket.CLOSED) {
            _connectWs();
        }
    }, 20_000);
}

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            )
        ).then(() => {
            self.clients.claim();
            _connectWs();
            _keepAlive();
        })
    );
});

self.addEventListener("fetch", event => {
    const { request } = event;
    const url = new URL(request.url);

    if (url.protocol === "wss:" || url.protocol === "ws:") return;
    if (url.origin !== self.location.origin) return;
    if (request.method !== "GET") return;

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then(cached => {
                        if (cached) return cached;
                        return caches.match(OFFLINE_URL);
                    });
                })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;

            return fetch(request)
                .then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
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

self.addEventListener("message", event => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }

    if (event.data === "START_WS" && (!_ws || _ws.readyState === WebSocket.CLOSED)) {
        _connectWs();
    }

    if (event.data === "KEEP_ALIVE") {
        if (!_ws || _ws.readyState === WebSocket.CLOSED) {
            _connectWs();
        }
    }
});

self.addEventListener("notificationclick", event => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes("/HTML/index.html") && "focus" in client) {
                    return client.focus();
                }
            }
            return self.clients.openWindow("/HTML/index.html");
        })
    );
});