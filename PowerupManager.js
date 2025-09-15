import { POWERUP_TYPES } from './Constants.js';
import { getSafeSpawnPoint } from './Utils.js';

class PowerupManager {
    constructor(playerManager, logger) { // Needs playerManager to get players for safe spawn point
        this.powerups = [];
        this.powerupPool = []; // Add powerup pool
        this.playerManager = playerManager; // Store playerManager reference
        this.logger = logger;
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

export default PowerupManager;
