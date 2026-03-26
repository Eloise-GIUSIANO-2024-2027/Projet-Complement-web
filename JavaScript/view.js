"use strict";

const View = (() => {
    const _els = {
        wsStatus:    document.getElementById("wsStatus"),
        wsStatusDot: document.getElementById("wsStatusDot"),

        tempInt:    document.getElementById("temp-int"),
        tempExt:    document.getElementById("temp-ext"),

        minmaxInt:  document.getElementById("minmax-int"),
        minmaxExt:  document.getElementById("minmax-ext"),

        commentInt: document.getElementById("comment-int"),
        commentExt: document.getElementById("comment-ext"),

        capteurInt: document.getElementById("capteur-int"),
        capteurExt: document.getElementById("capteur-ext"),

        alerteDialog:  document.getElementById("alerteDialog"),
        alerteMessage: document.getElementById("alerteMessage"),
        alerteClose:   document.getElementById("alerteClose"),

        btnJour:  document.getElementById("btnJour"),
        btnHist:  document.getElementById("btnHist"),
        pageJour: document.getElementById("pageJour"),
        pageHist: document.getElementById("pageHist"),
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

    return { setWsStatus, renderSensor, showAlertDialog, initTabs, initAlertClose };
})();