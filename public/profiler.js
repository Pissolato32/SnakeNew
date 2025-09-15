const chartData = {
    labels: Array(50).fill(''), // Labels for the x-axis (time)
    datasets: [{
        label: 'Frame Time (ms)',
        borderColor: 'rgba(0, 255, 0, 1)',
        backgroundColor: 'rgba(0, 255, 0, 0.2)',
        data: Array(50).fill(0),
        fill: true,
        tension: 0.4
    }]
};

let profilerChart;

window.initProfilerChart = function(canvasElement) {
    const ctx = canvasElement.getContext('2d');
    profilerChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            height: 100,
            scales: {
                x: {
                    display: false
                },
                y: {
                    min: 0,
                    max: 30, // Adjust based on expected frame times (e.g., 1000/60 = 16.67ms)
                    grid: {
                        color: 'rgba(0, 255, 0, 0.1)'
                    },
                    ticks: {
                        color: '#00ff00'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            animation: {
                duration: 0 // Disable animation for real-time updates
            }
        }
    });
};

window.updateProfilerChart = function(frameTime) {
    chartData.datasets[0].data.push(frameTime);
    chartData.datasets[0].data.shift(); // Remove oldest data point
    if (profilerChart) {
        profilerChart.update();
    }
};
