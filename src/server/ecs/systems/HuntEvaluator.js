import { GoalType } from '../types/GoalType.js';

class HuntEvaluator {
    evaluate(agent, context) {
        const aggressionDrive = agent.strategy.aggression;
        if (aggressionDrive < 20) {
            return { score: 0, goal: GoalType.HUNT, targetId: null, reasons: ['Agressividade muito baixa'] };
        }

        const opps = agent.blackboard?.worldModel?.opportunities || [];
        const bestPrey = opps.find(o => o.type === 'prey');

        if (!bestPrey) {
            return { score: 0, goal: GoalType.HUNT, targetId: null, reasons: ['Nenhuma presa viável no alcance'] };
        }

        return {
            score: bestPrey.score,
            goal: GoalType.HUNT,
            targetId: bestPrey.id,
            reasons: [
                `+ presa menor no radar (score de oportunidade: ${bestPrey.score})`,
                `+ agressividade ativa (+${aggressionDrive})`
            ]
        };
    }
}

export default HuntEvaluator;
