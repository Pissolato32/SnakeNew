import { GoalType } from '../types/GoalType.js';
import { WORLD_SIZE } from '../../../shared/Constants.js';
import RNG from '../../services/RandomService.js';

class NavigationSystem {
    constructor(predictionSystem) {
        this.predictionSystem = predictionSystem;
    }

    update(agent, context) {
        // Possessão humana tem prioridade absoluta sobre Steering/AI.
        if (!agent || agent.isDead || agent.controller !== 'AI') return;

        const bb = agent.blackboard;
        if (!bb) return;

        const goal = bb.currentGoal;
        let steerVec = { x: 0, y: 0 };
        let boost = false;

        if (goal === GoalType.FEED && bb.targetFoodId) {
            const food = context.foodManager.food.get(bb.targetFoodId);
            if (food) {
                steerVec.x = food.x - agent.x;
                steerVec.y = food.y - agent.y;
                boost = agent.needs.hunger > 80 && agent.needs.energy > 30;
            }
        } else if (goal === GoalType.HUNT && bb.targetPreyId) {
            const prey = context.agentManager.getAgents()[bb.targetPreyId];
            if (prey && !prey.isDead) {
                const intercept = this.predictionSystem.calculateIntercept(agent, prey);
                steerVec.x = intercept.x - agent.x;
                steerVec.y = intercept.y - agent.y;
                boost = agent.strategy.aggression > 60 && agent.needs.energy > 30;
            }
        } else if (goal === GoalType.FLEE) {
            const threats = bb.worldModel?.threats || [];
            for (const threat of threats) {
                const dx = agent.x - threat.x;
                const dy = agent.y - threat.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    steerVec.x += (dx / dist) * threat.danger;
                    steerVec.y += (dy / dist) * threat.danger;
                }
            }
            boost = threats.length > 0 && agent.needs.energy > 15;
        } else if (goal === GoalType.EXPLORE) {
            steerVec = this.calculateExplorationSteering(agent);
        }

        if (steerVec.x === 0 && steerVec.y === 0) {
            const wanderAngle = agent.targetAngle + RNG.range(-0.2, 0.2);
            steerVec.x = Math.cos(wanderAngle);
            steerVec.y = Math.sin(wanderAngle);
        }

        const avoidanceVec = this.calculateAvoidance(agent, context);
        steerVec.x += avoidanceVec.x * 2.0;
        steerVec.y += avoidanceVec.y * 2.0;

        const mag = Math.hypot(steerVec.x, steerVec.y);
        if (mag > 0.01) agent.targetAngle = Math.atan2(steerVec.y, steerVec.x);
        agent.isBoosting = boost;
    }

    calculateExplorationSteering(agent) {
        const bb = agent.blackboard;
        if (!bb || !bb.visitedCells || !(bb.visitedCells instanceof Map)) return { x: 0, y: 0 };

        const cellX = Math.floor(agent.x / 600);
        const cellY = Math.floor(agent.y / 600);
        let bestCell = null;
        let bestCellScore = -Infinity;

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const nx = cellX + dx;
                const ny = cellY + dy;
                const key = `${nx},${ny}`;
                const memoryCell = bb.visitedCells.get(key);
                let novelty = 100;
                if (memoryCell) {
                    const elapsedMs = Date.now() - memoryCell.timestamp;
                    const decayedVisits = memoryCell.visitCount * Math.exp(-0.00005 * elapsedMs);
                    novelty = Math.max(0, 100 - decayedVisits * 10);
                }
                if (novelty > bestCellScore) {
                    bestCellScore = novelty;
                    bestCell = { x: nx * 600 + 300, y: ny * 600 + 300 };
                }
            }
        }

        return bestCell ? { x: bestCell.x - agent.x, y: bestCell.y - agent.y } : { x: 0, y: 0 };
    }

    calculateAvoidance(agent, context) {
        let vec = { x: 0, y: 0 };
        const distFromCenter = Math.hypot(agent.x, agent.y);
        const radiusLimit = WORLD_SIZE / 2 - 500;
        if (distFromCenter > radiusLimit) {
            const angleToCenter = Math.atan2(-agent.y, -agent.x);
            const force = (distFromCenter - radiusLimit) / 500;
            vec.x += Math.cos(angleToCenter) * force;
            vec.y += Math.sin(angleToCenter) * force;
        }

        if (agent.isOffline) return vec;

        const queryRadius = agent.radius + 80;
        const nearbySegments = context.agentManager.agentSpatialHashing.query({
            x: agent.x - queryRadius,
            y: agent.y - queryRadius,
            width: queryRadius * 2,
            height: queryRadius * 2
        });

        for (const segment of nearbySegments) {
            const owner = segment.owner || segment;
            if (owner.id === agent.id) continue;
            const dx = agent.x - segment.x;
            const dy = agent.y - segment.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0 && dist < 150) {
                const force = (150 - dist) / 75;
                vec.x += (dx / dist) * force;
                vec.y += (dy / dist) * force;
            }
        }
        return vec;
    }
}

export default NavigationSystem;
