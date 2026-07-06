import DiffEngine from './DiffEngine.js';

describe('DiffEngine', () => {
    let diffEngine;

    beforeEach(() => {
        diffEngine = new DiffEngine();
    });

    test('should compute spawns on first check, updates on second, and removes when gone', () => {
        const socketId = 'client-1';

        const mockBody = {
            toArray: () => [{ x: 100, y: 100 }, { x: 90, y: 90 }]
        };

        const visible1 = {
            players: [
                { id: 'player-1', nickname: 'Test', skin: 'default', radius: 10, x: 100, y: 100, angle: 0, targetAngle: 0, color: '#fff', body: mockBody, isDead: false, maxLength: 10, needs: {}, strategy: {}, blackboard: {} }
            ],
            food: [
                { id: 'food-1', x: 200, y: 200, color: '#f00', radius: 4 }
            ],
            powerups: [
                { id: 'p-1', x: 300, y: 300, type: 'SHIELD', color: '#00f', radius: 15 }
            ]
        };

        // 1. First tick: all should be spawns
        const delta1 = diffEngine.computeDelta(socketId, visible1);

        expect(delta1.players.spawns.length).toBe(1);
        expect(delta1.players.spawns[0].id).toBe('player-1');
        expect(delta1.food.spawns.length).toBe(1);
        expect(delta1.food.spawns[0].id).toBe('food-1');
        expect(delta1.powerups.spawns.length).toBe(1);
        expect(delta1.powerups.spawns[0].id).toBe('p-1');

        // 2. Second tick (same entities, slightly moved player): should be update for player, empty spawns for food/powerups
        visible1.players[0].x = 105;
        const delta2 = diffEngine.computeDelta(socketId, visible1);

        expect(delta2.players.spawns.length).toBe(0);
        expect(delta2.players.updates.length).toBe(1);
        expect(delta2.players.updates[0].x).toBe(105);
        expect(delta2.food.spawns.length).toBe(0);
        expect(delta2.powerups.spawns.length).toBe(0);

        // 3. Third tick (remove food): should generate remove
        const visible2 = {
            players: visible1.players,
            food: [], // food-1 is gone
            powerups: visible1.powerups
        };
        const delta3 = diffEngine.computeDelta(socketId, visible2);

        expect(delta3.food.removes.length).toBe(1);
        expect(delta3.food.removes[0]).toBe('food-1');
    });
});
