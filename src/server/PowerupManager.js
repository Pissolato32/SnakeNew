import { BASE_POWERUP_TYPES as POWERUP_TYPES, POWERUP_SPATIAL_HASH_CELL_SIZE } from '../shared/Constants.js';
import { getSafeSpawnPoint } from '../shared/Utils.js';
import SpatialHashing from '../shared/SpatialHashing.js';

class PowerupManager {
    constructor(agentManager, logger) { // Needs agentManager to get agents for safe spawn point
        this.powerups = [];
        this.powerupPool = []; // Add powerup pool
        this.agentManager = agentManager; // Store agentManager reference
        this.logger = logger;
        this.powerupSpatialHashing = new SpatialHashing(POWERUP_SPATIAL_HASH_CELL_SIZE);
    }

    createPowerup() {
        let powerupItem;
        if (this.powerupPool.length > 0) {
            powerupItem = this.powerupPool.pop();
        } else {
            powerupItem = {}; // Create a new object if pool is empty
        }

        const powerupType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        // Pass agents from agentManager to getSafeSpawnPoint
        const spawnPoint = getSafeSpawnPoint(this.agentManager.agents, this.agentManager.SPAWN_BUFFER); // SPAWN_BUFFER will be in AgentManager
        
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
        this.powerupSpatialHashing.insert(powerupItem);
    }

    removePowerup(powerupItem) {
        this.powerups = this.powerups.filter(p => p.id !== powerupItem.id);
        this.powerupSpatialHashing.remove(powerupItem);
        this.powerupPool.push(powerupItem); // Return to pool
    }

    getPowerups() {
        return this.powerups;
    }
}

export default PowerupManager;
