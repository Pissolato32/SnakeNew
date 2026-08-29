import { GoalType } from '../types/GoalType.js';
import FeedEvaluator from './FeedEvaluator.js';
import HuntEvaluator from './HuntEvaluator.js';
import FleeEvaluator from './FleeEvaluator.js';
import ExploreEvaluator from './ExploreEvaluator.js';

class UtilityAI {
    constructor() {
        this.evaluators = [new FeedEvaluator(), new HuntEvaluator(), new FleeEvaluator(), new ExploreEvaluator()];
    }

    update(agent, context) {
        if (!agent || agent.isDead || agent.controller !== 'AI') return;
        const bb = agent.blackboard;
        if (!bb) return;
        if (bb.decisionCooldown > 0) bb.decisionCooldown--;

        const now = Date.now();
        let shouldReplan = false;
        if (!bb.currentGoal || !bb.goalExpirationTime || now >= bb.goalExpirationTime) shouldReplan = true;
        if (agent.maxLength < (bb.lastKnownLength || agent.maxLength)) shouldReplan = true;
        bb.lastKnownLength = agent.maxLength;
        if (agent.needs.hunger > 80 && bb.currentGoal !== GoalType.FEED) shouldReplan = true;
        if (agent.needs.fear > 50 && bb.currentGoal !== GoalType.FLEE) shouldReplan = true;
        if (bb.currentGoal === GoalType.FEED && (!bb.targetFoodId || !context.foodManager.food.has(bb.targetFoodId))) shouldReplan = true;
        if (bb.currentGoal === GoalType.HUNT && (!context.agentManager.getAgents()[bb.targetPreyId] || context.agentManager.getAgents()[bb.targetPreyId].isDead)) shouldReplan = true;
        if (!shouldReplan) return;

        const results = this.evaluators.map(evaluator => {
            try {
                const result = evaluator.evaluate(agent, context);
                return { ...result, score: this.applyPredispositions(agent, result) };
            } catch {
                return { score: -Infinity, goal: GoalType.EXPLORE, targetId: null, reasons: ['Erro no avaliador'] };
            }
        });

        const best = results.reduce((max, r) => r.score > max.score ? r : max, { score: -Infinity, goal: GoalType.EXPLORE, targetId: null, reasons: [] });
        bb.currentGoal = best.goal;
        bb.goalExpirationTime = now + 5000;
        if (best.goal === GoalType.FEED) bb.targetFoodId = best.targetId;
        else if (best.goal === GoalType.HUNT) bb.targetPreyId = best.targetId;

        bb.decisionTrace = {
            tick: context.tickCount || 0,
            chosenGoal: best.goal,
            scores: Object.fromEntries(results.map(r => [r.goal, r.score])),
            reasons: best.reasons
        };
        bb.lastDecision = best;
    }

    applyPredispositions(agent, result) {
        const traits = agent.traitWeights || {};
        const multipliers = {
            [GoalType.HUNT]: 1 + (traits.aggression || 0) * 0.5,
            [GoalType.FLEE]: 1 + (traits.caution || 0) * 0.5,
            [GoalType.FEED]: 1 + (traits.greed || 0) * 0.3,
            [GoalType.EXPLORE]: 1 + (traits.curiosity || 0) * 0.3
        };
        const multiplier = Math.max(0.75, Math.min(1.25, multipliers[result.goal] || 1));
        return result.score * multiplier;
    }
}

export default UtilityAI;
