"use strict";

const MAX_POINTS = 45;
const dataInt = [];
const dataExt = [];

const EventEmitter = (() => {
    const _listeners = {};
    return {
        on(event, callback) {
            if (!_listeners[event]) _listeners[event] = [];
            _listeners[event].push(callback);
        },
        emit(event, data) {
            (_listeners[event] || []).forEach(cb => cb(data));
        },
    };
})();

const Model = (() => {
    const _state = {
        int: { temp: null, min: null, max: null },
        ext: { temp: null, min: null, max: null },
    };

    function updateTemp(id, temp) {
        const sensor = _state[id];
        sensor.temp = temp;

        if (sensor.min === null || temp < sensor.min) sensor.min = temp;
        if (sensor.max === null || temp > sensor.max) sensor.max = temp;

        if (id === "int") {
            dataInt.push(temp);
            if (dataInt.length > MAX_POINTS) dataInt.shift();
        } else {
            dataExt.push(temp);
            if (dataExt.length > MAX_POINTS) dataExt.shift();
        }

        EventEmitter.emit("sensorUpdated", { id, ...sensor });
    }

    function getAlertInfo(id, temp) {
        if (id === "int") {
            if (temp < 0)  return { cssClass: "style-blue",   alerte: "Canalisations gelées, appelez SOS plombier et mettez un bonnet !", critique: true };
            if (temp < 12) return { cssClass: "style-blue",   alerte: "Montez le chauffage ou mettez un gros pull !", critique: false };
            if (temp > 50) return { cssClass: "style-red",    alerte: "Appelez les pompiers ou arrêtez votre barbecue !", critique: true };
            if (temp > 22) return { cssClass: "style-orange", alerte: "Baissez le chauffage !", critique: false };
            return { cssClass: "style-green", alerte: "", critique: false };
        }

        if (temp < 0)  return { cssClass: "style-blue",  alerte: "Banquise en vue !", critique: true };
        if (temp > 35) return { cssClass: "style-red",   alerte: "Hot Hot Hot !", critique: true };
        return { cssClass: "style-green", alerte: "", critique: false };
    }

    return { updateTemp, getAlertInfo };
})();

const View = (() => {
    const _els = {
        wsStatus:    document.getElementById("wsStatus"),
        wsStatusDot: document.getElementById("wsStatusDot"),
        tempInt:     document.getElementById("temp-int"),
        tempExt:     document.getElementById("temp-ext"),
        minmaxInt:   document.getElementById("minmax-int"),
        minmaxExt:   document.getElementById("minmax-ext"),
        commentInt:  document.getElementById("comment-int"),
        commentExt:  document.getElementById("comment-ext"),
        capteurInt:  document.getElementById("capteur-int"),
        capteurExt:  document.getElementById("capteur-ext"),
        alerteDialog:  document.getElementById("alerteDialog"),
        alerteMessage: document.getElementById("alerteMessage"),
        alerteClose:   document.getElementById("alerteClose"),
        btnJour:  document.getElementById("btnJour"),
        btnHist:  document.getElementById("btnHist"),
        pageJour: document.getElementById("pageJour"),
        pageHist: document.getElementById("pageHist"),
        btnNotif: document.getElementById("btnNotif"),
    };

    function setWsStatus(status) {
        const dotEl  = _els.wsStatusDot;
        const textEl = _els.wsStatus;
        dotEl.className = "ws-dot";

        switch (status) {
            case "connecting":
                dotEl.classList.add("ws-dot--connecting");
                textEl.textContent = "Connexion en cours…";
                break;
            case "connected":
                dotEl.classList.add("ws-dot--connected");
                textEl.textContent = "Connecté – données en direct";
                break;
            case "error":
                dotEl.classList.add("ws-dot--error");
                textEl.textContent = "Erreur de connexion – tentative de reconnexion…";
                break;
            case "closed":
                dotEl.classList.add("ws-dot--error");
                textEl.textContent = "Connexion fermée";
                break;
        }
    }

    function renderSensor(data, alertInfo) {
        const { id, temp, min, max } = data;
        const { cssClass, alerte, critique } = alertInfo;

        const tempEl    = id === "int" ? _els.tempInt    : _els.tempExt;
        const minmaxEl  = id === "int" ? _els.minmaxInt  : _els.minmaxExt;
        const commentEl = id === "int" ? _els.commentInt : _els.commentExt;
        const cardEl    = id === "int" ? _els.capteurInt : _els.capteurExt;

        tempEl.textContent = temp.toFixed(1);

        if (min !== null && max !== null) {
            minmaxEl.textContent = `Min ${min.toFixed(1)} °C · Max ${max.toFixed(1)} °C`;
        }

        cardEl.className = "capteur";
        if (cssClass) cardEl.classList.add(cssClass);

        commentEl.textContent = alerte;
        commentEl.className = "capteur-alerte" + (critique ? " alerte-critique" : "");
    }

    function showAlertDialog(message) {
        _els.alerteMessage.textContent = message;
        _els.alerteDialog.showModal();
    }

    function initTabs() {
        function activate(btnActive, panelActive, btnOther, panelOther) {
            btnActive.setAttribute("aria-selected", "true");
            btnActive.classList.add("tab-btn--active");
            panelActive.removeAttribute("hidden");
            panelActive.classList.remove("tab-panel--hidden");

            btnOther.setAttribute("aria-selected", "false");
            btnOther.classList.remove("tab-btn--active");
            panelOther.setAttribute("hidden", "");
            panelOther.classList.add("tab-panel--hidden");
        }

        _els.btnJour.addEventListener("click", () =>
            activate(_els.btnJour, _els.pageJour, _els.btnHist, _els.pageHist)
        );
        _els.btnHist.addEventListener("click", () =>
            activate(_els.btnHist, _els.pageHist, _els.btnJour, _els.pageJour)
        );
    }

    function initAlertClose() {
        _els.alerteClose.addEventListener("click", () => {
            _els.alerteDialog.close();
        });
    }

    function initNotifButton(onGranted) {
        const btn = _els.btnNotif;
        if (!btn) return;

        btn.addEventListener("click", async () => {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                btn.textContent = "✅ Notifications activées";
                btn.disabled = true;
                if (typeof onGranted === "function") onGranted();
            } else {
                btn.textContent = "🚫 Notifications refusées";
            }
        });
    }

    return { setWsStatus, renderSensor, showAlertDialog, initTabs, initAlertClose, initNotifButton };
})();

