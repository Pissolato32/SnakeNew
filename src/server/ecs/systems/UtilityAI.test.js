import UtilityAI from './UtilityAI.js';
import { GoalType } from '../types/GoalType.js';
import FeedEvaluator from './FeedEvaluator.js';
import HuntEvaluator from './HuntEvaluator.js';
import FleeEvaluator from './FleeEvaluator.js';
import ExploreEvaluator from './ExploreEvaluator.js';

describe('UtilityAI Modular and Evaluators', () => {
    let utilityAI;
    let agent;
    let context;

    beforeEach(() => {
        utilityAI = new UtilityAI();
        agent = {
            id: 'agent_1',
            x: 0,
            y: 0,
            maxLength: 50,
            targetAngle: 0,
            isBoosting: false,
            strategy: {
                aggression: 50,
                caution: 50,
                greed: 50,
                curiosity: 50
            },
            needs: {
                hunger: 10,
                energy: 100,
                stress: 0,
                fear: 0
            },
            blackboard: {
                currentGoal: GoalType.EXPLORE,
                decisionCooldown: 0,
                lastKnownFood: [],
                knownThreats: [],
                knownPrey: [],
                dangerMap: [],
                worldModel: { opportunities: [], threats: [] },
                visitedCells: new Map()
            }
        };
        context = {
            agentManager: {
                getAgents: () => ({})
            },
            foodManager: {
                food: new Map()
            },
            tickCount: 123
        };
    });

    test('should select FEED goal when starving and food is available', () => {
        agent.needs.hunger = 95;
        // Qualifica oportunidade de comida no worldModel
        agent.blackboard.worldModel.opportunities = [
            { type: 'food', id: 'food_1', score: 80, x: 10, y: 10 }
        ];

        utilityAI.update(agent, context);

        expect(agent.blackboard.currentGoal).toBe(GoalType.FEED);
        expect(agent.blackboard.targetFoodId).toBe('food_1');
        
        // Verifica se o trace foi gerado
        expect(agent.blackboard.decisionTrace).toBeDefined();
        expect(agent.blackboard.decisionTrace.chosenGoal).toBe(GoalType.FEED);
        expect(agent.blackboard.decisionTrace.tick).toBe(123);
    });

    test('should evaluate FEED score accurately in FeedEvaluator', () => {
        const evaluator = new FeedEvaluator();
        agent.needs.hunger = 80;
        agent.blackboard.worldModel.opportunities = [
            { type: 'food', id: 'f1', score: 100 }
        ];

        const res = evaluator.evaluate(agent, context);
        expect(res.goal).toBe(GoalType.FEED);
        // score = 100 * 0.1 + (80 * 1.5) = 10 + 120 = 130
        expect(res.score).toBe(130);
    });

    test('should evaluate HUNT score accurately in HuntEvaluator', () => {
        const evaluator = new HuntEvaluator();
        agent.strategy.aggression = 80;
        agent.blackboard.worldModel.opportunities = [
            { type: 'prey', id: 'prey1', score: 150 }
        ];

        const res = evaluator.evaluate(agent, context);
        expect(res.goal).toBe(GoalType.HUNT);
        expect(res.score).toBe(150);
        expect(res.targetId).toBe('prey1');
    });
});
