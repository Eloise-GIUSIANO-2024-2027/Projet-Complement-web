"use strict";

const tempPrec = document.getElementById("zoneValPrec");
const canvas = document.getElementById("tempChart");

let tempChart = null;

if (canvas) {
    const ctx = canvas.getContext("2d");

    tempChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Température (°C)",
                data: [],
                borderColor: "#4a90d9",
                backgroundColor: "rgba(74, 144, 217, 0.1)",
                borderWidth: 2,
                pointRadius: 4,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: false,
            animation: false
        }
    });

    let _historyCount = 0;
    function showHistory(temp)
    {
        if (!tempChart || !tempPrec) return;

        _historyCount++;

        const entry = document.createElement("li");
        entry.textContent = "Jour " + _historyCount + " : " + temp + "°C";
        tempPrec.appendChild(entry);

        tempChart.data.labels.push("Jour " + _historyCount);
        tempChart.data.datasets[0].data.push(temp);
        tempChart.update();
    }
}

EventEmitter.on("sensorUpdated", ({ id, temp }) => {
    if (id === "ext") showHistory(temp);
});