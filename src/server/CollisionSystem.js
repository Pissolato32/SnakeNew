import { 
    WORLD_SIZE, 
    SNAKE_SEGMENT_RADIUS, 
    FOOD_COLLISION_BUFFER, 
    RADIUS_GAIN_FACTOR,
    MAX_PLAYER_RADIUS
} from '../shared/Constants.js';

class CollisionSystem {
    constructor(playerManager, foodManager, powerupManager, room, logger) {
        this.playerManager = playerManager;
        this.foodManager = foodManager;
        this.powerupManager = powerupManager;
        this.room = room;
        this.logger = logger;
    }

    _checkWorldBoundaryCollision(player, playersToKill) {
        if (Math.hypot(player.x, player.y) > WORLD_SIZE / 2 - player.radius) {
            playersToKill.add(player);
            return true;
        }
        for (let i = 0; i < player.body.length; i++) {
            const segment = player.body.get(i);
            if (!segment) continue;
            if (Math.hypot(segment.x, segment.y) > WORLD_SIZE / 2) {
                this.logger.debug(`Player ${player.id} body segment ${i} out of bounds, killing player.`);
                playersToKill.add(player);
                return true;
            }
        }
        return false;
    }

    _checkPowerupCollision(player) {
        const queryRadius = player.radius + 20; // Use a generous radius for the query
        const nearbyPowerups = this.powerupManager.powerupSpatialHashing.query({
            x: player.x - queryRadius,
            y: player.y - queryRadius,
            width: queryRadius * 2,
            height: queryRadius * 2,
        });

        for (const p of nearbyPowerups) {
            if (Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
                if (p.type === 'FOOD_MAGNET') {
                    player.powerups.foodMagnet = { attractOnce: true };
                }
                this.powerupManager.removePowerup(p);
                break; // Assume player can only pick up one powerup at a time
            }
        }
    }

    _checkFoodCollision(player, foodToRemove) {
        if (player.isDead) return;

        const nearbyFood = this.foodManager.foodSpatialHashing.query({
            x: player.x - player.radius - FOOD_COLLISION_BUFFER,
            y: player.y - player.radius - FOOD_COLLISION_BUFFER,
            width: (player.radius + FOOD_COLLISION_BUFFER) * 2,
            height: (player.radius + FOOD_COLLISION_BUFFER) * 2
        });

        let totalScore = 0;
        nearbyFood.forEach(f => {
            const distance = Math.hypot(player.x - f.x, player.y - f.y);
            const radiiSum = player.radius + f.radius;
            const collisionDetected = distance < radiiSum + FOOD_COLLISION_BUFFER;

            if (foodToRemove.has(f)) {
                return;
            }
            if (collisionDetected) {
                totalScore += f.score;
                foodToRemove.add(f);
            }
        });

        if (totalScore > 0) {
            player.maxLength += totalScore;
            player.radius = Math.min(MAX_PLAYER_RADIUS, player.radius + totalScore * RADIUS_GAIN_FACTOR);
        }
    }

    _calculateCollisionCentering(headPos, headRadius, collisionPoint) {
        const dx = collisionPoint.x - headPos.x;
        const dy = collisionPoint.y - headPos.y;
        const distanceFromCenter = Math.hypot(dx, dy);
        const normalizedDistance = distanceFromCenter / headRadius;
        return normalizedDistance;
    }

    _resolveHeadToHeadCollision(player, otherPlayer, playersToKill) {
        const collisionMidpoint = {
            x: (player.x + otherPlayer.x) / 2,
            y: (player.y + otherPlayer.y) / 2
        };

        const playerCentering = this._calculateCollisionCentering(
            { x: player.x, y: player.y },
            player.radius,
            collisionMidpoint
        );

        const otherPlayerCentering = this._calculateCollisionCentering(
            { x: otherPlayer.x, y: otherPlayer.y },
            otherPlayer.radius,
            collisionMidpoint
        );

        const sizeDifference = Math.abs(player.maxLength - otherPlayer.maxLength);
        const largerSize = Math.max(player.maxLength, otherPlayer.maxLength);
        const sizeRatio = largerSize > 0 ? sizeDifference / largerSize : 0;
        
        const centeringThreshold = 0.15;
        const sizeNegligibleThreshold = 0.1;

        const bothCentered = playerCentering < centeringThreshold && otherPlayerCentering < centeringThreshold;

        if (bothCentered) {
            playersToKill.add(player);
            playersToKill.add(otherPlayer);
            return;
        }

        if (sizeRatio < sizeNegligibleThreshold) {
            if (playerCentering < otherPlayerCentering) {
                playersToKill.add(otherPlayer);
            } else if (otherPlayerCentering < playerCentering) {
                playersToKill.add(player);
            } else {
                playersToKill.add(player);
                playersToKill.add(otherPlayer);
            }
        } else {
            const centeringDiff = Math.abs(playerCentering - otherPlayerCentering);
            
            if (centeringDiff > 0.2) {
                if (playerCentering > otherPlayerCentering) {
                    playersToKill.add(player);
                } else {
                    playersToKill.add(otherPlayer);
                }
            } else {
                if (player.maxLength > otherPlayer.maxLength) {
                    playersToKill.add(otherPlayer);
                } else {
                    playersToKill.add(player);
                }
            }
        }
    }

    processCollisions() {
        const playersToKill = new Set();
        const foodToRemove = new Set();
        const players = this.playerManager.getPlayers();
        const playerList = Object.values(players);

        for (const player of playerList) {
            if (player.isDead) continue;

            if (this._checkWorldBoundaryCollision(player, playersToKill)) continue;
            this._checkPowerupCollision(player);
            this._checkFoodCollision(player, foodToRemove);

            const queryRadius = player.radius + SNAKE_SEGMENT_RADIUS;
            const nearbyEntities = this.playerManager.playerSpatialHashing.query({
                x: player.x - queryRadius,
                y: player.y - queryRadius,
                width: queryRadius * 2,
                height: queryRadius * 2,
            });

            for (const entity of nearbyEntities) {
                const otherPlayer = entity.owner || entity;

                if (player.id === otherPlayer.id) continue;
                if (otherPlayer.isDead) continue;

                const isHeadCollision = (entity.id === otherPlayer.id);
                const radiiSum = isHeadCollision ? (player.radius + otherPlayer.radius) : (player.radius + SNAKE_SEGMENT_RADIUS);
                const distance = Math.hypot(player.x - entity.x, player.y - entity.y);

                if (distance < radiiSum) {
                    if (isHeadCollision) {
                        this._resolveHeadToHeadCollision(player, otherPlayer, playersToKill);
                    } else {
                        playersToKill.add(player);
                    }
                    break; 
                }
            }
        }

        if (foodToRemove.size > 0) {
            foodToRemove.forEach(f => this.foodManager.removeFood(f));
        }

        playersToKill.forEach(player => {
            if (!player.isDead) {
                this.room.killPlayer(player);
            }
        });
    }
}

export default CollisionSystem;
