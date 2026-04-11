"use strict";

const API_URL = "https://hothothot-api.onrender.com";

window.addEventListener("DOMContentLoaded", () => {
    const btnInstall = document.getElementById("btnInstall");
    if (!btnInstall) return;

    btnInstall.hidden = true;

    let _deferredPrompt = null;

    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        _deferredPrompt = e;
        btnInstall.hidden = false;
        console.log("Install disponible");
    });

    btnInstall.addEventListener("click", async () => {
        if (!_deferredPrompt) return;

        btnInstall.hidden = true;
        _deferredPrompt.prompt();

        const { outcome } = await _deferredPrompt.userChoice;
        console.log("HotHotHot – installation :", outcome);
        _deferredPrompt = null;
    });

    window.addEventListener("appinstalled", () => {
        btnInstall.hidden = true;
        console.log("HotHotHot – app installée");
    });

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/service-worker.js")
            .then(async registration => {
                console.log("HotHotHot – Service Worker enregistré");

                if (!("PushManager" in window)) {
                    console.warn("Push non supporté par ce navigateur");
                    return;
                }

                let vapidPublicKey;
                try {
                    const res  = await fetch(`${API_URL}/vapidPublicKey`);
                    const data = await res.json();
                    vapidPublicKey = data.key;
                } catch (e) {
                    console.error("Impossible de récupérer la clé VAPID :", e);
                    return;
                }

                const existingSub = await registration.pushManager.getSubscription();
                if (existingSub) {
                    const btnNotif = document.getElementById("btnNotif");
                    if (btnNotif) btnNotif.hidden = true;
                    return;
                }

                const btnNotif = document.getElementById("btnNotif");
                if (!btnNotif) return;

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

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}