const _makeChartConfig = (label, color) => ({
    type: "line",
    data: {
        labels: [],
        datasets: [{
            label,
            data: [],
            borderColor: color,
            backgroundColor: color.replace("rgb(", "rgba(").replace(")", ", 0.1)"),
            borderWidth: 2,
            pointRadius: 4,
            tension: 0.3,
            fill: true
        }]
    },
    options: {
        responsive: false,
        animation: false,
        scales: {
            y: { min: -10, max: 40, title: { display: true, text: "°C" } },
            x: { title: { display: true, text: "Mesure" } }
        }
    }
});

let tempChartInt;
let tempChartExt;

const Controller = (() => {
    const WS_URL = "wss://ws.hothothot.dog:9502";
    const RECONNECT_DELAY_MS = 5000;
    let _ws = null;

    function _initObservers() {
        EventEmitter.on("sensorUpdated", ({ id, temp, min, max }) => {
            const alertInfo = Model.getAlertInfo(id, temp);
            View.renderSensor({ id, temp, min, max }, alertInfo);

            if (alertInfo.alerte) {
                iziToast[alertInfo.critique ? "error" : "warning"]({
                    title: alertInfo.critique ? "Alerte critique" : "Attention",
                    message: alertInfo.alerte,
                    position: "topRight",
                    timeout: 5000,
                });
            }

            const arr    = id === "int" ? dataInt    : dataExt;
            const chart  = id === "int" ? tempChartInt : tempChartExt;
            const labels = Array.from({ length: arr.length }, (_, i) => i + 1);

            chart.data.labels = labels;
            chart.data.datasets[0].data = [...arr];
            chart.update();
        });
    }

    function _handleMessage(rawData) {
        try {
            const parsed = JSON.parse(rawData);

            if (parsed.capteurs && Array.isArray(parsed.capteurs)) {
                parsed.capteurs.forEach(capteur => {
                    console.log("Nom reçu :", capteur.Nom);
                    const id = capteur.Nom === "interieur" ? "int" : "ext";
                    Model.updateTemp(id, Number(capteur.Valeur));
                    console.log(`Donnée reçue pour ${capteur.Nom} -> assignée à l'ID : ${id}`);
                });
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

        _ws.addEventListener("open", () => {
            View.setWsStatus("connected");
            _ws.send("hello");
        });
        _ws.addEventListener("message", (event) => {
            _handleMessage(event.data);
        });
        _ws.addEventListener("error", () => {
            View.setWsStatus("error");
        });
        _ws.addEventListener("close", () => {
            View.setWsStatus("closed");
            setTimeout(_connect, RECONNECT_DELAY_MS);
        });
    }

    function init() {
        _initObservers();
        View.initTabs();
        View.initAlertClose();
        View.initNotifButton(async () => {
            try {
                const registration = await navigator.serviceWorker.ready;

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array("BPETgmQ0z0VFh-CS5Bzvq3vPfxr5wVyX2yJzSzsKlRwegoBTe5I1Y3zscqbUOaBB9WROACdeYy20ogA8u1LF7b4")
                });

                await fetch("/api/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(subscription)
                });

                console.log("Abonnement push enregistré :", subscription);
            } catch (err) {
                console.error("Erreur abonnement push :", err);
            }
        });
        _connect();
    }

    return { init };
})();

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

document.addEventListener("DOMContentLoaded", () => {
    tempChartInt = new Chart(
        document.getElementById("tempChartInt").getContext("2d"),
        _makeChartConfig("Intérieur (°C)", "rgb(74, 144, 217)")
    );
    tempChartExt = new Chart(
        document.getElementById("tempChartExt").getContext("2d"),
        _makeChartConfig("Extérieur (°C)", "rgb(217, 107, 74)")
    );

    Controller.init();
});