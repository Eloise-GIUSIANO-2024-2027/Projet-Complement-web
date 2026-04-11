"use strict";

(async () => {
    if (!("serviceWorker" in navigator)) {
        console.warn("[SW] Les Service Workers ne sont pas supportés par ce navigateur.");
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register("/service-worker.js");
        console.log("[SW] Enregistré. Scope :", registration.scope);

        registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
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

    } catch (err) {
        console.error("[SW] Échec de l'enregistrement :", err);
    }
})();