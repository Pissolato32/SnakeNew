class AntiCheat {
    constructor(logger) {
        this.logger = logger;
        this.playerHistory = new Map(); // playerId -> history of positions
    }

    detectSpeedHack(player) {
        const history = this.playerHistory.get(player.id);
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
            this.logger.warn(`Speed hack detected for player ${player.id}: ${avgSpeed}`);
            return true;
        }
        return false;
    }

    detectTeleport(player) {
        const history = this.playerHistory.get(player.id);
        if (!history || history.length < 2) return false;

        const last = history[history.length - 1];
        const prev = history[history.length - 2];
        const dist = Math.hypot(last.x - prev.x, last.y - prev.y);
        const time = last.timestamp - prev.timestamp;
        const instantSpeed = dist / (time || 1);

        if (instantSpeed > 1000) { // Very high speed indicates teleport
            this.logger.warn(`Teleport detected for player ${player.id}`);
            return true;
        }
        return false;
    }

    updatePlayerHistory(player) {
        if (!this.playerHistory.has(player.id)) {
            this.playerHistory.set(player.id, []);
        }
        const history = this.playerHistory.get(player.id);
        history.push({
            x: player.x,
            y: player.y,
            timestamp: Date.now()
        });
        // Keep only last 50 positions
        if (history.length > 50) {
            history.shift();
        }
    }
}

export default AntiCheat;
