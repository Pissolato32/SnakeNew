const Constants = require('./Constants');

class CollisionSystem {
    constructor(playerManager, foodManager, powerupManager) {
        this.playerManager = playerManager;
        this.foodManager = foodManager;
        this.powerupManager = powerupManager;
    }

    /**
     * Estimates a player's head position at a given timestamp using their head history.
     * @param {object} player The player object.
     * @param {number} timestamp The timestamp to rewind to.
     * @returns {{x: number, y: number}} The estimated historical position.
     */
    getHistoricalPosition(player, timestamp) {
        const history = player.headHistory;
        if (history.length === 0) {
            return { x: player.x, y: player.y }; // No history, return current position
        }

        // Find the two history points that bracket the timestamp
        let p1 = null; // Point before or at timestamp
        let p2 = null; // Point after timestamp

        for (let i = 0; i < history.length; i++) {
            const point = history.get(i);
            if (point.timestamp <= timestamp) {
                p1 = point;
            } else {
                p2 = point;
                break;
            }
        }

        if (!p1) {
            // All points are after timestamp, use the oldest point (end of history)
            return history.get(history.length - 1);
        }
        if (!p2) {
            // All points are before or at timestamp, use the newest point (start of history)
            return p1;
        }

        // Interpolate between p1 and p2
        const t = (timestamp - p1.timestamp) / (p2.timestamp - p1.timestamp);
        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;
        return { x, y };
    }

    processCollisions() {
        const playersToKill = new Set();
        const foodToRemove = new Set();

        const players = this.playerManager.getPlayers();

        for (const id in players) {
            const player = players[id];

            // World boundary collision
            if (Math.hypot(player.x, player.y) > Constants.worldSize / 2 - player.radius) {
                playersToKill.add(player);
                continue;
            }

            // Powerup collisions
            this.powerupManager.getPowerups().forEach(p => {
                if (Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
                    if (p.type === 'FOOD_MAGNET') {
                        player.powerups.foodMagnet = { active: true, endTime: Date.now() + 5000 };
                    }
                    this.powerupManager.removePowerup(p);
                }
            });

            // Food collisions
            const foodQueryRange = { x: player.x - Constants.AI_VISION_RANGE_WIDTH / 2, y: player.y - Constants.AI_VISION_RANGE_WIDTH / 2, width: Constants.AI_VISION_RANGE_WIDTH, height: Constants.AI_VISION_RANGE_WIDTH };
            const nearbyFood = this.foodManager.foodSpatialHashing.query(foodQueryRange);

            if (!player.isBot) {
                console.log(`Player ${player.id} - Pos: (${player.x.toFixed(2)}, ${player.y.toFixed(2)}), Radius: ${player.radius.toFixed(2)}`);
                console.log(`Nearby food count: ${nearbyFood.length}`);
            }

            nearbyFood.forEach(f => {
                const distance = Math.hypot(player.x - f.x, player.y - f.y);
                const radiiSum = player.radius + f.radius;
                const collisionDetected = distance < radiiSum;

                if (!player.isBot) {
                    console.log(`  Food ${f.id} - Pos: (${f.x.toFixed(2)}, ${f.y.toFixed(2)}), Radius: ${f.radius.toFixed(2)}`);
                    console.log(`  Distance: ${distance.toFixed(2)}, Radii Sum: ${radiiSum.toFixed(2)}, Collision: ${collisionDetected}`);
                }

                if (foodToRemove.has(f)) {
                    if (!player.isBot) {
                        console.log(`  Food ${f.id} already marked for removal.`);
                    }
                    return;
                }
                if (collisionDetected) {
                    if (!player.isBot) {
                        console.log(`  COLLISION! Player ${player.id} with Food ${f.id}`);
                    }
                    player.maxLength += f.score;
                    player.radius = Math.min(100, player.radius + f.score * 0.02);
                    const blendFactor = Math.min(1, 0.03 * f.score);
                    player.rgb.r = Math.round(player.rgb.r * (1 - blendFactor) + f.rgb.r * blendFactor);
                    player.rgb.g = Math.round(player.rgb.g * (1 - blendFactor) + f.rgb.g * blendFactor);
                    player.rgb.b = Math.round(player.rgb.b * (1 - blendFactor) + f.rgb.b * blendFactor);
                    player.color = `rgb(${player.rgb.r}, ${player.rgb.g}, ${player.rgb.b})`;
                    foodToRemove.add(f);
                    if (!player.isBot) {
                        console.log(`  Food ${f.id} added to foodToRemove. New player length: ${player.maxLength}, radius: ${player.radius.toFixed(2)}`);
                    }
                }
            });

            // Player-to-player collisions (head-to-body) with Lag Compensation
            const playerQueryRange = { x: player.x - player.radius, y: player.y - player.radius, width: player.radius * 2, height: player.radius * 2 };
            const nearbyPlayers = this.playerManager.playerSpatialHashing.query(playerQueryRange);

            nearbyPlayers.forEach(otherPlayer => {
                if (player.id === otherPlayer.id) return;

                // Calculate rewind time for otherPlayer based on current player's ping
                const rewindTime = Date.now() - player.ping; 
                const historicalHeadOtherPlayer = this.getHistoricalPosition(otherPlayer, rewindTime);

                // Reconstruct historical body segments for otherPlayer
                // This is an approximation: we assume segments maintain their relative offset from the head
                // even when rewinding. This is common in games for performance.
                for (let i = 1; i < otherPlayer.body.length; i++) {
                    const currentSegment = otherPlayer.body.get(i);
                    const currentHead = otherPlayer.body.get(0); // Get current head position

                    // Calculate offset of segment from current head
                    const offsetX = currentSegment.x - currentHead.x;
                    const offsetY = currentSegment.y - currentHead.y;

                    // Apply offset to historical head to get historical segment position
                    const historicalSegment = {
                        x: historicalHeadOtherPlayer.x + offsetX,
                        y: historicalHeadOtherPlayer.y + offsetY
                    };

                    // Check collision of current player's head with historical segment
                                        if (Math.hypot(player.x - historicalSegment.x, player.y - historicalSegment.y) < player.radius + otherPlayer.radius) { // More accurate radius check
                        playersToKill.add(player);
                        return; // Exit inner loop once collision is detected
                    }
                }
            });
        }

        // Apply removals and kills after all collisions are processed
        if (foodToRemove.size > 0) {
            foodToRemove.forEach(f => this.foodManager.removeFood(f));
            // Replenish food supply
            for (let i = 0; i < foodToRemove.size; i++) {
                this.foodManager.addFood(this.foodManager.createFood(undefined, undefined, undefined, players, Constants.SPAWN_BUFFER));
            }
        }

        playersToKill.forEach(player => this.playerManager.killPlayer(player));
    }
}

module.exports = CollisionSystem;