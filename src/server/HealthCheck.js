class HealthCheck {
    constructor(WorldManager) {
        this.WorldManager = WorldManager;
    }

    getHealthStatus() {
        const uptime = this.WorldManager.metrics.getUptime();
        
        let totalAgentCount = 0;
        for (const Region of this.WorldManager.regions.values()) {
            totalAgentCount += Object.keys(Region.agentManager.getAgents()).length;
        }

        const memoryUsage = process.memoryUsage();

        return {
            status: 'healthy',
            uptime: uptime,
            agents: totalAgentCount,
            regions: this.WorldManager.regions.size,
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
