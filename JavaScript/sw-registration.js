(async () => {
    if (!("serviceWorker" in navigator)) {
        console.warn("[SW] Les Service Workers ne sont pas supportés par ce navigateur.");
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register("../service-worker.js");

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
                console.log("[SW] Nouveau Service Worker actif – rechargement de la page.");
                window.location.reload();
            }
        });

        setInterval(() => {
            registration.update();
        }, 60_000);

    } catch (err) {
        console.error("[SW] Échec de l'enregistrement du Service Worker :", err);
    }
})();