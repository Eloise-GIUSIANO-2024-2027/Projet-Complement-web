"use strict";

(async () => {
    if (!("serviceWorker" in navigator)) {
        console.warn("[SW] Les Service Workers ne sont pas supportés par ce navigateur.");
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register("/service-worker.js");

        console.log("[SW] Service Worker enregistré avec succès. Scope :", registration.scope);

        registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            console.log("[SW] Nouvelle version détectée, installation en cours…");

            newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("[SW] Nouvelle version installée, activation immédiate.");
                    newWorker.postMessage({ type: "SKIP_WAITING" });
                }
            });
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });

        setInterval(() => registration.update(), 60_000);

        if (!("Notification" in window)) return;

        let permission = Notification.permission;

        if (permission === "default") {
            permission = await Notification.requestPermission();
        }

        if (permission === "granted") {
            const sw = await navigator.serviceWorker.ready;
            sw.active?.postMessage("START_WS");

            setInterval(() => {
                sw.active?.postMessage("KEEP_ALIVE");
            }, 15_000);
        }

    } catch (err) {
        console.error("[SW] Échec de l'enregistrement du Service Worker :", err);
    }
})();