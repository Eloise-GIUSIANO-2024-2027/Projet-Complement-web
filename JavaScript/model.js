"use strict";

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

        if (temp < 0)  return { cssClass: "style-blue",   alerte: "Banquise en vue !", critique: true };
        if (temp > 35) return { cssClass: "style-red",    alerte: "Hot Hot Hot !", critique: true };
        return { cssClass: "style-green", alerte: "", critique: false };
    }

    return { updateTemp, getAlertInfo };
})();