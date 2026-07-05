import { 
    WORLD_SIZE, 
    Creature_SEGMENT_RADIUS,
    FOOD_COLLISION_BUFFER, 
    RADIUS_GAIN_FACTOR,
    MAX_PLAYER_RADIUS
} from '../shared/Constants.js';

class CollisionSystem {
    constructor(agentManager, foodManager, powerupManager, Region, logger) {
        this.agentManager = agentManager;
        this.foodManager = foodManager;
        this.powerupManager = powerupManager;
        this.Region = Region;
        this.logger = logger;
    }

    _checkWorldBoundaryCollision(agent, agentsToKill) {
        if (Math.hypot(agent.x, agent.y) > WORLD_SIZE / 2 - agent.radius) {
            agentsToKill.add(agent);
            return true;
        }
        for (let i = 0; i < agent.body.length; i++) {
            const segment = agent.body.get(i);
            if (!segment) continue;
            if (Math.hypot(segment.x, segment.y) > WORLD_SIZE / 2) {
                this.logger.debug(`Agent ${agent.id} body segment ${i} out of bounds, killing agent.`);
                agentsToKill.add(agent);
                return true;
            }
        }
        return false;
    }

    _checkPowerupCollision(agent) {
        const queryRadius = agent.radius + 20; // Use a generous radius for the query
        const nearbyPowerups = this.powerupManager.powerupSpatialHashing.query({
            x: agent.x - queryRadius,
            y: agent.y - queryRadius,
            width: queryRadius * 2,
            height: queryRadius * 2,
        });

        for (const p of nearbyPowerups) {
            if (Math.hypot(agent.x - p.x, agent.y - p.y) < agent.radius + p.radius) {
                if (p.type === 'FOOD_MAGNET') {
                    agent.powerups.foodMagnet = { attractOnce: true };
                }
                this.powerupManager.removePowerup(p);
                break; // Assume agent can only pick up one powerup at a time
            }
        }
    }

    _checkFoodCollision(agent, foodToRemove) {
        if (agent.isDead) return;

        const nearbyFood = this.foodManager.foodSpatialHashing.query({
            x: agent.x - agent.radius - FOOD_COLLISION_BUFFER,
            y: agent.y - agent.radius - FOOD_COLLISION_BUFFER,
            width: (agent.radius + FOOD_COLLISION_BUFFER) * 2,
            height: (agent.radius + FOOD_COLLISION_BUFFER) * 2
        });

        let totalScore = 0;
        nearbyFood.forEach(f => {
            const distance = Math.hypot(agent.x - f.x, agent.y - f.y);
            const radiiSum = agent.radius + f.radius;
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
            agent.maxLength += totalScore;
            agent.radius = Math.min(MAX_PLAYER_RADIUS, agent.radius + totalScore * RADIUS_GAIN_FACTOR);
        }
    }

    _calculateCollisionCentering(headPos, headRadius, collisionPoint) {
        const dx = collisionPoint.x - headPos.x;
        const dy = collisionPoint.y - headPos.y;
        const distanceFromCenter = Math.hypot(dx, dy);
        const normalizedDistance = distanceFromCenter / headRadius;
        return normalizedDistance;
    }

    _resolveHeadToHeadCollision(agent, otherAgent, agentsToKill) {
        const collisionMidpoint = {
            x: (agent.x + otherAgent.x) / 2,
            y: (agent.y + otherAgent.y) / 2
        };

        const agentCentering = this._calculateCollisionCentering(
            { x: agent.x, y: agent.y },
            agent.radius,
            collisionMidpoint
        );

        const otherAgentCentering = this._calculateCollisionCentering(
            { x: otherAgent.x, y: otherAgent.y },
            otherAgent.radius,
            collisionMidpoint
        );

        const sizeDifference = Math.abs(agent.maxLength - otherAgent.maxLength);
        const largerSize = Math.max(agent.maxLength, otherAgent.maxLength);
        const sizeRatio = largerSize > 0 ? sizeDifference / largerSize : 0;
        
        const centeringThreshold = 0.15;
        const sizeNegligibleThreshold = 0.1;

        const bothCentered = agentCentering < centeringThreshold && otherAgentCentering < centeringThreshold;

        if (bothCentered) {
            agentsToKill.add(agent);
            agentsToKill.add(otherAgent);
            return;
        }

        if (sizeRatio < sizeNegligibleThreshold) {
            if (agentCentering < otherAgentCentering) {
                agentsToKill.add(otherAgent);
            } else if (otherAgentCentering < agentCentering) {
                agentsToKill.add(agent);
            } else {
                agentsToKill.add(agent);
                agentsToKill.add(otherAgent);
            }
        } else {
            const centeringDiff = Math.abs(agentCentering - otherAgentCentering);
            
            if (centeringDiff > 0.2) {
                if (agentCentering > otherAgentCentering) {
                    agentsToKill.add(agent);
                } else {
                    agentsToKill.add(otherAgent);
                }
            } else {
                if (agent.maxLength > otherAgent.maxLength) {
                    agentsToKill.add(otherAgent);
                } else {
                    agentsToKill.add(agent);
                }
            }
        }
    }

    processCollisions() {
        const agentsToKill = new Set();
        const foodToRemove = new Set();
        const agents = this.agentManager.getAgents();
        const agentList = Object.values(agents);

        for (const agent of agentList) {
            if (agent.isDead) continue;

            if (this._checkWorldBoundaryCollision(agent, agentsToKill)) continue;
            this._checkPowerupCollision(agent);
            this._checkFoodCollision(agent, foodToRemove);

            const queryRadius = agent.radius + Creature_SEGMENT_RADIUS;
            const nearbyEntities = this.agentManager.agentSpatialHashing.query({
                x: agent.x - queryRadius,
                y: agent.y - queryRadius,
                width: queryRadius * 2,
                height: queryRadius * 2,
            });

            for (const entity of nearbyEntities) {
                const otherAgent = entity.owner || entity;

                if (agent.id === otherAgent.id) continue;
                if (otherAgent.isDead) continue;

                const isHeadCollision = (entity.id === otherAgent.id);
                const radiiSum = isHeadCollision ? (agent.radius + otherAgent.radius) : (agent.radius + Creature_SEGMENT_RADIUS);
                const distance = Math.hypot(agent.x - entity.x, agent.y - entity.y);

                if (distance < radiiSum) {
                    if (isHeadCollision) {
                        this._resolveHeadToHeadCollision(agent, otherAgent, agentsToKill);
                    } else {
                        agentsToKill.add(agent);
                    }
                    break; 
                }
            }
        }

        if (foodToRemove.size > 0) {
            foodToRemove.forEach(f => this.foodManager.removeFood(f));
        }

        agentsToKill.forEach(agent => {
            if (!agent.isDead) {
                this.Region.killAgent(agent);
            }
        });
    }
}

export default CollisionSystem;
