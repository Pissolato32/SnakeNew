import CircularBuffer from './shared/CircularBuffer.js';

class GameState {
    constructor() {
        this.players = new Map();
        this.food = [];
        this.powerups = [];
        this.selfId = null;
        this.worldSize = 0;
    }

    setSelfId(id) {
        this.selfId = id;
    }

    setWorldSize(size) {
        this.worldSize = size;
    }

    processDelta(delta) {
        if (delta.players) {
            this.processPlayerUpdates(delta.players);
        }
        if (delta.food) {
            this.processFoodUpdates(delta.food);
        }
        if (delta.powerups) {
            this.processPowerupUpdates(delta.powerups);
        }
    }

    processPlayerUpdates(playerDelta) {
        // Added players
        for (const id in playerDelta.added) {
            const player = playerDelta.added[id];
            player.targetX = player.x;
            player.targetY = player.y;
            player.body = new CircularBuffer();
            this.players.set(id, player);
        }

        // Updated players
        for (const id in playerDelta.updated) {
            const updates = playerDelta.updated[id];
            const player = this.players.get(id);

            if (!player) continue;

            // Update interpolation targets
            if (updates.x !== undefined) player.targetX = updates.x;
            if (updates.y !== undefined) player.targetY = updates.y;
            if (updates.maxLength !== undefined) player.maxLength = updates.maxLength;

            // Optimized body reconstruction for non-self players
            if (id !== this.selfId && (updates.x !== undefined || updates.y !== undefined)) {
                const newX = updates.x !== undefined ? updates.x : player.x;
                const newY = updates.y !== undefined ? updates.y : player.y;
                player.body.addFirst({ x: newX, y: newY });

                // Trim body efficiently
                while (player.body.length > player.maxLength) {
                    player.body.removeLast();
                }
            }

            // Apply other updates
            Object.assign(player, updates);
        }

        // Removed players
        playerDelta.removed.forEach(id => {
            this.players.delete(id);
        });
    }

    processFoodUpdates(foodDelta) {
        const removedSet = new Set(foodDelta.removed);

        if (removedSet.size > 0) {
            this.food = this.food.filter(f => !removedSet.has(f.id));
        }

        this.food.push(...foodDelta.added);

        foodDelta.updated.forEach(updatedFood => {
            const foodItem = this.food.find(f => f.id === updatedFood.id);
            if (foodItem) {
                Object.assign(foodItem, updatedFood);
            }
        });
    }

    processPowerupUpdates(powerupDelta) {
        const removedSet = new Set(powerupDelta.removed);

        powerupDelta.removed.forEach(id => {
            // We might want to create particles here, but that's a rendering concern.
            // We'll delegate that to the renderer.
        });

        if (removedSet.size > 0) {
            this.powerups = this.powerups.filter(p => !removedSet.has(p.id));
        }

        this.powerups.push(...powerupDelta.added);

        powerupDelta.updated.forEach(updatedPowerup => {
            const powerupItem = this.powerups.find(p => p.id === updatedPowerup.id);
            if (powerupItem) {
                Object.assign(powerupItem, updatedPowerup);
            }
        });
    }

    get self() {
        return this.players.get(this.selfId);
    }
}

export default GameState;
