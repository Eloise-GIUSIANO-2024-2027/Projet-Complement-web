"use strict";

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
            .then(() => console.log("HotHotHot – Service Worker enregistré"))
            .catch(err => console.error("HotHotHot – Erreur SW :", err));
    }
});