"use strict";

window.addEventListener("DOMContentLoaded", async () => {

    const btnInstall = document.getElementById("btnInstall");
    if (btnInstall) {
        btnInstall.hidden = true;
        let _deferredPrompt = null;

        window.addEventListener("beforeinstallprompt", (e) => {
            e.preventDefault();
            _deferredPrompt = e;
            btnInstall.hidden = false;
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
        });
    }

    if (!("serviceWorker" in navigator)) {
        console.warn("Service Worker non supporté");
        return;
    }

    const registration = await navigator.serviceWorker.register("/service-worker.js");
    console.log("HotHotHot – Service Worker enregistré");

    if (!("PushManager" in window)) {
        console.warn("Push non supporté par ce navigateur");
        return;
    }

    let vapidPublicKey;
    try {
        const res  = await fetch("/vapidPublicKey");
        const data = await res.json();
        vapidPublicKey = data.key;
    } catch (e) {
        console.error("Impossible de récupérer la clé VAPID :", e);
        return;
    }

    const btnNotif = document.getElementById("btnNotif");
    if (!btnNotif) return;

    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
        btnNotif.hidden = true;
        return;
    }

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

        await fetch("/subscribe", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(subscription),
        });

        btnNotif.hidden = true;
        console.log("HotHotHot – abonnement push enregistré");
    });

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        console.log("HotHotHot – abonnement push créé");
    }

    await fetch("/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(subscription),
    });

    console.log("HotHotHot – abonnement push enregistré sur le serveur");
});

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw     = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}