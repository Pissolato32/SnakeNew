import { GoalType } from '../types/GoalType.js';

class HuntEvaluator {
    evaluate(agent, context) {
        const aggressionDrive = agent.strategy.aggression;
        const focus = agent.focus?.combat ?? 3;
        if (aggressionDrive < 20 || focus === 1) {
            return { score: 0, goal: GoalType.HUNT, targetId: null, reasons: ['Combate com prioridade insuficiente'] };
        }

        const opps = agent.blackboard?.worldModel?.opportunities || [];
        const bestPrey = opps.find(o => o.type === 'prey');
        if (!bestPrey) return { score: 0, goal: GoalType.HUNT, targetId: null, reasons: ['Nenhuma presa viável no alcance'] };

        const focusMultiplier = 0.5 + (focus / 5);
        const score = bestPrey.score * focusMultiplier;
        return {
            score,
            goal: GoalType.HUNT,
            targetId: bestPrey.id,
            reasons: [
                `+ presa menor no radar (score de oportunidade: ${bestPrey.score})`,
                `+ foco combate ${focus}/5 (x${focusMultiplier.toFixed(2)})`,
                `+ agressividade ativa (+${aggressionDrive})`
            ]
        };
    }
}

export default HuntEvaluator;
