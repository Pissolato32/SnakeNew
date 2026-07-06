import NavigationSystem from './NavigationSystem.js';
import { GoalType } from '../types/GoalType.js';

describe('NavigationSystem', () => {
    let navigationSystem;
    let mockPredictionSystem;
    let context;

    beforeEach(() => {
        mockPredictionSystem = {
            calculateIntercept: (agent, prey) => ({ x: prey.x + 50, y: prey.y, timeToIntercept: 1 })
        };
        navigationSystem = new NavigationSystem(mockPredictionSystem);

        context = {
            foodManager: {
                food: new Map()
            },
            agentManager: {
                getAgents: () => ({}),
                agentSpatialHashing: {
                    query: () => []
                }
            }
        };
    });

    test('should steer towards target food when Goal is FEED', () => {
        const agent = { x: 0, y: 0, targetAngle: 0, needs: { hunger: 0, energy: 100 }, blackboard: { currentGoal: GoalType.FEED, targetFoodId: 'f1' } };
        context.foodManager.food.set('f1', { x: 100, y: 100 });

        navigationSystem.update(agent, context);

        // O ângulo de destino deve apontar para (100, 100) -> PI/4 radianos ou ~0.785
        expect(agent.targetAngle).toBeCloseTo(Math.PI / 4, 2);
    });

    test('should steer towards predicted position of prey when Goal is HUNT', () => {
        const agent = { x: 0, y: 0, targetAngle: 0, strategy: { aggression: 50 }, needs: { energy: 100 }, blackboard: { currentGoal: GoalType.HUNT, targetPreyId: 'prey1' } };
        const prey = { id: 'prey1', x: 100, y: 0, speed: 10, isDead: false };

        context.agentManager.getAgents = () => ({ 'prey1': prey });

        navigationSystem.update(agent, context);

        // O Predição desloca 50px no eixo X -> intercept = (150, 0)
        expect(agent.targetAngle).toBeCloseTo(0, 2);
    });
});
