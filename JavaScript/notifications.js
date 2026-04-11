"use strict";

const Notifications = (() => {
    const _defaults = {
        position: "topRight",
        timeout: 5000,
        progressBar: true,
        closeOnEscape: true,
        displayMode: 2,
    };

    function _check() {
        if (typeof iziToast === "undefined") {
            console.warn("iziToast n'est pas chargé.");
            return false;
        }
        return true;
    }

    function afficher(niveau, message, titre) {
        if (!_check()) return;
        const fn = niveau === "error" ? "error" : "warning";
        iziToast[fn]({ ..._defaults, title: titre, message });
    }

    function info(message, titre = "Info") {
        if (!_check()) return;
        iziToast.info({ ..._defaults, title: titre, message });
    }

    function succes(message, titre = "Succès") {
        if (!_check()) return;
        iziToast.success({ ..._defaults, title: titre, message });
    }

    function avertissement(message, titre = "Attention") {
        if (!_check()) return;
        iziToast.warning({ ..._defaults, title: titre, message });
    }

    function erreur(message, titre = "Erreur") {
        if (!_check()) return;
        iziToast.error({ ..._defaults, title: titre, message });
    }

    return { afficher, info, succes, avertissement, erreur };
})();

if ("SharedWorker" in window) {
    const worker = new SharedWorker("/JavaScript/shared-worker.js");

    worker.port.addEventListener("message", event => {
        const { type, niveau, titre, message } = event.data;

        if (type === "TEMP_ALERT") {
            Notifications.afficher(niveau, message, titre);
        }
    });

    worker.port.start();

    window.SharedWorkerPort = worker.port;

    window.addEventListener("pagehide", () => {
        worker.port.postMessage("DISCONNECT");
    });
}