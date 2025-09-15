class MetricsCollector {
    constructor() {
        this.metrics = new Map();
        this.startTime = Date.now();
    }

    collectMetric(name, value) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        const values = this.metrics.get(name);
        values.push({
            value: value,
            timestamp: Date.now()
        });
        // Keep only last 100 values
        if (values.length > 100) {
            values.shift();
        }
    }

    getMetrics(name = null) {
        if (name) {
            return this.metrics.get(name) || [];
        }
        return Object.fromEntries(this.metrics);
    }

    getAverageMetric(name) {
        const values = this.metrics.get(name) || [];
        if (values.length === 0) return 0;
        const sum = values.reduce((acc, v) => acc + v.value, 0);
        return sum / values.length;
    }

    getLatestMetric(name) {
        const values = this.metrics.get(name) || [];
        return values.length > 0 ? values[values.length - 1].value : 0;
    }

    resetMetrics() {
        this.metrics.clear();
        this.startTime = Date.now();
    }

    getUptime() {
        return Date.now() - this.startTime;
    }
}

module.exports = MetricsCollector;
