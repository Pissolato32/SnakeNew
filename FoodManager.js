const { FOOD_TYPES } = require('./Constants');
const { hslToRgb, getSafeSpawnPoint } = require('./Utils');
const SpatialHashing = require('./SpatialHashing');

class FoodManager {
    constructor() {
        this.food = new Map();
        this.foodPool = [];
        this.foodSpatialHashing = new SpatialHashing(40); // Changed from 200 to 40
        this.FOOD_TYPES = FOOD_TYPES;
    }

    createFood(x, y, typeIndex, players, spawnBuffer) {
        let foodItem;
        if (this.foodPool.length > 0) {
            foodItem = this.foodPool.pop();
        } else {
            // Create a brand new object if the pool is empty
            foodItem = { id: `food_${Math.random().toString(36).substr(2, 9)}` };
        }

        const foodType = typeIndex !== undefined ? FOOD_TYPES[typeIndex] : FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
        const hue = Math.random() * 360;
        const saturation = 50 + (foodType.score / 4) * 40;
        const lightness = 40 + (foodType.score / 4) * 30;
        let spawnPoint = { x, y };
        if (x === undefined || y === undefined) {
            spawnPoint = getSafeSpawnPoint(players, spawnBuffer);
        }

        // Reset/assign properties
        foodItem.x = spawnPoint.x;
        foodItem.y = spawnPoint.y;
        foodItem.radius = foodType.radius;
        foodItem.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        foodItem.rgb = hslToRgb(hue, saturation, lightness);
        foodItem.score = foodType.score;

        return foodItem;
    }

    addFood(foodItem) {
        this.food.set(foodItem.id, foodItem);
        this.foodSpatialHashing.insert(foodItem);
    }

    removeFood(foodItem) {
        if (this.food.has(foodItem.id)) {
            this.food.delete(foodItem.id);
            this.foodSpatialHashing.remove(foodItem);
            this.foodPool.push(foodItem); // Return to pool for reuse
        }
    }

    getFood() {
        return Array.from(this.food.values());
    }
}

module.exports = FoodManager;