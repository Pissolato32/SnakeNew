import GoalSystem from './GoalSystem.js';

describe('GoalSystem', () => {
    let goalSystem;
    let agent;

    beforeEach(() => {
        goalSystem = new GoalSystem();
        agent = {
            strategy: {
                aggression: 50,
                caution: 50,
                curiosity: 50,
                greed: 50
            },
            needs: {
                hunger: 10,
                energy: 100,
                stress: 0,
                fear: 0
            },
            blackboard: {
                currentGoal: 'EXPLORE',
                emotionalState: 'CALM',
                knownPrey: []
            }
        };
    });

    test('should set goal to EXPLORE by default when needs are satisfied', () => {
        goalSystem.update(agent);
        expect(agent.blackboard.currentGoal).toBe('EXPLORE');
        expect(agent.blackboard.emotionalState).toBe('CALM');
    });

    test('should change goal to FEED when hunger is high', () => {
        agent.needs.hunger = 80;
        goalSystem.update(agent);
        expect(agent.blackboard.currentGoal).toBe('FEED');
    });

    test('should change goal to FLEE and set state to PANIC/ANXIOUS when fear is high', () => {
        agent.needs.fear = 60;
        goalSystem.update(agent);
        expect(agent.blackboard.currentGoal).toBe('FLEE');
        expect(agent.blackboard.emotionalState).toBe('PANIC');

        agent.needs.fear = 20;
        goalSystem.update(agent);
        expect(agent.blackboard.emotionalState).toBe('ANXIOUS');
    });

    test('should change goal to HUNT when prey is present and aggression is high', () => {
        agent.strategy.aggression = 80;
        agent.blackboard.knownPrey = [{ id: 'prey_1' }];
        goalSystem.update(agent);
        expect(agent.blackboard.currentGoal).toBe('HUNT');
        expect(agent.blackboard.emotionalState).toBe('AGGRESSIVE');
    });
});
