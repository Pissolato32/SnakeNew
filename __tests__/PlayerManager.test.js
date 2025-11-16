import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mocking dependencies using the ESM-compatible way
jest.unstable_mockModule('../src/server/FoodManager.js', () => ({
    default: jest.fn().mockImplementation(() => ({
        createFood: jest.fn(() => ({})), // Return an empty object
        addFood: jest.fn(),
    })),
}));
jest.unstable_mockModule('../src/shared/Logger.js', () => ({
    default: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    })),
}));

// Dynamically import the module to be tested after mocks are set up
const { default: PlayerManager } = await import('../src/server/PlayerManager.js');


describe('PlayerManager', () => {
    let playerManager;
    let mockFoodManager;
    let mockLogger;
    let mockIo;

    beforeEach(async () => {
        // We need to dynamically re-import the mocked modules to get the fresh mock instances
        const { default: MockFoodManager } = await import('../src/server/FoodManager.js');
        const { default: MockLogger } = await import('../src/shared/Logger.js');

        // Clear mocks before each test
        MockFoodManager.mockClear();
        if (MockFoodManager.mock.instances[0]) {
            const mockMethods = Object.getOwnPropertyNames(MockFoodManager.prototype);
            mockMethods.forEach(method => {
                if (method !== 'constructor' && MockFoodManager.prototype[method].mock) {
                    MockFoodManager.prototype[method].mockClear();
                }
            });
        }
        
        MockLogger.mockClear();

        mockLogger = new MockLogger();
        mockFoodManager = new MockFoodManager();
        mockIo = {
            to: jest.fn(() => ({
                emit: jest.fn(),
            })),
        };

        playerManager = new PlayerManager(mockIo, mockFoodManager, mockLogger, 'test-room');
    });

    describe('Player Creation', () => {
        it('should create a new player with correct default values', () => {
            const player = playerManager.createPlayer('socket1', 'Player_One');
            
            expect(player).toBeDefined();
            expect(player.id).toBe('socket1');
            expect(player.nickname).toBe('Player_One');
            expect(player.isBot).toBe(false);
            expect(player.isDead).toBeUndefined(); // Should not be dead initially
            expect(player.maxLength).toBeGreaterThan(0);
            expect(player.body.length).toBe(1); // Starts with a head
        });

        it('should add the created player to the players list', () => {
            const playersBefore = Object.keys(playerManager.getPlayers()).length;
            expect(playersBefore).toBe(0);

            playerManager.createPlayer('socket1', 'Player_One');

            const playersAfter = playerManager.getPlayers();
            expect(Object.keys(playersAfter).length).toBe(1);
            expect(playersAfter['socket1']).toBeDefined();
        });

        it('should create a bot player correctly', () => {
            const bot = playerManager.createPlayer('bot1', 'Bot_One', true);
            expect(bot.isBot).toBe(true);
        });
    });

    describe('Player Removal', () => {
        it('should remove a player from the manager', () => {
            playerManager.createPlayer('socket1', 'Player_One');
            expect(Object.keys(playerManager.getPlayers()).length).toBe(1);

            playerManager.removePlayer('socket1');
            expect(Object.keys(playerManager.getPlayers()).length).toBe(0);
        });
    });

    describe('Player Killing', () => {
        it('should mark a player as dead but not remove them immediately', () => {
            const player = playerManager.createPlayer('socket1', 'Player_One');
            expect(Object.keys(playerManager.getPlayers()).length).toBe(1);

            playerManager.killPlayer(player);

            expect(player.isDead).toBe(true);
            expect(Object.keys(playerManager.getPlayers()).length).toBe(1); // Still in the list
        });

        it('should drop food when a player is killed', () => {
            const player = playerManager.createPlayer('socket1', 'Player_One');
            // Give the player a body to drop food
            player.body.addFirst({ x: 1, y: 1 });
            player.body.addFirst({ x: 2, y: 2 });
            player.body.addFirst({ x: 3, y: 3 });
            
            playerManager.killPlayer(player);

            // Check if the food manager was called to create and add food
            expect(mockFoodManager.createFood).toHaveBeenCalled();
            expect(mockFoodManager.addFood).toHaveBeenCalled();
        });

        it('should not drop food if the player has a very short body', () => {
            const player = playerManager.createPlayer('socket1', 'Player_One');
            player.body.clear(); // No body

            playerManager.killPlayer(player);

            expect(mockFoodManager.createFood).not.toHaveBeenCalled();
            expect(mockFoodManager.addFood).not.toHaveBeenCalled();
        });
    });
});