/**
 * pwa.js
 * Gestion de l'installation de l'application en mode PWA (Progressive Web App).
 * Affiche un bouton d'installation lorsque le navigateur déclenche l'événement
 * "beforeinstallprompt", enregistre le Service Worker, et gère l'abonnement
 * aux notifications push via l'API VAPID.
 */
"use strict";

/** URL de base de l'API backend hébergée sur Render */
const API_URL = "https://hothothot-api.onrender.com";

window.addEventListener("DOMContentLoaded", () => {
    const btnInstall = document.getElementById("btnInstall");
    if (!btnInstall) return;

    btnInstall.hidden = true;

    /** Stocke l'événement d'invite d'installation pour le déclencher plus tard */
    let _deferredPrompt = null;

    /**
     * L'événement "beforeinstallprompt" est déclenché par le navigateur
     * quand les critères d'installation PWA sont remplis.
     * On le capture et on affiche le bouton d'installation.
     */
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        _deferredPrompt = e;
        btnInstall.hidden = false;
        console.log("Install disponible");
    });

    /**
     * Au clic sur le bouton, on déclenche l'invite d'installation native
     * et on attend le choix de l'utilisateur.
     */
    btnInstall.addEventListener("click", async () => {
        if (!_deferredPrompt) return;

        btnInstall.hidden = true;
        _deferredPrompt.prompt();

        const { outcome } = await _deferredPrompt.userChoice;
        console.log("HotHotHot – installation :", outcome);
        _deferredPrompt = null;
    });

    /**
     * L'événement "appinstalled" confirme que l'installation s'est bien déroulée.
     */
    window.addEventListener("appinstalled", () => {
        btnInstall.hidden = true;
        console.log("HotHotHot – app installée");
    });

    /**
     * Enregistrement du Service Worker pour la mise en cache et le fonctionnement hors-ligne.
     * Uniquement si l'API est supportée par le navigateur.
     * Une fois enregistré, on initialise également l'abonnement aux notifications push.
     */
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/service-worker.js")
            .then(async registration => {
                console.log("HotHotHot – Service Worker enregistré");

                /**
                 * Vérifie que le navigateur supporte l'API Push.
                 * Si ce n'est pas le cas, on arrête ici.
                 * (clause de guard)
                 */
                if (!("PushManager" in window)) {
                    console.warn("Push non supporté par ce navigateur");
                    return;
                }

                /**
                 * Récupère la clé publique VAPID depuis le serveur backend.
                 * Cette clé est nécessaire pour créer un abonnement push sécurisé.
                 */
                let vapidPublicKey;
                try {
                    const res  = await fetch(`${API_URL}/vapidPublicKey`);
                    const data = await res.json();
                    vapidPublicKey = data.key;
                } catch (e) {
                    console.error("Impossible de récupérer la clé VAPID :", e);
                    return;
                }

                /**
                 * Si l'utilisateur est déjà abonné aux notifications push,
                 * on cache le bouton de notification car il est inutile.
                 */
                const existingSub = await registration.pushManager.getSubscription();
                if (existingSub) {
                    const btnNotif = document.getElementById("btnNotif");
                    if (btnNotif) btnNotif.hidden = true;
                    return;
                }

                const btnNotif = document.getElementById("btnNotif");
                if (!btnNotif) return;

                /**
                 * Au clic sur le bouton de notification :
                 * 1. On demande la permission à l'utilisateur
                 * 2. On crée un abonnement push avec la clé VAPID
                 * 3. On envoie cet abonnement au serveur pour qu'il puisse envoyer des notifications
                 */
                btnNotif.addEventListener("click", async () => {
                    const permission = await Notification.requestPermission();
                    if (permission !== "granted") {
                        alert("Permission refusée, les notifications sont désactivées.");
                        return;
                    }

                    let subscription = await registration.pushManager.getSubscription();
                    if (!subscription) {
                        subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                        });
                    }

                    await fetch(`${API_URL}/api/subscribe`, {
                        method:  "POST",
                        headers: { "Content-Type": "application/json" },
                        body:    JSON.stringify(subscription),
                    });

                    btnNotif.hidden = true;
                    console.log("HotHotHot – abonnement push enregistré");
                });
            })
            .catch(err => console.error("HotHotHot – Erreur SW :", err));
    }
});

/**
 * Convertit une clé VAPID encodée en base64 URL-safe en Uint8Array.
 * Nécessaire pour l'API PushManager.subscribe().
 * @param {string} base64String - La clé publique VAPID en base64
 * @returns {Uint8Array} - La clé convertie
 */
function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}