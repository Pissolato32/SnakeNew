const { POWERUP_TYPES } = require('./Constants');
const { getSafeSpawnPoint } = require('./Utils');

class PowerupManager {
    constructor(playerManager) { // Needs playerManager to get players for safe spawn point
        this.powerups = [];
        this.powerupPool = []; // Add powerup pool
        this.playerManager = playerManager; // Store playerManager reference
    }

    createPowerup() {
        let powerupItem;
        if (this.powerupPool.length > 0) {
            powerupItem = this.powerupPool.pop();
        } else {
            powerupItem = {}; // Create a new object if pool is empty
        }

        const powerupType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        // Pass players from playerManager to getSafeSpawnPoint
        const spawnPoint = getSafeSpawnPoint(this.playerManager.players, this.playerManager.SPAWN_BUFFER); // SPAWN_BUFFER will be in PlayerManager
        
        // Assign properties to the powerupItem (reused or new)
        Object.assign(powerupItem, { 
            ...powerupType, 
            x: spawnPoint.x, 
            y: spawnPoint.y, 
            id: `powerup_${Math.random().toString(36).substr(2, 9)}` 
        });

        return powerupItem;
    }

    addPowerup(powerupItem) {
        this.powerups.push(powerupItem);
    }

    removePowerup(powerupItem) {
        this.powerups = this.powerups.filter(p => p.id !== powerupItem.id);
        this.powerupPool.push(powerupItem); // Return to pool
    }

    getPowerups() {
        return this.powerups;
    }
}

module.exports = PowerupManager;
