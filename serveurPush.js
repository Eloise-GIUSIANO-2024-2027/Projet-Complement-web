"use strict";

const http = require("http");
const webPush = require("web-push");
const dotenv = require("dotenv");

dotenv.config();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const PORT = process.env.PORT || 8300;

webPush.setVapidDetails(
    "mailto:contact@hothothot.fr",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

let subscriptions = [];

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

function sendJson(res, status, obj)
{
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(obj));
}

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

const server = http.createServer(async (req, res) => {
    const url = req.url.split("?")[0];

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

    if (req.method === "GET" && url === "/vapidPublicKey")
    {
        sendJson(res, 200, { key: VAPID_PUBLIC_KEY });
        return;
    }

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

server.listen(PORT, () => console.log(`[HotHotHot] Serveur démarré sur le port ${PORT}`));

module.exports = { broadcastPush };