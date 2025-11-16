class Metrics {
    constructor() {
        this.startTime = Date.now();
    }

    getUptime() {
        return (Date.now() - this.startTime) / 1000; // Uptime in seconds
    }
}

export default Metrics;
