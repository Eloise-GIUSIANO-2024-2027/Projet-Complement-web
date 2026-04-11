"use strict";

const https    = require('https');
const fs       = require('fs');
const path     = require('path');
const webPush  = require('web-push');
import dotenv from 'dotenv';
dotenv.config();

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

webPush.setVapidDetails(
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

let subscriptions = [];

const options = {
    key:  fs.readFileSync(path.join(__dirname, '..', 'certificat localhost', 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'certificat localhost', 'localhost.pem')),
};

const mimeTypes = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
};

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(e); }
        });
    });
}

function sendJson(res, status, obj) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(obj));
}

function broadcastPush(title, body) {
    const payload = JSON.stringify({ title, body });
    subscriptions = subscriptions.filter(() => true);

    subscriptions.forEach((sub, i) => {
        webPush.sendNotification(sub, payload)
            .catch(err => {
                console.error(`[Push] Erreur abonné ${i} :`, err.statusCode);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    subscriptions.splice(i, 1);
                }
            });
    });
}

const server = https.createServer(options, async (req, res) => {
    const url = req.url.split('?')[0];

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin':  '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    if (req.method === 'GET' && url === '/vapidPublicKey') {
        sendJson(res, 200, { key: VAPID_PUBLIC_KEY });
        return;
    }

    if (req.method === 'POST' && url === '/api/subscribe') {
        try {
            const subscription = await parseBody(req);
            const alreadyKnown = subscriptions.some(
                s => s.endpoint === subscription.endpoint
            );
            if (!alreadyKnown) {
                subscriptions.push(subscription);
                console.log('[Push] Nouvel abonné, total :', subscriptions.length);
            }
            sendJson(res, 201, { ok: true });
        } catch (e) {
            sendJson(res, 400, { error: 'Corps invalide' });
        }
        return;
    }

    if (req.method === 'POST' && url === '/api/notify') {
        try {
            const { title, body } = await parseBody(req);
            broadcastPush(title || 'HotHotHot', body || 'Test');
            sendJson(res, 200, { sent: subscriptions.length });
        } catch (e) {
            sendJson(res, 400, { error: 'Corps invalide' });
        }
        return;
    }

    const filePath    = path.join(__dirname, url === '/' ? 'HTML/index.html' : url);
    const ext         = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Fichier non trouvé'); return; }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(8000, () => console.log('https://localhost:8000'));

module.exports = { broadcastPush };