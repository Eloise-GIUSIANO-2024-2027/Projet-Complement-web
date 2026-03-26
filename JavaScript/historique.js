"use strict";

const tempPrec = document.getElementById("zoneValPrec");

const ctx = document.getElementById("tempChart").getContext("2d");
const tempChart = new Chart(ctx, {
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
        animation: false,
        scales: {
            y: { min: -10, max: 40, title: { display: true, text: "°C" } },
            x: { title: { display: true, text: "Jour" } }
        }
    }
});

let _historyCount = 0; // ✅ remplace I_i

function showHistory(temp)
{
    _historyCount++;

    const entry = document.createElement("li");
    entry.textContent = "Jour " + _historyCount + " : " + temp + "°C";
    tempPrec.appendChild(entry);

    tempChart.data.labels.push("Jour " + _historyCount);
    tempChart.data.datasets[0].data.push(temp);
    tempChart.update();
}

EventEmitter.on("sensorUpdated", ({ id, temp }) => {
    if (id === "ext") showHistory(temp); // on historise la temp extérieure
});