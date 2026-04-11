/**
 * sw-registration.js
 * Enregistrement et mise à jour automatique du Service Worker.
 *
 * Fonctionnement :
 *  1. Enregistre "/service-worker.js" dès le chargement de la page.
 *  2. Détecte les mises à jour disponibles et les applique immédiatement
 *     via le message SKIP_WAITING, sans attendre la fermeture de tous les onglets.
 *  3. Recharge la page dès que le nouveau Service Worker prend le contrôle,
 *     pour garantir que l'utilisateur utilise toujours la version la plus récente.
 */
"use strict";

(async () => {
    if (!("serviceWorker" in navigator)) {
        console.warn("[SW] Les Service Workers ne sont pas supportés par ce navigateur.");
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register("/service-worker.js");
        console.log("[SW] Enregistré. Scope :", registration.scope);
        /**
         * Détection d'une mise à jour disponible.
         * "updatefound" est déclenché quand le navigateur télécharge un nouveau SW.
         */
        registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            /**
             * Suivi de l'état d'installation du nouveau Service Worker.
             * Quand il est installé ET qu'un ancien SW contrôle déjà la page,
             * on lui envoie SKIP_WAITING pour qu'il prenne le contrôle immédiatement.
             */
            newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    newWorker.postMessage({ type: "SKIP_WAITING" });
                }
            });
        });
        /**
         * "controllerchange" est déclenché quand le nouveau SW devient actif.
         * On recharge la page pour que les ressources mises en cache soient à jour.
         * Le flag "refreshing" évite les rechargements multiples en cascade.
         */
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