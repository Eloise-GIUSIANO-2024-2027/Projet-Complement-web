"use strict";

const tempPrec = document.getElementById("zoneValPrec");
const canvasInt = document.getElementById("tempChartInt");
const canvasExt = document.getElementById("tempChartExt");

let tempChartInt = null;
let tempChartExt = null;
let _historyCount = 0;

function createChart(canvas, label, color) {
    if (!canvas) return null;
    return new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color.replace(")", ", 0.1)").replace("rgb", "rgba"),
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
}

tempChartInt = createChart(canvasInt, "Intérieur (°C)", "rgb(74, 144, 217)");
tempChartExt = createChart(canvasExt, "Extérieur (°C)", "rgb(217, 100, 74)");

function showHistory(id, temp) {
    if (!tempPrec) return;

    const chart = id === "int" ? tempChartInt : tempChartExt;
    if (!chart) return;

    if (id === "ext") {
        _historyCount++;
        const entry = document.createElement("li");
        entry.textContent = "Jour " + _historyCount + " : " + temp + "°C";
        tempPrec.appendChild(entry);
    }

    const label = "Jour " + (id === "int" ? _historyCount : _historyCount);
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(temp);
    chart.update();
}

EventEmitter.on("sensorUpdated", ({ id, temp }) => {
    showHistory(id, temp);
});