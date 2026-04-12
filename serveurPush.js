/**
 * serveurPush.js
 * Serveur HTTP backend pour la gestion des notifications push Web.
 *
 * Rôle :
 *  - Expose la clé publique VAPID au client via GET /vapidPublicKey.
 *  - Reçoit et stocke les abonnements push des clients via POST /api/subscribe.
 *  - Permet d'envoyer une notification push à tous les abonnés via POST /api/notify.
 *  - Se connecte au WebSocket des capteurs et envoie automatiquement des notifications
 *    push lorsque la température dépasse les seuils définis.
 *
 * Dépendances :
 *  - web-push : envoi des notifications push via le protocole Web Push.
 *  - dotenv : chargement des variables d'environnement (clés VAPID).
 *  - ws : client WebSocket pour la connexion aux capteurs.
 *
 * Variables d'environnement requises :
 *  - VAPID_PUBLIC_KEY : clé publique VAPID générée pour l'application.
 *  - VAPID_PRIVATE_KEY : clé privée VAPID correspondante.
 *  - PORT : port d'écoute du serveur.
 */
"use strict";

const http = require("http");
const webPush = require("web-push");
const dotenv = require("dotenv");
const WebSocket = require("ws");

dotenv.config();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const PORT = process.env.PORT || 8300;

/** URL du serveur WebSocket des capteurs de température */
const WS_URL = "wss://ws.hothothot.dog:9502";

/** Délai de reconnexion WebSocket en ms */
const RECONNECT_DELAY_MS = 5000;

/**
 * Seuils d'alerte par capteur.
 * Chaque seuil définit une condition, un titre et un message de notification.
 */
const SEUILS = {
    int: [
        { test: t => t < 0,  titre: "Intérieur – Alerte critique", message: "Canalisations gelées, appelez SOS plombier et mettez un bonnet !" },
        { test: t => t < 12, titre: "Intérieur – Attention", message: "Montez le chauffage ou mettez un gros pull !" },
        { test: t => t > 50, titre: "Intérieur – Alerte critique",  message: "Appelez les pompiers ou arrêtez votre barbecue !" },
        { test: t => t > 22, titre: "Intérieur – Attention", message: "Baissez le chauffage !" },
    ],
    ext: [
        { test: t => t < 0,  titre: "Extérieur – Alerte critique", message: "Banquise en vue !" },
        { test: t => t > 35, titre: "Extérieur – Alerte critique", message: "Hot Hot Hot !" },
    ],
};

/**
 * Configuration de web-push avec les clés VAPID.
 * L'adresse mailto est obligatoire pour identifier le serveur émetteur.
 */
webPush.setVapidDetails(
    "mailto:contact@hothothot.fr",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

/** Liste des abonnements push actifs en mémoire */
let subscriptions = [];

/** Dernières alertes envoyées par capteur pour éviter les doublons */
const _lastAlert = { int: null, ext: null };

/**
 * Lit et parse le corps JSON d'une requête HTTP entrante.
 * @param {http.IncomingMessage} req - La requête HTTP.
 * @returns {Promise<object>} Le corps parsé en objet JavaScript.
 */
function parseBody(req)
{
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(e); }
        });
    });
}

/**
 * Envoie une réponse JSON avec les headers CORS appropriés.
 * @param {http.ServerResponse} res - La réponse HTTP.
 * @param {number} status - Le code de statut HTTP.
 * @param {object} obj - L'objet à sérialiser en JSON.
 */
function sendJson(res, status, obj)
{
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(obj));
}

/**
 * Envoie une notification push à tous les abonnés enregistrés.
 * Les abonnements invalides sont ignorés silencieusement.
 * @param {string} title - Titre de la notification.
 * @param {string} body - Corps du message de la notification.
 */
function broadcastPush(title, body)
{
    const payload = JSON.stringify({ title, body });
    subscriptions = subscriptions.filter(sub => {
        webPush.sendNotification(sub, payload)
            .catch(err => {
                console.error("[Push] Erreur :", err.statusCode);
            });
        return true;
    });
}

