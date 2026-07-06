import MemorySystem from './MemorySystem.js';

describe('MemorySystem', () => {
    let memorySystem;
    let agent;

    beforeEach(() => {
        memorySystem = new MemorySystem();
        agent = {
            blackboard: {
                dangerMap: [
                    { x: 100, y: 200, intensity: 1.0, timestamp: Date.now() },
                    { x: 500, y: 600, intensity: 0.04, timestamp: Date.now() }
                ]
            }
        };
    });

    test('should decay intensity of danger zones and remove those below 0', () => {
        memorySystem.update(agent);

        // First zone: 1.0 - 0.05 = 0.95 (kept)
        // Second zone: 0.04 - 0.05 = -0.01 (removed)
        expect(agent.blackboard.dangerMap.length).toBe(1);
        expect(agent.blackboard.dangerMap[0].x).toBe(100);
        expect(agent.blackboard.dangerMap[0].intensity).toBeCloseTo(0.95);
    });

    test('should initialize dangerMap if it is not present', () => {
        const freshAgent = { x: 650, y: 1250, blackboard: {} };
        memorySystem.update(freshAgent);
        expect(Array.isArray(freshAgent.blackboard.dangerMap)).toBe(true);
        expect(freshAgent.blackboard.dangerMap.length).toBe(0);
        
        // Célula para (650, 1250) -> x: 650/600=1, y: 1250/600=2 -> chave '1,2'
        expect(freshAgent.blackboard.visitedCells.has('1,2')).toBe(true);
        expect(freshAgent.blackboard.visitedCells.get('1,2').visitCount).toBe(1);
    });
});
