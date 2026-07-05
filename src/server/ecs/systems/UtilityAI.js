import config from '../../../../config/index.js';
import RNG from '../../services/RandomService.js';

class UtilityAI {
    update(agent, context) {
        // Reduz o cooldown de decisão, se houver
        if (agent.blackboard.decisionCooldown > 0) {
            agent.blackboard.decisionCooldown--;
        }

        // Em uma Utility AI real, todos os objetivos (Goals/Ações) competem.
        const actions = [
            this.scoreExploreAction(agent),
            this.scoreFeedAction(agent),
            this.scoreFleeAction(agent),
            this.scoreHuntAction(agent) // Implementar caça ativa de agentes menores
        ];

        // Escolhe a ação com o maior score
        let bestAction = actions[0];
        for (const action of actions) {
            if (action.score > bestAction.score) {
                bestAction = action;
            }
        }

        // Se encontrou uma nova ação excelente, ou o cooldown expirou, muda de ação
        if (bestAction.score > (agent.blackboard.lastDecision?.score || 0) + 10 || agent.blackboard.decisionCooldown <= 0) {
            agent.blackboard.currentGoal = bestAction.goal;
            agent.blackboard.lastDecision = bestAction;
            agent.blackboard.decisionCooldown = 15; // Mantém a decisão por um tempo (ex: 3 ticks de AI)
        }

        // Executa o vetor de Steering baseado na ação vencedora
        let finalVector = bestAction.vector;
        agent.isBoosting = bestAction.boost;

        // Adiciona Avoidance (instintivo, roda sobre a camada racional)
        const avoidanceVector = this.calculateAvoidance(agent, context);
        finalVector.x += avoidanceVector.x;
        finalVector.y += avoidanceVector.y;

        const mag = Math.hypot(finalVector.x, finalVector.y);
        if (mag > 0.01) {
            agent.targetAngle = Math.atan2(finalVector.y, finalVector.x);
        }
    }

    scoreExploreAction(agent) {
        // Explorar sempre tem um peso base, influenciado pela Curiosidade e Confiança
        const baseScore = 30;
        const curiosityBonus = agent.strategy.curiosity * 0.2;
        const score = baseScore + curiosityBonus;

        // Vetor Wander
        const wanderAngle = agent.targetAngle + RNG.range(-0.5, 0.5);
        return {
            goal: 'EXPLORE',
            score: score,
            vector: { x: Math.cos(wanderAngle), y: Math.sin(wanderAngle) },
            boost: false
        };
    }

    scoreFeedAction(agent) {
        if (!agent.blackboard.lastKnownFood || agent.blackboard.lastKnownFood.length === 0) {
            return { goal: 'FEED', score: 0, vector: { x: 0, y: 0 }, boost: false };
        }

        // Fome aumenta enormemente o apelo de comer
        const hungerDrive = agent.needs.hunger * 1.5;

        let bestFood = null;
        let bestFoodScore = -Infinity;

        for (const food of agent.blackboard.lastKnownFood) {
            const dist = Math.hypot(agent.x - food.x, agent.y - food.y);
            // Avalia o item de comida
            let itemScore = (food.score * 50) - dist;

            // Cautela: se a comida estiver no dangerMap ou perto de threat
            if (agent.strategy.caution > agent.strategy.greed) {
                for (const threat of agent.blackboard.knownThreats) {
                    if (Math.hypot(food.x - threat.x, food.y - threat.y) < 300) {
                        itemScore -= 200 * (agent.strategy.caution / 50);
                    }
                }
            }
            if (itemScore > bestFoodScore) {
                bestFoodScore = itemScore;
                bestFood = food;
            }
        }

        const finalScore = bestFoodScore > -Infinity ? (bestFoodScore * 0.1) + hungerDrive : 0;

        if (bestFood && finalScore > 0) {
            return {
                goal: 'FEED',
                score: finalScore,
                vector: { x: bestFood.x - agent.x, y: bestFood.y - agent.y },
                boost: agent.needs.hunger > 80 && agent.needs.energy > 30 // Usa boost se estiver desesperado
            };
        }
        return { goal: 'FEED', score: 0, vector: { x: 0, y: 0 }, boost: false };
    }

    scoreFleeAction(agent) {
        if (!agent.blackboard.knownThreats || agent.blackboard.knownThreats.length === 0) {
            return { goal: 'FLEE', score: 0, vector: { x: 0, y: 0 }, boost: false };
        }

        let totalThreat = 0;
        let fleeVec = { x: 0, y: 0 };

        for (const threat of agent.blackboard.knownThreats) {
            const dx = agent.x - threat.x;
            const dy = agent.y - threat.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0 && dist < 1000) {
                // Quão maior o inimigo e mais perto, maior a ameaça
                const sizeRatio = threat.maxLength / agent.maxLength;
                const threatLevel = (1000 - dist) * sizeRatio;
                totalThreat += threatLevel;

                fleeVec.x += (dx / dist) * threatLevel;
                fleeVec.y += (dy / dist) * threatLevel;
            }
        }

        // Medo (Fear) e Cautela amplificam o score de fuga
        const fearDrive = agent.needs.fear * 2;
        const score = (totalThreat * 0.05 * (agent.strategy.caution / 50)) + fearDrive;

        return {
            goal: 'FLEE',
            score: score,
            vector: fleeVec,
            boost: score > 50 && agent.needs.energy > 10 // Foge com boost se perigo for alto
        };
    }

    scoreHuntAction(agent) {
        // Para caçar, precisa de Agressividade, Confiança e falta de Fome excessiva (ou ganância)
        const aggressionDrive = agent.strategy.aggression;
        if (aggressionDrive < 30) return { goal: 'HUNT', score: 0, vector: {x:0, y:0}, boost: false };

        // TODO: Escanear array de agentes menores no blackboard (knownPrey)
        // Por enquanto, placeholder
        return { goal: 'HUNT', score: 0, vector: {x:0, y:0}, boost: false };
    }

    calculateAvoidance(agent, context) {
        let vec = { x: 0, y: 0 };
        const WORLD_SIZE = config.game ? config.game.WORLD_SIZE : 30000;
        const BOUNDARY_BUFFER = config.game ? config.game.BOT_BOUNDARY_BUFFER : 500;

        if (agent.x < BOUNDARY_BUFFER) vec.x += 1;
        if (agent.x > WORLD_SIZE - BOUNDARY_BUFFER) vec.x -= 1;
        if (agent.y < BOUNDARY_BUFFER) vec.y += 1;
        if (agent.y > WORLD_SIZE - BOUNDARY_BUFFER) vec.y -= 1;

        return vec;
    }
}

export default UtilityAI;
