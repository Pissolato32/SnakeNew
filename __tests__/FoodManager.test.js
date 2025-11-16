import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// 1. Declare mocks for all dependencies BEFORE importing any application code.
jest.unstable_mockModule('../src/shared/Logger.js', () => ({
    default: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    })),
}));

const mockGetSafeSpawnPoint = jest.fn(() => ({ x: 50, y: 50 }));
jest.unstable_mockModule('../src/shared/Utils.js', () => ({
    hslToRgb: jest.fn(() => ({ r: 255, g: 0, b: 0 })),
    getSafeSpawnPoint: mockGetSafeSpawnPoint,
}));


// 2. Dynamically import the modules AFTER mocks have been declared.
const { default: FoodManager } = await import('../src/server/FoodManager.js');
const { default: Logger } = await import('../src/shared/Logger.js');


describe('FoodManager', () => {
    let foodManager;

    beforeEach(() => {
        // Clear mocks before each test to ensure isolation
        mockGetSafeSpawnPoint.mockClear();
        Logger.mockClear();
        
        const mockLogger = new Logger();
        foodManager = new FoodManager(mockLogger);
    });

    describe('Food Creation', () => {
        it('should create a food item with default properties', () => {
            const foodItem = foodManager.createFood();
            expect(foodItem).toBeDefined();
            expect(foodItem.id).toBeDefined();
            expect(foodItem.score).toBeGreaterThan(0);
            expect(foodItem.radius).toBeGreaterThan(0);
        });

        it('should use provided coordinates when creating food', () => {
            const foodItem = foodManager.createFood(123, 456);
            expect(foodItem.x).toBe(123);
            expect(foodItem.y).toBe(456);
            expect(mockGetSafeSpawnPoint).not.toHaveBeenCalled();
        });

        it('should call getSafeSpawnPoint when coordinates are not provided', () => {
            foodManager.createFood(undefined, undefined, 0, [], 100);
            expect(mockGetSafeSpawnPoint).toHaveBeenCalled();
        });
    });

    describe('Food Management', () => {
        it('should add a food item to the manager', () => {
            const foodItem = foodManager.createFood();
            foodManager.addFood(foodItem);
            const allFood = foodManager.getFood();
            expect(allFood.length).toBe(1);
            expect(allFood[0]).toBe(foodItem);
        });

        it('should remove a food item from the manager', () => {
            const foodItem = foodManager.createFood();
            foodManager.addFood(foodItem);
            expect(foodManager.getFood().length).toBe(1);

            foodManager.removeFood(foodItem);
            expect(foodManager.getFood().length).toBe(0);
        });

        it('should add a batch of food items', () => {
            foodManager.addFoodInBatch(10, [], 100);
            expect(foodManager.getFood().length).toBe(10);
        });
    });

    describe('Food Object Pooling', () => {
        it('should add a removed food item to the pool', () => {
            const foodItem = foodManager.createFood();
            foodManager.addFood(foodItem);
            
            expect(foodManager.foodPool.length).toBe(0);
            foodManager.removeFood(foodItem);
            expect(foodManager.foodPool.length).toBe(1);
            expect(foodManager.foodPool[0]).toBe(foodItem);
        });

        it('should reuse a food item from the pool for new creations', () => {
            // 1. Create and remove a food item to populate the pool
            const firstFoodItem = foodManager.createFood();
            foodManager.addFood(firstFoodItem);
            foodManager.removeFood(firstFoodItem);

            expect(foodManager.foodPool.length).toBe(1);

            // 2. Create a new food item, which should be reused from the pool
            const secondFoodItem = foodManager.createFood();
            
            // It should be the exact same object
            expect(secondFoodItem).toBe(firstFoodItem);
            expect(foodManager.foodPool.length).toBe(0);
        });
    });
});