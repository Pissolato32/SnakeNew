class HealthCheck {
    constructor(playerManager, metrics) {
        this.playerManager = playerManager;
        this.metrics = metrics;
    }

    getHealthStatus() {
        const uptime = this.metrics.getUptime();
        const playerCount = Object.keys(this.playerManager.getPlayers()).length;
        const memoryUsage = process.memoryUsage();

        return {
            status: 'healthy',
            uptime: uptime,
            players: playerCount,
            memory: {
                rss: memoryUsage.rss,
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal
            },
            timestamp: new Date().toISOString()
        };
    }
}

export default HealthCheck;
