class HealthCheck {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    getHealthStatus() {
        const uptime = this.gameManager.metrics.getUptime();
        
        let totalPlayerCount = 0;
        for (const room of this.gameManager.rooms.values()) {
            totalPlayerCount += Object.keys(room.playerManager.getPlayers()).length;
        }

        const memoryUsage = process.memoryUsage();

        return {
            status: 'healthy',
            uptime: uptime,
            players: totalPlayerCount,
            rooms: this.gameManager.rooms.size,
            memory: {
                rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
                heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
            },
            timestamp: new Date().toISOString()
        };
    }
}

export default HealthCheck;
