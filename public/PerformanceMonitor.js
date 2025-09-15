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
        return this.metrics;
    }
}

export default PerformanceMonitor;
