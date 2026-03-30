"use strict";

const CACHE_NAME = "hothothot-v1";

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
    "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(FILES_TO_CACHE))
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request))
    );
});