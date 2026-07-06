import WorldModelSystem from './WorldModelSystem.js';

describe('WorldModelSystem', () => {
    let worldModelSystem;

    beforeEach(() => {
        worldModelSystem = new WorldModelSystem();
    });

    test('should qualify predator as threat and assign danger level', () => {
        const agent = { x: 0, y: 0, maxLength: 50, blackboard: { knownThreats: [], worldModel: {} }, strategy: { caution: 50 } };
        const predator = { id: 'pred1', x: 200, y: 0, maxLength: 100 }; // 2x larger, 200px away
        
        agent.blackboard.knownThreats.push(predator);
        worldModelSystem.update(agent);

        const threats = agent.blackboard.worldModel.threats;
        expect(threats).toHaveLength(1);
        expect(threats[0].id).toBe('pred1');
        expect(threats[0].danger).toBeGreaterThan(50);
    });

    test('should sort opportunities with highest scores first', () => {
        const agent = {
            x: 0, y: 0,
            maxLength: 50,
            strategy: { caution: 50, aggression: 50 },
            blackboard: {
                lastKnownFood: [
                    { id: 'f_far', x: 1000, y: 0, score: 1 },
                    { id: 'f_close', x: 50, y: 0, score: 5 }
                ],
                worldModel: {}
            }
        };

        worldModelSystem.update(agent);

        const opps = agent.blackboard.worldModel.opportunities;
        expect(opps).toHaveLength(2);
        expect(opps[0].id).toBe('f_close'); // Closer food is a better opportunity
        expect(opps[1].id).toBe('f_far');
    });
});
