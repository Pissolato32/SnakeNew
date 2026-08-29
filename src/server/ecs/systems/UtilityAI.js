import { GoalType } from '../types/GoalType.js';
import FeedEvaluator from './FeedEvaluator.js';
import HuntEvaluator from './HuntEvaluator.js';
import FleeEvaluator from './FleeEvaluator.js';
import ExploreEvaluator from './ExploreEvaluator.js';

class UtilityAI {
    constructor() {
        this.evaluators = [
            new FeedEvaluator(),
            new HuntEvaluator(),
            new FleeEvaluator(),
            new ExploreEvaluator()
        ];
    }

    update(agent, context) {
        // Uma minhoca sob controle humano continua sendo simulada fisicamente,
        // mas não deve receber decisões autônomas que substituam o jogador.
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

        if (bb.currentGoal === GoalType.FEED) {
            const targetFoodId = bb.targetFoodId;
            if (!targetFoodId || !context.foodManager.food.has(targetFoodId)) shouldReplan = true;
        }

        if (bb.currentGoal === GoalType.HUNT) {
            const targetPreyId = bb.targetPreyId;
            const prey = context.agentManager.getAgents()[targetPreyId];
            if (!prey || prey.isDead) shouldReplan = true;
        }

        if (!shouldReplan) return;

        const results = this.evaluators.map(evaluator => {
            try {
                return evaluator.evaluate(agent, context);
            } catch (err) {
                return { score: -Infinity, goal: GoalType.EXPLORE, targetId: null, reasons: ['Erro no avaliador'] };
            }
        });

        const best = results.reduce(
            (max, r) => r.score > max.score ? r : max,
            { score: -Infinity, goal: GoalType.EXPLORE, targetId: null, reasons: [] }
        );

        bb.currentGoal = best.goal;
        bb.goalExpirationTime = now + 5000;

        if (best.goal === GoalType.FEED) bb.targetFoodId = best.targetId;
        else if (best.goal === GoalType.HUNT) bb.targetPreyId = best.targetId;

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

export default UtilityAI;
