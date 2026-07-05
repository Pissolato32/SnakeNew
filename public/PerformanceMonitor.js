/**
 * Performance Monitor
 *
 * Design goals (why this differs from a naive "avg FPS" counter):
 * - Average FPS hides GC pauses / stutter. A frame that takes 200ms once
 *   every 2 seconds barely moves a 60-sample rolling average, but it is
 *   very visible to a human. So we track a "1% low" (the worst frame
 *   times in the window) and a dropped-frame counter, not just the mean.
 * - update vs render are measured separately so you know WHICH part of
 *   the pipeline regressed (GameState interpolation vs Canvas drawing).
 * - Everything is stored in a fixed-size ring buffer (no unbounded
 *   arrays), so the monitor itself doesn't add to the GC pressure it's
 *   trying to measure.
 */
class PerformanceMonitor {
    constructor(windowSize = 300) {
        this.windowSize = windowSize;
        this.frameTimes = new Float64Array(windowSize);
        this.updateTimes = new Float64Array(windowSize);
        this.renderTimes = new Float64Array(windowSize);
        this.cursor = 0;
        this.filled = 0;

        this.lastTime = 0;
        this.droppedFrames = 0;
        this.totalFrames = 0;

        this.DROP_THRESHOLD_MS = 33.3;

        this.metrics = {
            fps: 0,
            avgFrameTime: 0,
            p1LowFps: 0,
            p1LowFrameTime: 0,
            avgUpdateTime: 0,
            avgRenderTime: 0,
            droppedFrames: 0,
            droppedFramePct: 0,
            networkLatency: 0,
            memoryUsage: 0,
        };

        this.history = [];
        this.lastHistoryPush = 0;

        this.updateStart = 0;
        this.renderStart = 0;
    }

    beginFrame(timestamp) {
        this.frameStart = timestamp;
        if (this.lastTime) {
            const frameTime = timestamp - this.lastTime;
            this._push(this.frameTimes, frameTime);
            this.totalFrames++;
            if (frameTime > this.DROP_THRESHOLD_MS) this.droppedFrames++;
        }
        this.lastTime = timestamp;
    }

    endFrame() {
        this._recompute();
        if (this.frameStart - this.lastHistoryPush > 1000) {
            this.lastHistoryPush = this.frameStart;
            this.history.push({ t: Math.round(this.frameStart), ...this.metrics });
            if (this.history.length > 3600) this.history.shift();
        }
    }

    markUpdateStart() { this.updateStart = performance.now(); }
    markUpdateEnd() { this._push(this.updateTimes, performance.now() - this.updateStart); }

    markRenderStart() { this.renderStart = performance.now(); }
    markRenderEnd() { this._push(this.renderTimes, performance.now() - this.renderStart); }

    updateNetworkLatency(ping) { this.metrics.networkLatency = ping; }

    updateMemoryUsage() {
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
        }
    }

    _push(arr, value) {
        arr[this.cursor % this.windowSize] = value;
        this.cursor++;
        this.filled = Math.min(this.filled + 1, this.windowSize);
    }

    _recompute() {
        const n = this.filled;
        if (n === 0) return;

        const samples = Array.from(this.frameTimes.slice(0, n)).sort((a, b) => a - b);
        const avg = samples.reduce((a, b) => a + b, 0) / n;
        const p1Index = Math.max(0, Math.floor(n * 0.99));
        const p1LowFrameTime = samples[p1Index];

        this.metrics.avgFrameTime = avg;
        this.metrics.fps = avg > 0 ? 1000 / avg : 0;
        this.metrics.p1LowFrameTime = p1LowFrameTime;
        this.metrics.p1LowFps = p1LowFrameTime > 0 ? 1000 / p1LowFrameTime : 0;

        const uN = Math.min(this.filled, this.updateTimes.length);
        this.metrics.avgUpdateTime = Array.from(this.updateTimes.slice(0, uN)).reduce((a, b) => a + b, 0) / (uN || 1);
        this.metrics.avgRenderTime = Array.from(this.renderTimes.slice(0, uN)).reduce((a, b) => a + b, 0) / (uN || 1);

        this.metrics.droppedFrames = this.droppedFrames;
        this.metrics.droppedFramePct = this.totalFrames > 0 ? (this.droppedFrames / this.totalFrames) * 100 : 0;

        this.updateMemoryUsage();
    }

    getMetrics() {
        return this.metrics;
    }

    resetSession() {
        this.droppedFrames = 0;
        this.totalFrames = 0;
        this.history = [];
    }

    exportCsv() {
        const header = 't,fps,avgFrameTime,p1LowFps,avgUpdateTime,avgRenderTime,droppedFrames,networkLatency,memoryUsage\n';
        const rows = this.history.map(h =>
            `${h.t},${h.fps.toFixed(2)},${h.avgFrameTime.toFixed(2)},${h.p1LowFps.toFixed(2)},${h.avgUpdateTime.toFixed(3)},${h.avgRenderTime.toFixed(3)},${h.droppedFrames},${h.networkLatency},${h.memoryUsage.toFixed(2)}`
        ).join('\n');
        return header + rows;
    }

    downloadCsv(filename = `perf_${Date.now()}.csv`) {
        const blob = new Blob([this.exportCsv()], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

export default PerformanceMonitor;
