class AntiCheat {
    constructor(logger) {
        this.logger = logger;
        this.agentHistory = new Map(); // agentId -> history of positions
    }

    detectSpeedHack(agent) {
        const history = this.agentHistory.get(agent.id);
        if (!history || history.length < 2) return false;

        const recent = history.slice(-10); // Last 10 positions
        const speeds = [];
        for (let i = 1; i < recent.length; i++) {
            const dist = Math.hypot(recent[i].x - recent[i-1].x, recent[i].y - recent[i-1].y);
            const time = recent[i].timestamp - recent[i-1].timestamp;
            if (time > 0) {
                speeds.push(dist / time);
            }
        }

        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const maxAllowedSpeed = 10; // Adjust based on game constants

        if (avgSpeed > maxAllowedSpeed) {
            this.logger.warn(`Speed hack detected for agent ${agent.id}: ${avgSpeed}`);
            return true;
        }
        return false;
    }

    detectTeleport(agent) {
        const history = this.agentHistory.get(agent.id);
        if (!history || history.length < 2) return false;

        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        const dist = Math.hypot(last.x - prev.x, last.y - prev.y);
        const time = last.timestamp - prev.timestamp;
        const instantSpeed = dist / (time || 1);

        if (instantSpeed > 1000) { // Very high speed indicates teleport
            this.logger.warn(`Teleport detected for agent ${agent.id}`);
            return true;
        }
        return false;
    }

    updateAgentHistory(agent) {
        if (!this.agentHistory.has(agent.id)) {
            this.agentHistory.set(agent.id, []);
        }
        const history = this.agentHistory.get(agent.id);
        history.push({
            x: agent.x,
            y: agent.y,
            timestamp: Date.now()
        });
        // Keep only last 50 positions
        if (history.length > 50) {
            history.shift();
        }
    }
}

export default AntiCheat;
