"use strict";

const CACHE_NAME = "hothothot-v14";
const OFFLINE_URL = "/HTML/offline.html";

const FILES_TO_CACHE = [
    "/HTML/index.html",
    "/HTML/doc.html",
    "/HTML/install.html",
    "/HTML/compte.html",
    "/JavaScript/tableau.js",
    "/JavaScript/notifications.js",
    "/JavaScript/shared-worker.js",
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

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
            ))
            .then(() => self.clients.claim())
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
                .catch(() =>
                    caches.match(request).then(cached => cached ?? caches.match(OFFLINE_URL))
                )
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(response => {
                if (response?.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            }).catch(() => new Response("Ressource non disponible hors ligne.", {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
            }));
        })
    );
});

self.addEventListener("message", event => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

self.addEventListener("push", event => {
    let data = { title: "HotHotHot", body: "Nouvelle alerte !" };

    if (event.data) {
        try { data = event.data.json(); }
        catch { data.body = event.data.text(); }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: "/Icons/icon-192.png",
            badge: "/Icons/icon-192.png",
            tag: "hothothot-alerte",
        })
    );
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