/**
 * notifications.js
 * Module encapsulé (IIFE) pour afficher des notifications toast via la librairie iziToast.
 * Expose une API publique avec des méthodes par niveau (info, succès, avertissement, erreur).
 *
 * Dépendance externe requise : iziToast (https://izitoast.marcelodolce.com/)
 */
"use strict";

const Notifications = (() => {
    const _defaults = {
        position: "topRight",
        timeout: 5000,
        progressBar: true,
        closeOnEscape: true,
        displayMode: 2,
    };
    /**
     * Vérifie que iziToast est bien chargé avant tout appel.
     * @returns {boolean} false si iziToast est absent, true sinon.
     */
    function _check() {
        if (typeof iziToast === "undefined") {
            console.warn("[Notifications] iziToast n'est pas chargé.");
            return false;
        }
        return true;
    }
    /**
     * Affiche une notification de type "error" ou "warning" selon le niveau passé.
     * @param {"error"|"warning"} niveau - Type de notification.
     * @param {string} message - Corps du message.
     * @param {string} titre   - Titre de la notification.
     */
    function afficher(niveau, message, titre) {
        if (!_check()) return;
        iziToast[niveau === "error" ? "error" : "warning"]({ ..._defaults, title: titre, message });
    }

    /**
     * Affiche une notification informative (bleue).
     * @param {string} message
     * @param {string} [titre="Info"]
     */
    function info(message, titre = "Info") {
        if (!_check()) return;
        iziToast.info({ ..._defaults, title: titre, message });
    }

    /**
     * Affiche une notification de succès (verte).
     * @param {string} message
     * @param {string} [titre="Succès"]
     */
    function succes(message, titre = "Succès") {
        if (!_check()) return;
        iziToast.success({ ..._defaults, title: titre, message });
    }
    /**
     * Affiche une notification d'avertissement (jaune).
     * @param {string} message
     * @param {string} [titre="Attention"]
     */
    function avertissement(message, titre = "Attention") {
        if (!_check()) return;
        iziToast.warning({ ..._defaults, title: titre, message });
    }
    /**
     * Affiche une notification d'erreur (rouge).
     * @param {string} message
     * @param {string} [titre="Erreur"]
     */
    function erreur(message, titre = "Erreur") {
        if (!_check()) return;
        iziToast.error({ ..._defaults, title: titre, message });
    }

    return { afficher, info, succes, avertissement, erreur };
})();