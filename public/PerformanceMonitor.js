/**
 * 3. Performance Monitor
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: 0,
            frameTime: 0,
            updateTime: 0,
            renderTime: 0,
            networkLatency: 0,
            memoryUsage: 0
        };
        this.frameTimes = [];
        this.maxSamples = 60;
        this.lastTime = 0;

        // Chart-related properties
        this.chart = null;
        this.chartData = {
            labels: Array(50).fill(''),
            datasets: [{
                label: 'Frame Time (ms)',
                borderColor: 'rgba(0, 255, 0, 1)',
                backgroundColor: 'rgba(0, 255, 0, 0.2)',
                data: Array(50).fill(0),
                fill: true,
                tension: 0.4
            }]
        };
    }
    
    beginFrame(timestamp) {
        this.frameStart = timestamp;
        if (this.lastTime) {
            const frameTime = timestamp - this.lastTime;
            this.frameTimes.push(frameTime);
            if (this.frameTimes.length > this.maxSamples) {
                this.frameTimes.shift();
            }
            
            const avgFrameTime = this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length;
            this.metrics.fps = 1000 / avgFrameTime;
            this.metrics.frameTime = avgFrameTime;

            this.updateChart(avgFrameTime);
        }
        this.lastTime = timestamp;
    }
    
    endFrame() {
        this.metrics.totalFrameTime = performance.now() - this.frameStart;
    }
    
    markUpdateStart() {
        this.updateStart = performance.now();
    }
    
    markUpdateEnd() {
        this.metrics.updateTime = performance.now() - this.updateStart;
    }
    
    markRenderStart() {
        this.renderStart = performance.now();
    }
    
    markRenderEnd() {
        this.metrics.renderTime = performance.now() - this.renderStart;
    }
    
    updateNetworkLatency(ping) {
        this.metrics.networkLatency = ping;
    }
    
    updateMemoryUsage() {
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        }
    }
    
    getMetrics() {
        this.updateMemoryUsage();
        return this.metrics;
    }

    initChart(canvasElement) {
        if (!window.Chart) {
            console.error('Chart.js is not loaded.');
            return;
        }
        const ctx = canvasElement.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: this.chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                height: 100,
                scales: {
                    x: { display: false },
                    y: {
                        min: 0,
                        max: 33, // Target for ~30fps
                        grid: { color: 'rgba(0, 255, 0, 0.1)' },
                        ticks: { color: '#00ff00' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                animation: { duration: 0 }
            }
        });
    }

    updateChart(frameTime) {
        if (!this.chart) return;
        this.chartData.datasets[0].data.push(frameTime);
        this.chartData.datasets[0].data.shift();
        this.chart.update();
    }
}

export default PerformanceMonitor;
