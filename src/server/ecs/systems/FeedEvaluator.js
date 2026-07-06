import { GoalType } from '../types/GoalType.js';

class FeedEvaluator {
    evaluate(agent, context) {
        const opps = agent.blackboard?.worldModel?.opportunities || [];
        const bestFood = opps.find(o => o.type === 'food');

        if (!bestFood) {
            return { score: 0, goal: GoalType.FEED, targetId: null, reasons: ['Nenhuma comida avistada'] };
        }

        const hungerDrive = agent.needs.hunger * 1.5;
        const score = (bestFood.score * 0.1) + hungerDrive;

        return {
            score,
            goal: GoalType.FEED,
            targetId: bestFood.id,
            reasons: [
                `+ fome alta (+${hungerDrive.toFixed(1)})`,
                `+ proximidade do recurso (+${(bestFood.score * 0.1).toFixed(1)})`
            ]
        };
    }
}

export default FeedEvaluator;
