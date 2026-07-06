import ResourceManager from './ResourceManager.js';
import Logger from '../../../shared/Logger.js';

describe('ResourceManager', () => {
    let logger;
    let mockFoodManager;
    let mockPowerupManager;
    let mockAgentManager;
    let resourceManager;

    test('should spawn food in batch if current count is less than target', () => {
        logger = new Logger('silent');
        let spawnedFoodCount = 0;
        let expiredRemoved = false;
        let foodMovementUpdated = false;

        mockFoodManager = {
            getFood: () => new Array(50), // current count 50
            addFoodInBatch: (count) => {
                spawnedFoodCount = count;
            },
            removeFood: () => {},
            removeExpiredFood: () => {
                expiredRemoved = true;
            },
            updateFoodMovement: () => {
                foodMovementUpdated = true;
            }
        };

        mockPowerupManager = {
            getPowerups: () => new Array(5),
            addPowerup: () => {},
            createPowerup: () => ({ id: 'p_1' })
        };

        mockAgentManager = {
            getAgents: () => ({
                'agent-1': { id: 'agent-1' }
            })
        };

        resourceManager = new ResourceManager(mockFoodManager, mockPowerupManager, mockAgentManager, logger);
        resourceManager.update(Date.now());

        // Target: 400 + 1 * 50 = 450.
        // Current: 50. Should spawn 400.
        expect(spawnedFoodCount).toBe(400);
        expect(expiredRemoved).toBe(true);
        expect(foodMovementUpdated).toBe(true);
    });

    test('should maintain minimum powerups', () => {
        logger = new Logger('silent');
        let createdPowerup = false;
        let addedPowerup = false;

        mockFoodManager = {
            getFood: () => new Array(500),
            addFoodInBatch: () => {},
            removeFood: () => {},
            removeExpiredFood: () => {},
            updateFoodMovement: () => {}
        };

        mockPowerupManager = {
            getPowerups: () => [], // current powerups 0 (less than MIN_POWERUPS = 5)
            createPowerup: () => {
                createdPowerup = true;
                return { id: 'p_1' };
            },
            addPowerup: (p) => {
                if (p.id === 'p_1') addedPowerup = true;
            }
        };

        mockAgentManager = {
            getAgents: () => ({})
        };

        resourceManager = new ResourceManager(mockFoodManager, mockPowerupManager, mockAgentManager, logger);
        resourceManager.update(Date.now());

        expect(createdPowerup).toBe(true);
        expect(addedPowerup).toBe(true);
    });
});