/**
 * Évalue la température d'un capteur et envoie une notification push
 * si un seuil est dépassé et que l'alerte n'a pas déjà été envoyée.
 * @param {"int"|"ext"} id - Identifiant du capteur.
 * @param {number} temp - Température à évaluer.
 */
function evaluerTemp(id, temp)
{
    for (const seuil of (SEUILS[id] ?? []))
    {
        if (seuil.test(temp))
        {
            if (_lastAlert[id] === seuil.titre)
            {
                return;
            }

            _lastAlert[id] = seuil.titre;
            console.log(`[Push] Alerte ${id} : ${seuil.titre}`);
            broadcastPush(seuil.titre, seuil.message);
            return;
        }
    }

    _lastAlert[id] = null;
}

/**
 * Connexion au WebSocket des capteurs avec reconnexion automatique.
 * Parse les trames reçues et évalue les températures pour déclencher les alertes.
 */
function connecterWebSocket()
{
    console.log("[WS] Connexion à", WS_URL);
    const ws = new WebSocket(WS_URL);

    ws.on("open", () => {
        console.log("[WS] Connecté aux capteurs");
        ws.send("hello");
    });

    ws.on("message", data => {
        try
        {
            const parsed = JSON.parse(data);
            if (!parsed.capteurs || !Array.isArray(parsed.capteurs))
            {
                return;
            }

            parsed.capteurs.forEach(capteur => {
                const id   = capteur.Nom === "interieur" ? "int" : "ext";
                const temp = Number(capteur.Valeur);
                evaluerTemp(id, temp);
            });
        }
        catch (err)
        {
            console.error("[WS] Erreur parsing :", err);
        }
    });

    ws.on("close", () => {
        console.log(`[WS] Connexion fermée, reconnexion dans ${RECONNECT_DELAY_MS / 1000}s…`);
        setTimeout(connecterWebSocket, RECONNECT_DELAY_MS);
    });

    ws.on("error", err => {
        console.error("[WS] Erreur :", err.message);
        ws.terminate();
    });
}

/**
 * Serveur HTTP principal.
 * Routes disponibles :
 *  - GET  /vapidPublicKey : retourne la clé publique VAPID.
 *  - POST /api/subscribe : enregistre un nouvel abonnement push.
 *  - POST /api/notify : envoie une notification à tous les abonnés.
 */
const server = http.createServer(async (req, res) => {
    const url = req.url.split("?")[0];

    /** Gestion du preflight CORS pour les requêtes cross-origin */
    if (req.method === "OPTIONS")
    {
        res.writeHead(204, {
            "Access-Control-Allow-Origin":  "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        });
        res.end();
        return;
    }

    /** Retourne la clé publique VAPID au client pour créer un abonnement push */
    if (req.method === "GET" && url === "/vapidPublicKey")
    {
        sendJson(res, 200, { key: VAPID_PUBLIC_KEY });
        return;
    }

    /** Enregistre un nouvel abonnement push si non déjà connu */
    if (req.method === "POST" && url === "/api/subscribe")
    {
        try
        {
            const subscription = await parseBody(req);
            const alreadyKnown = subscriptions.some(
                s => s.endpoint === subscription.endpoint
            );

            if (!alreadyKnown)
            {
                subscriptions.push(subscription);
                console.log("[Push] Nouvel abonné, total :", subscriptions.length);
            }

            sendJson(res, 201, { ok: true });
        }
        catch (e)
        {
            sendJson(res, 400, { error: "Corps invalide" });
        }
        return;
    }

    /** Déclenche l'envoi d'une notification push à tous les abonnés */
    if (req.method === "POST" && url === "/api/notify")
    {
        try
        {
            const { title, body } = await parseBody(req);
            broadcastPush(title || "HotHotHot", body || "Test");
            sendJson(res, 200, { sent: subscriptions.length });
        }
        catch (e)
        {
            sendJson(res, 400, { error: "Corps invalide" });
        }
        return;
    }

    res.writeHead(404);
    res.end("Route non trouvée");
});

server.listen(PORT, () => {
    console.log(`[HotHotHot] Serveur démarré sur le port ${PORT}`);
    connecterWebSocket();
});

module.exports = { broadcastPush };