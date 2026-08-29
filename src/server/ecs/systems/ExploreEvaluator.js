import { GoalType } from '../types/GoalType.js';

class ExploreEvaluator {
    evaluate(agent, context) {
        const baseScore = 30;
        const curiosityBonus = agent.strategy.curiosity * 0.2;
        const focus = agent.focus?.exploration ?? 3;
        const focusMultiplier = 0.5 + (focus / 5);
        const score = (baseScore + curiosityBonus) * focusMultiplier;

        return {
            score,
            goal: GoalType.EXPLORE,
            targetId: null,
            reasons: [
                `+ foco exploração ${focus}/5 (x${focusMultiplier.toFixed(2)})`,
                `+ curiosidade exploração (+${curiosityBonus.toFixed(1)})`,
                `+ base wander (+${baseScore})`
            ]
        };
    }
}

export default ExploreEvaluator;
