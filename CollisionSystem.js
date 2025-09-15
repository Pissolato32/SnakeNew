import { worldSize, FOOD_COLLISION_BUFFER, SNAKE_SEGMENT_RADIUS, MAX_PLAYER_RADIUS, RADIUS_GAIN_FACTOR, HEAD_ON_COLLISION_ANGLE_THRESHOLD } from './Constants.js';

class CollisionSystem {
    constructor(playerManager, foodManager, powerupManager, logger) {
        this.playerManager = playerManager;
        this.foodManager = foodManager;
        this.powerupManager = powerupManager;
        this.logger = logger;
    }

    _checkWorldBoundaryCollision(player, playersToKill) {
        if (Math.hypot(player.x, player.y) > worldSize / 2 - player.radius) {
            playersToKill.add(player);
            return true;
        }
        for (let i = 0; i < player.body.length; i++) {
            const segment = player.body.get(i);
            if (!segment) continue;
            if (Math.hypot(segment.x, segment.y) > worldSize / 2) {
                this.logger.debug(`Player ${player.id} body segment ${i} out of bounds, killing player.`);
                playersToKill.add(player);
                return true;
            }
        }
        return false;
    }

    _checkPowerupCollision(player) {
        this.powerupManager.getPowerups().forEach(p => {
            if (Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
                if (p.type === 'FOOD_MAGNET') {
                    player.powerups.foodMagnet = { attractOnce: true };
                }
                this.powerupManager.removePowerup(p);
            }
        });
    }

    _checkFoodCollision(player, foodToRemove) {
        if (player.isDead) return;

        const nearbyFood = this.foodManager.foodSpatialHashing.query({
            x: player.x - player.radius - FOOD_COLLISION_BUFFER,
            y: player.y - player.radius - FOOD_COLLISION_BUFFER,
            width: (player.radius + FOOD_COLLISION_BUFFER) * 2,
            height: (player.radius + FOOD_COLLISION_BUFFER) * 2
        });

        this.logger.debug(`Player ${player.id} - Pos: (${player.x.toFixed(2)}, ${player.y.toFixed(2)}), Radius: ${player.radius.toFixed(2)}`);
        this.logger.debug(`Nearby food count: ${nearbyFood.length}`);

        let totalScore = 0;
        nearbyFood.forEach(f => {
            const distance = Math.hypot(player.x - f.x, player.y - f.y);
            const radiiSum = player.radius + f.radius;
            const collisionDetected = distance < radiiSum + FOOD_COLLISION_BUFFER;

            this.logger.debug(`  Food ${f.id} - Pos: (${f.x.toFixed(2)}, ${f.y.toFixed(2)}), Radius: ${f.radius.toFixed(2)}`);
            this.logger.debug(`  Distance: ${distance.toFixed(2)}, Radii Sum: ${radiiSum.toFixed(2)}, Collision: ${collisionDetected}`);

            if (foodToRemove.has(f)) {
                this.logger.debug(`  Food ${f.id} already marked for removal.`);
                return;
            }
            if (collisionDetected) {
                this.logger.debug(`  COLLISION DETECTED! Player ${player.id} with Food ${f.id}`);
                totalScore += f.score;
                this.logger.debug(`Removing food item: ${f.id}`);
                foodToRemove.add(f);
            }
        });

        if (totalScore > 0) {
            player.maxLength += totalScore;
            player.radius = Math.min(MAX_PLAYER_RADIUS, player.radius + totalScore * RADIUS_GAIN_FACTOR);
            this.logger.debug(`  Player stats updated. New length: ${player.maxLength}, radius: ${player.radius.toFixed(2)}`);
        }
    }

    _checkPlayerCollision(player, otherPlayer, playersToKill) {
        if (player.id === otherPlayer.id) return;

        this.logger.debug(`  Checking collision between Player ${player.id} and OtherPlayer ${otherPlayer.id}`);

        for (let i = 0; i < otherPlayer.body.length; i++) {
            const segment = otherPlayer.body.get(i);
            if (otherPlayer.isDead) {
                this.logger.debug(`    Skipping collision with dead player ${otherPlayer.id}`);
                continue;
            }

            const radiiSum = (i === 0) ? (player.radius + otherPlayer.radius) : (player.radius + SNAKE_SEGMENT_RADIUS);
            const distanceHeadToSegment = Math.hypot(player.x - segment.x, player.y - segment.y);
            const part = (i === 0) ? 'Head' : `Body Segment ${i}`;
            this.logger.debug(`    Head-to-${part}: Player ${player.id} Head (${player.x.toFixed(2)}, ${player.y.toFixed(2)}) vs OtherPlayer ${otherPlayer.id} ${part} (${segment.x.toFixed(2)}, ${segment.y.toFixed(2)})`);
            this.logger.debug(`    Distance: ${distanceHeadToSegment.toFixed(2)}, Radii Sum: ${radiiSum.toFixed(2)}`);

            if (distanceHeadToSegment < radiiSum) {
                this.logger.debug(`    COLLISION! Head-to-${part}: Player ${player.id} with OtherPlayer ${otherPlayer.id}`);
                if (i === 0) { // Head-to-head
                    const angleToOther = Math.atan2(otherPlayer.y - player.y, otherPlayer.x - player.x);
                    const angleDiff = ((angleToOther - player.angle + Math.PI) % (2 * Math.PI)) - Math.PI;
                    if (Math.abs(angleDiff) < HEAD_ON_COLLISION_ANGLE_THRESHOLD) {
                        if (player.maxLength > otherPlayer.maxLength) {
                            playersToKill.add(otherPlayer);
                        } else if (otherPlayer.maxLength > player.maxLength) {
                            playersToKill.add(player);
                        } else {
                            playersToKill.add(player);
                            playersToKill.add(otherPlayer);
                        }
                    }
                } else { // Head-to-body
                    playersToKill.add(player);
                }
                return; // Exit inner loop once collision is detected
            }
        }
    }

    processCollisions() {
        const playersToKill = new Set();
        const foodToRemove = new Set();
        const players = this.playerManager.getPlayers();
        const playerList = Object.values(players);

        for (const player of playerList) {
            if (this._checkWorldBoundaryCollision(player, playersToKill)) continue;
            this._checkPowerupCollision(player);
            this._checkFoodCollision(player, foodToRemove);

            for (const otherPlayer of playerList) {
                this._checkPlayerCollision(player, otherPlayer, playersToKill);
            }
        }

        if (foodToRemove.size > 0) {
            this.logger.debug(`Processing ${foodToRemove.size} food items for removal.`);
            foodToRemove.forEach(f => this.foodManager.removeFood(f));
        }

        playersToKill.forEach(player => this.playerManager.killPlayer(player));
    }
}

export default CollisionSystem;
