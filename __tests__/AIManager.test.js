import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../src/shared/Logger.js', () => ({
    default: jest.fn().mockImplementation(() => ({
        info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
    })),
}));
jest.unstable_mockModule('../config/index.js', () => ({
    default: {
        game: {
            AI_VISION_RANGE_DIMENSION: 500,
            AI_VISION_RANGE_WIDTH: 1000,
            AI_THREAT_SIZE_RATIO: 1.2,
            AI_FLEE_THRESHOLD_BASE: 150,
            AI_FLEE_THRESHOLD_SIZE_RATIO: 2.0,
            AI_FLEE_THRESHOLD_INCREASED: 300,
            AI_ATTACK_THRESHOLD: 400,
            AI_ATTACK_SIZE_ADVANTAGE: 1.1,
            AI_GOAL_VECTOR_WEIGHT: 0.7,
            AI_AVOIDANCE_VECTOR_WEIGHT: 0.3,
            AI_STEERING_MAGNITUDE_THRESHOLD: 0.01,
            AI_SENSOR_LENGTH_MULTIPLIER: 1.5,
            BOT_BOUNDARY_BUFFER: 100,
            WORLD_SIZE: 5000,
        }
    }
}));

// Dynamically import the module to be tested
const { default: AIManager } = await import('../src/server/AIManager.js');

describe('AIManager', () => {
    let aiManager;
    let mockPlayerManager;
    let mockFoodManager;
    let mockLogger;
    let bot;

    beforeEach(async () => {
        const { default: Logger } = await import('../src/shared/Logger.js');
        mockLogger = new Logger();

        // Mock managers with spatial hashing query methods
        mockPlayerManager = {
            playerSpatialHashing: {
                query: jest.fn(() => []),
            },
        };
        mockFoodManager = {
            foodSpatialHashing: {
                query: jest.fn(() => []),
            },
        };

        aiManager = new AIManager(mockPlayerManager, mockFoodManager, mockLogger);

        // Create a standard bot for testing
        bot = {
            id: 'bot1',
            x: 1000,
            y: 1000,
            maxLength: 100,
            radius: 20,
            angle: 0,
            targetAngle: 0,
            speed: 5,
            isBoosting: false,
        };
    });

    describe('Farming Behavior', () => {
        it('should target the most valuable food item', () => {
            const food1 = { x: 1050, y: 1000, score: 1 }; // Closer, less score
            const food2 = { x: 1100, y: 1000, score: 5 }; // Further, more score
            mockFoodManager.foodSpatialHashing.query.mockReturnValue([food1, food2]);

            const context = { bot, playerManager: mockPlayerManager, foodManager: mockFoodManager };
            aiManager._farm(context);

            // The AI should target food2 because its score/distance heuristic is higher
            const expectedAngle = Math.atan2(food2.y - bot.y, food2.x - bot.x);
            expect(bot.targetAngle).toBeCloseTo(expectedAngle);
            expect(bot.isBoosting).toBe(false);
        });

        it('should wander if no food is nearby', () => {
            mockFoodManager.foodSpatialHashing.query.mockReturnValue([]);
            const initialAngle = bot.angle;

            const context = { bot, playerManager: mockPlayerManager, foodManager: mockFoodManager };
            aiManager._farm(context);

            // Angle should be based on its current direction (wandering)
            expect(bot.targetAngle).toBeCloseTo(initialAngle);
        });
    });

    describe('Fleeing Behavior', () => {
        it('should identify and flee from a nearby threat', () => {
            const threat = { id: 'player1', x: 1080, y: 1000, maxLength: 200 }; // Bigger and close
            mockPlayerManager.playerSpatialHashing.query.mockReturnValue([threat]);
            
            const context = { bot, playerManager: mockPlayerManager };
            
            // Check if the condition is met
            const isThreat = aiManager._isThreatNearby(context);
            expect(isThreat).toBe(true);
            expect(context.target).toBe(threat);

            // Check if the action is correct
            aiManager._flee(context);
            const expectedAngle = Math.atan2(bot.y - threat.y, bot.x - threat.x); // Away from threat
            expect(bot.targetAngle).toBeCloseTo(expectedAngle);
            expect(bot.isBoosting).toBe(true);
        });

        it('should not identify a threat if the other player is smaller or too far', () => {
            const smallPlayer = { id: 'player1', x: 1080, y: 1000, maxLength: 50 };
            const farPlayer = { id: 'player2', x: 2000, y: 2000, maxLength: 200 };
            mockPlayerManager.playerSpatialHashing.query.mockReturnValue([smallPlayer, farPlayer]);

            const context = { bot, playerManager: mockPlayerManager };
            const isThreat = aiManager._isThreatNearby(context);
            expect(isThreat).toBe(false);
        });
    });

    describe('Attacking Behavior', () => {
        it('should identify and attack a nearby prey', () => {
            const prey = { id: 'player1', x: 1100, y: 1000, maxLength: 50, angle: 0, speed: 5 };
            mockPlayerManager.playerSpatialHashing.query.mockReturnValue([prey]);

            const context = { bot, playerManager: mockPlayerManager };

            const isPrey = aiManager._isPreyNearby(context);
            expect(isPrey).toBe(true);
            expect(context.target).toBe(prey);

            aiManager._attack(context);
            // The angle should be towards the prey's predicted position, not its current one.
            // Since it's moving straight, the angle should be close to 0.
            expect(bot.targetAngle).toBeCloseTo(0);
            expect(bot.isBoosting).toBe(true);
        });
    });

    describe('Behavior Tree Integration', () => {
        it('should choose to flee when a threat is present, ignoring prey and food', () => {
            const threat = { id: 'p1', x: 1080, y: 1000, maxLength: 200 };
            const prey = { id: 'p2', x: 1100, y: 1000, maxLength: 50, angle: 0, speed: 5 };
            const food = { x: 1050, y: 1000, score: 10 };
            mockPlayerManager.playerSpatialHashing.query.mockReturnValue([threat, prey]);
            mockFoodManager.foodSpatialHashing.query.mockReturnValue([food]);

            aiManager.update(bot);

            // Check the side-effects of the flee action
            const expectedAngle = Math.atan2(bot.y - threat.y, bot.x - threat.x); // Away from threat
            expect(bot.targetAngle).toBeCloseTo(expectedAngle);
            expect(bot.isBoosting).toBe(true);
        });
    });
});
