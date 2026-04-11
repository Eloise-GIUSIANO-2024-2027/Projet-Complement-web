/**
 * pwa.js
 * Gestion de l'installation de l'application en mode PWA (Progressive Web App).
 * Affiche un bouton d'installation lorsque le navigateur déclenche l'événement
 * "beforeinstallprompt", et enregistre le Service Worker.
 */
"use strict";

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
     */
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/service-worker.js")
            .then(() => console.log("HotHotHot – Service Worker enregistré"))
            .catch(err => console.error("HotHotHot – Erreur SW :", err));
    }
});