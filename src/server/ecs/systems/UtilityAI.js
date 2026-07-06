import { GoalType } from '../types/GoalType.js';
import FeedEvaluator from './FeedEvaluator.js';
import HuntEvaluator from './HuntEvaluator.js';
import FleeEvaluator from './FleeEvaluator.js';
import ExploreEvaluator from './ExploreEvaluator.js';

class UtilityAI {
    constructor() {
        // Registra avaliadores comportamentais desacoplados (Open/Closed)
        this.evaluators = [
            new FeedEvaluator(),
            new HuntEvaluator(),
            new FleeEvaluator(),
            new ExploreEvaluator()
        ];
    }

    update(agent, context) {
        const bb = agent.blackboard;
        if (!bb) return;

        // Reduz o cooldown de decisão, se houver
        if (bb.decisionCooldown > 0) {
            bb.decisionCooldown--;
        }

        const now = Date.now();
        let shouldReplan = false;

        // 1. Invalidações de Cache (Gatilhos de Replanejamento por Eventos Críticos)
        if (!bb.currentGoal || !bb.goalExpirationTime || now >= bb.goalExpirationTime) {
            shouldReplan = true;
        }

        // Alteração de integridade (tomou dano/colidiu)
        if (agent.maxLength < (bb.lastKnownLength || agent.maxLength)) {
            shouldReplan = true;
        }
        bb.lastKnownLength = agent.maxLength;

        // Mudança crítica de necessidades (Fome urgente)
        if (agent.needs.hunger > 80 && bb.currentGoal !== GoalType.FEED) {
            shouldReplan = true;
        }

        // Ameaça iminente detectada (Medo urgente)
        if (agent.needs.fear > 50 && bb.currentGoal !== GoalType.FLEE) {
            shouldReplan = true;
        }

        // Perda de alvo de comida
        if (bb.currentGoal === GoalType.FEED) {
            const targetFoodId = bb.targetFoodId;
            if (!targetFoodId || !context.foodManager.food.has(targetFoodId)) {
                shouldReplan = true;
            }
        }

        // Perda de alvo de caça
        if (bb.currentGoal === GoalType.HUNT) {
            const targetPreyId = bb.targetPreyId;
            const prey = context.agentManager.getAgents()[targetPreyId];
            if (!prey || prey.isDead) {
                shouldReplan = true;
            }
        }

        // 2. Executa planejamento de nova meta se necessário
        if (shouldReplan) {
            // Roda todos os avaliadores modulares registrados
            const results = this.evaluators.map(evaluator => {
                try {
                    return evaluator.evaluate(agent, context);
                } catch (err) {
                    return { score: -Infinity, goal: GoalType.EXPLORE, targetId: null, reasons: ['Erro no avaliador'] };
                }
            });

            // Encontra a melhor ação racional
            const best = results.reduce((max, r) => r.score > max.score ? r : max, { score: -Infinity, goal: GoalType.EXPLORE, targetId: null, reasons: [] });

            bb.currentGoal = best.goal;
            bb.goalExpirationTime = now + 5000; // TTL: 5 segundos

            if (best.goal === GoalType.FEED) {
                bb.targetFoodId = best.targetId;
            } else if (best.goal === GoalType.HUNT) {
                bb.targetPreyId = best.targetId;
            }

            // Grava rastreabilidade Decision Tracing explicável
            bb.decisionTrace = {
                tick: context.tickCount || 0,
                chosenGoal: best.goal,
                scores: {
                    FEED: results.find(r => r.goal === GoalType.FEED)?.score || 0,
                    HUNT: results.find(r => r.goal === GoalType.HUNT)?.score || 0,
                    FLEE: results.find(r => r.goal === GoalType.FLEE)?.score || 0,
                    EXPLORE: results.find(r => r.goal === GoalType.EXPLORE)?.score || 0
                },
                reasons: best.reasons
            };

            bb.lastDecision = best;
        }
    }
}

export default UtilityAI;
