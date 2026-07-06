import InterestManager from './InterestManager.js';

describe('InterestManager', () => {
    let interestManager;
    let mockWorldState;
    let player;

    beforeEach(() => {
        interestManager = new InterestManager();

        player = { id: 'player-1', x: 100, y: 100, isDead: false };

        mockWorldState = {
            foodManager: {
                foodSpatialHashing: {
                    query: () => [
                        { id: 'f_close', x: 200, y: 200 }, // Dist: ~141 (Visible)
                        { id: 'f_far', x: 3000, y: 3000 }  // Dist: ~4100 (Ignored)
                    ]
                }
            },
            powerupManager: {
                powerupSpatialHashing: {
                    query: () => [
                        { id: 'p_close', x: 150, y: 150 }, // Dist: ~70 (Visible)
                        { id: 'p_far', x: 4000, y: 4000 }  // Dist: ~5500 (Ignored)
                    ]
                }
            },
            agentManager: {
                agentSpatialHashing: {
                    query: () => [
                        { id: 'agent-2', x: 300, y: 300, isDead: false }, // Dist: ~282 (Visible)
                        { owner: { id: 'agent-2', x: 300, y: 300, isDead: false }, x: 320, y: 320 }, // Segment (Deduplicated)
                        { id: 'agent-3', x: 5000, y: 5000, isDead: false } // Dist: ~6929 (Ignored)
                    ]
                }
            }
        };
    });

    test('should only return entities within interest radius and deduplicate players', () => {
        const result = interestManager.getVisibleEntities(player, mockWorldState);

        expect(result.food.length).toBe(1);
        expect(result.food[0].id).toBe('f_close');

        expect(result.powerups.length).toBe(1);
        expect(result.powerups[0].id).toBe('p_close');

        // Should return only 1 agent (agent-2) since the segment was deduplicated and agent-3 is too far
        expect(result.players.length).toBe(1);
        expect(result.players[0].id).toBe('agent-2');
    });
});
