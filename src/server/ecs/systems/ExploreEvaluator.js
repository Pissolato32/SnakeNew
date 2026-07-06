import { GoalType } from '../types/GoalType.js';

class ExploreEvaluator {
    evaluate(agent, context) {
        const baseScore = 30;
        const curiosityBonus = agent.strategy.curiosity * 0.2;
        const score = baseScore + curiosityBonus;

        return {
            score,
            goal: GoalType.EXPLORE,
            targetId: null,
            reasons: [
                `+ curiosidade exploração (+${curiosityBonus.toFixed(1)})`,
                `+ base wander (+${baseScore})`
            ]
        };
    }
}

export default ExploreEvaluator;
