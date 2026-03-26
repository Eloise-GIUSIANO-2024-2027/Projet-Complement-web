"use strict";

const Controller = (() => {
    const WS_URL = "wss://ws.hothothot.dog:9502";
    const RECONNECT_DELAY_MS = 5000;
    let _ws = null;

    function _initObservers() {
        EventEmitter.on("sensorUpdated", ({ id, temp, min, max }) => {
            const alertInfo = Model.getAlertInfo(id, temp);
            View.renderSensor({ id, temp, min, max }, alertInfo);

            if (alertInfo.critique && alertInfo.alerte) {
                View.showAlertDialog(alertInfo.alerte);
            }
        });
    }

    function _handleMessage(rawData) {
        try {
            const parsed = JSON.parse(rawData);

            if (parsed.int !== undefined && parsed.ext !== undefined) {
                Model.updateTemp("int", Number(parsed.int));
                Model.updateTemp("ext", Number(parsed.ext));
                return;
            }

            if (parsed.sensor && parsed.value !== undefined) {
                const id = parsed.sensor === "int" || parsed.sensor === "interieur" ? "int" : "ext";
                Model.updateTemp(id, Number(parsed.value));
                return;
            }

            console.warn("HotHotHot – format de message inconnu :", parsed);
        } catch (err) {
            console.error("HotHotHot – erreur parsing WebSocket :", err, rawData);
        }
    }

    function _connect() {
        View.setWsStatus("connecting");
        _ws = new WebSocket(WS_URL);

        _ws.addEventListener("open",    () => View.setWsStatus("connected"));
        _ws.addEventListener("message", (event) => _handleMessage(event.data));
        _ws.addEventListener("error",   () => View.setWsStatus("error"));
        _ws.addEventListener("close",   () => {
            View.setWsStatus("closed");
            setTimeout(_connect, RECONNECT_DELAY_MS);
        });
    }

    function init() {
        _initObservers();
        View.initTabs();
        View.initAlertClose();
        _connect();
    }

    return { init };
})();

document.addEventListener("DOMContentLoaded", () => Controller.init());