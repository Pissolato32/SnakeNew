import { GoalType } from '../types/GoalType.js';
import { WORLD_SIZE } from '../../../shared/Constants.js';
import RNG from '../../services/RandomService.js';

class NavigationSystem {
    constructor(predictionSystem) {
        this.predictionSystem = predictionSystem;
    }

    update(agent, context) {
        const bb = agent.blackboard;
        if (!bb) return;

        const goal = bb.currentGoal;
        let steerVec = { x: 0, y: 0 };
        let boost = false;

        // 1. Calcula o vetor de intenção primária baseado na Meta
        if (goal === GoalType.FEED && bb.targetFoodId) {
            const food = context.foodManager.food.get(bb.targetFoodId);
            if (food) {
                steerVec.x = food.x - agent.x;
                steerVec.y = food.y - agent.y;
                boost = agent.needs.hunger > 80 && agent.needs.energy > 30;
            }
        } 
        
        else if (goal === GoalType.HUNT && bb.targetPreyId) {
            const prey = context.agentManager.getAgents()[bb.targetPreyId];
            if (prey && !prey.isDead) {
                // Usa PredictionSystem para obter interceptação inteligente
                const intercept = this.predictionSystem.calculateIntercept(agent, prey);
                steerVec.x = intercept.x - agent.x;
                steerVec.y = intercept.y - agent.y;
                boost = agent.strategy.aggression > 60 && agent.needs.energy > 30;
            }
        } 
        
        else if (goal === GoalType.FLEE) {
            // Foge das ameaças interpretadas no World Model
            const threats = bb.worldModel?.threats || [];
            let fleeX = 0;
            let fleeY = 0;
            for (const threat of threats) {
                const dx = agent.x - threat.x;
                const dy = agent.y - threat.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    // Quanto maior o perigo, mais forte a força de repulsão
                    fleeX += (dx / dist) * threat.danger;
                    fleeY += (dy / dist) * threat.danger;
                }
            }
            steerVec.x = fleeX;
            steerVec.y = fleeY;
            boost = threats.length > 0 && agent.needs.energy > 15;
        } 
        
        else if (goal === GoalType.EXPLORE) {
            // Direciona o agente a navegar em direção a células de novidade na grade
            steerVec = this.calculateExplorationSteering(agent);
            boost = false;
        }

        // Se o vetor primário for nulo, mantém o Wander como fallback
        if (steerVec.x === 0 && steerVec.y === 0) {
            const wanderAngle = agent.targetAngle + RNG.range(-0.2, 0.2);
            steerVec.x = Math.cos(wanderAngle);
            steerVec.y = Math.sin(wanderAngle);
        }

        // 2. Adiciona forças instintivas de AVOIDANCE (Evitação de colisões)
        const avoidanceVec = this.calculateAvoidance(agent, context);
        steerVec.x += avoidanceVec.x * 2.0;
        steerVec.y += avoidanceVec.y * 2.0;

        // 3. Aplica direção e boost no Agente
        const mag = Math.hypot(steerVec.x, steerVec.y);
        if (mag > 0.01) {
            agent.targetAngle = Math.atan2(steerVec.y, steerVec.x);
        }
        agent.isBoosting = boost;
    }

    /**
     * Calcula o vetor de navegação direcionado a células com maior grau de novidade espacial
     */
    calculateExplorationSteering(agent) {
        const bb = agent.blackboard;
        if (!bb || !bb.visitedCells || !(bb.visitedCells instanceof Map)) {
            return { x: 0, y: 0 };
        }

        const cellX = Math.floor(agent.x / 600);
        const cellY = Math.floor(agent.y / 600);
        let bestCell = null;
        let bestCellScore = -Infinity;

        // Avalia as 8 células vizinhas
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;

                const nx = cellX + dx;
                const ny = cellY + dy;
                const key = `${nx},${ny}`;

                const memoryCell = bb.visitedCells.get(key);
                let novelty = 100; // Máxima novidade por padrão

                if (memoryCell) {
                    // Esquecimento exponencial lazily calculado O(1)
                    const elapsedMs = Date.now() - memoryCell.timestamp;
                    const lambda = 0.00005; // Taxa de esquecimento
                    const decayedVisits = memoryCell.visitCount * Math.exp(-lambda * elapsedMs);
                    novelty = Math.max(0, 100 - decayedVisits * 10);
                }

                // Score de exploração simples: prioriza novidade
                const score = novelty;

                if (score > bestCellScore) {
                    bestCellScore = score;
                    bestCell = { x: nx * 600 + 300, y: ny * 600 + 300 };
                }
            }
        }

        if (bestCell) {
            return {
                x: bestCell.x - agent.x,
                y: bestCell.y - agent.y
            };
        }

        return { x: 0, y: 0 };
    }

    /**
     * Calcula forças de repulsão instintivas para evitar bordas e corpos de cobras
     */
    calculateAvoidance(agent, context) {
        let vec = { x: 0, y: 0 };

        // 1. Evitação de Bordas
        const distFromCenter = Math.hypot(agent.x, agent.y);
        const radiusLimit = WORLD_SIZE / 2 - 500;
        if (distFromCenter > radiusLimit) {
            const angleToCenter = Math.atan2(-agent.y, -agent.x);
            const force = (distFromCenter - radiusLimit) / 500;
            vec.x += Math.cos(angleToCenter) * force;
            vec.y += Math.sin(angleToCenter) * force;
        }

        // Se o agente estiver offline/dormindo, evita cálculos pesados de desvio de corpos
        if (agent.isOffline) {
            return vec;
        }

        // 2. Evitação de Corpos (Segmentos de outras cobras próximas)
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

            // Se estiver muito próximo (iminência de colisão), aplica repulsão
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
