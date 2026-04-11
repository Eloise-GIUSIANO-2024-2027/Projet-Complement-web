"use strict";

const WS_URL = "wss://ws.hothothot.dog:9502";
const RECONNECT_DELAY_MS = 5000;

const SEUILS = {
    int: [
        { test: t => t < 0,  tag: "int-gel",   niveau: "error",   titre: "Intérieur – Alerte critique", message: "Canalisations gelées, appelez SOS plombier et mettez un bonnet !" },
        { test: t => t < 12, tag: "int-froid", niveau: "warning", titre: "Intérieur – Attention",       message: "Montez le chauffage ou mettez un gros pull !" },
        { test: t => t > 50, tag: "int-feu",   niveau: "error",   titre: "Intérieur – Alerte critique", message: "Appelez les pompiers ou arrêtez votre barbecue !" },
        { test: t => t > 22, tag: "int-chaud", niveau: "warning", titre: "Intérieur – Attention",       message: "Baissez le chauffage !" },
    ],
    ext: [
        { test: t => t < 0,  tag: "ext-gel",   niveau: "error",   titre: "Extérieur – Alerte critique", message: "Banquise en vue !" },
        { test: t => t > 35, tag: "ext-chaud", niveau: "error",   titre: "Extérieur – Alerte critique", message: "Hot Hot Hot !" },
    ],
};

const _ports = new Set();
let _ws = null;
let _reconnectTimer = null;
let _lastTag = { int: null, ext: null };
let _lastData = null;
let _wsStatus = "closed";


function _broadcast(data) {
    for (const port of [..._ports]) {
        try {
            port.postMessage(data);
        } catch {
            _ports.delete(port);
        }
    }
}

function _evaluerTemp(id, temp) {
    const seuils = SEUILS[id] ?? [];
    for (const seuil of seuils) {
        if (seuil.test(temp)) {
            if (_lastTag[id] === seuil.tag) return;
            _lastTag[id] = seuil.tag;
            _broadcast({ type: "TEMP_ALERT", niveau: seuil.niveau, titre: seuil.titre, message: seuil.message });
            return;
        }
    }
    _lastTag[id] = null;
}

function _handleMessage(rawData) {
    try {
        const parsed = JSON.parse(rawData);
        if (parsed.capteurs && Array.isArray(parsed.capteurs)) {
            _lastData = parsed;
            _broadcast({ type: "SENSOR_DATA", data: parsed });
            parsed.capteurs.forEach(capteur => {
                const id = capteur.Nom === "interieur" ? "int" : "ext";
                _evaluerTemp(id, Number(capteur.Valeur));
            });
        }
    } catch (err) {
        console.error("[SharedWorker] Erreur parsing :", err);
    }
}

function _scheduleReconnect() {
    if (_reconnectTimer !== null) return; // déjà planifié
    _reconnectTimer = setTimeout(() => {
        _reconnectTimer = null;
        if (_ports.size > 0) {
            _connect();
        }
    }, RECONNECT_DELAY_MS);
}

function _connect() {
    if (_ws && (_ws.readyState === WebSocket.CONNECTING || _ws.readyState === WebSocket.OPEN)) {
        return;
    }

    _wsStatus = "connecting";
    _broadcast({ type: "WS_STATUS", status: "connecting" });

    _ws = new WebSocket(WS_URL);

    _ws.addEventListener("open", () => {
        _ws.send("hello");
        _wsStatus = "connected";
        _broadcast({ type: "WS_STATUS", status: "connected" });
    });


    _ws.addEventListener("message", event => {
        _handleMessage(event.data);
    });

    _ws.addEventListener("close", () => {
        _wsStatus = "closed";
        _broadcast({ type: "WS_STATUS", status: "closed" });
        _scheduleReconnect();
    });

    _ws.addEventListener("error", () => {
        _wsStatus = "error";
        _broadcast({ type: "WS_STATUS", status: "error" });
        _ws.close();
    });
}

self.addEventListener("connect", event => {
    const port = event.ports[0];
    _ports.add(port);

    port.postMessage({ type: "WS_STATUS", status: _wsStatus });
    if (_lastData) {
        port.postMessage({ type: "SENSOR_DATA", data: _lastData });
    }

    if (!_ws || _ws.readyState === WebSocket.CLOSED || _ws.readyState === WebSocket.CLOSING) {
        _connect();
    }

    port.addEventListener("message", event => {
        if (event.data === "DISCONNECT") {

            _ports.delete(port);

        }
    });

    port.start();
});