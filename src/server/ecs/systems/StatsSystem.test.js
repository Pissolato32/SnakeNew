import StatsSystem from './StatsSystem.js';

describe('StatsSystem', () => {
    let statsSystem;

    beforeEach(() => {
        statsSystem = new StatsSystem();
    });

    test('should increment world stats correctly when spawns, food, and deaths are recorded', () => {
        const agent = {
            id: 'a1',
            skin: 'red',
            stats: {
                bornAt: Date.now() - 5000, // 5s ago
                kills: 3,
                foodEaten: 12
            }
        };

        statsSystem.recordAgentSpawn(agent);
        expect(statsSystem.worldStats.totalAgentsSpawned).toBe(1);
        expect(statsSystem.speciesStats.get('red').spawned).toBe(1);

        statsSystem.recordFoodSpawned(5);
        expect(statsSystem.worldStats.totalFoodSpawned).toBe(5);

        statsSystem.recordAgentDeath(agent);
        expect(statsSystem.worldStats.totalAgentsKilled).toBe(1);
        expect(statsSystem.worldStats.averageLifetimeSec).toBeCloseTo(5, 1);
        expect(statsSystem.speciesStats.get('red').deaths).toBe(1);
        expect(statsSystem.speciesStats.get('red').kills).toBe(3);
        expect(statsSystem.speciesStats.get('red').foodEaten).toBe(12);
    });
});
