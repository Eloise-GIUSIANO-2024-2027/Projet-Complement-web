/**
 * service-worker.js
 * Service Worker de l'application HotHotHot.
 *
 * Rôles :
 *  - Mise en cache des ressources statiques pour le fonctionnement hors ligne.
 *  - Interception des requêtes réseau (stratégie Network First pour la navigation,
 *    Cache First pour les ressources statiques).
 *  - Réception et affichage des notifications push.
 *  - Gestion du clic sur une notification (focus ou ouverture de l'application).
 *
 * Stratégie de cache :
 *  - Navigation (HTML) : réseau en priorité, cache en fallback, page offline en dernier recours.
 *  - Ressources (CSS, JS, images) : cache en priorité, réseau en fallback avec mise en cache.
 */
"use strict";

/** Nom du cache courant — à incrémenter à chaque déploiement pour forcer la mise à jour */
const CACHE_NAME = "hothothot-v14";

/** URL de la page affichée lorsque l'utilisateur est hors ligne */
const OFFLINE_URL = "/HTML/offline.html";

/** Liste des ressources mises en cache lors de l'installation du Service Worker */
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

/**
 * Événement "install" : pré-cache toutes les ressources listées dans FILES_TO_CACHE.
 * skipWaiting() force l'activation immédiate sans attendre la fermeture des onglets existants.
 */
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();
});

/**
 * Événement "activate" : supprime les anciens caches dont le nom diffère de CACHE_NAME.
 * clients.claim() permet au Service Worker de prendre le contrôle immédiatement
 * sans attendre un rechargement de page.
 */
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
            ))
            .then(() => self.clients.claim())
    );
});

/**
 * Événement "fetch" : intercepte toutes les requêtes réseau.
 * - Les requêtes WebSocket sont ignorées.
 * - Les requêtes cross-origin sont ignorées.
 * - Les requêtes non-GET sont ignorées.
 * - Navigation : Network First avec fallback cache puis page offline.
 * - Ressources : Cache First avec fallback réseau et mise en cache de la réponse.
 */
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

/**
 * Événement "message" : permet à la page de communiquer avec le Service Worker.
 * SKIP_WAITING : force l'activation immédiate d'un nouveau Service Worker en attente.
 */
self.addEventListener("message", event => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

/**
 * Événement "push" : reçoit une notification push envoyée par le serveur.
 * Affiche la notification avec le titre et le corps reçus,
 * ou des valeurs par défaut si les données sont absentes ou invalides.
 */
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

/**
 * Événement "notificationclick" : gère le clic sur une notification push.
 * Si un onglet de l'application est déjà ouvert, le met au premier plan.
 * Sinon, ouvre un nouvel onglet sur la page d'accueil.
 */
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