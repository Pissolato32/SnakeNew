import { FOOD_TYPES, FOOD_SPATIAL_HASH_CELL_SIZE, BUTTERFLY_SPAWN_CHANCE, BUTTERFLY_FOOD_TYPE_INDEX, FOOD_EXPIRATION_TIME_MS, FOOD_DANCE_RADIUS, FOOD_DANCE_SPEED, worldSize, FOOD_BOUNDARY_BUFFER, BUTTERFLY_SPEED_MULTIPLIER, BUTTERFLY_DIRECTION_CHANGE_CHANCE, BUTTERFLY_DIRECTION_CHANGE_AMOUNT, BUTTERFLY_BOUNDARY_ANGLE_CHANGE, BUTTERFLY_BOUNDARY_POSITION_ADJUSTMENT } from './Constants.js';
import { hslToRgb, getSafeSpawnPoint } from './Utils.js';
import SpatialHashing from './SpatialHashing.js';

class FoodManager {
    constructor(logger) {
        this.food = new Map();
        this.foodPool = [];
        this.foodSpatialHashing = new SpatialHashing(FOOD_SPATIAL_HASH_CELL_SIZE);
        this.FOOD_TYPES = FOOD_TYPES;
        this.logger = logger;
    }

    createFood(x, y, typeIndex, players, spawnBuffer) {
        let foodItem;
        if (this.foodPool.length > 0) {
            foodItem = this.foodPool.pop();
        } else {
            foodItem = { id: `food_${Math.random().toString(36).substr(2, 9)}` };
        }

        const foodType = typeIndex !== undefined ? FOOD_TYPES[typeIndex] : FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
        let spawnPoint = { x, y };
        if (x === undefined || y === undefined) {
            spawnPoint = getSafeSpawnPoint(players, spawnBuffer);
        }

        foodItem.x = spawnPoint.x;
        foodItem.y = spawnPoint.y;
        foodItem.radius = foodType.radius;
        foodItem.color = foodType.glow ? foodType.color : `hsl(${Math.random() * 360}, ${50 + (foodType.score / 4) * 40}%, ${40 + (foodType.score / 4) * 30}%)`;
        foodItem.rgb = foodType.glow ? { r: parseInt(foodType.color.slice(1,3),16), g: parseInt(foodType.color.slice(3,5),16), b: parseInt(foodType.color.slice(5,7),16) } : hslToRgb(Math.random() * 360, 50 + (foodType.score / 4) * 40, 40 + (foodType.score / 4) * 30);
        foodItem.score = foodType.score;
        foodItem.type = 'food';
        foodItem.spawnTime = Date.now();
        foodItem.glow = foodType.glow || false;
        foodItem.effect = foodType.effect || null;

        foodItem.spawnX = spawnPoint.x;
        foodItem.spawnY = spawnPoint.y;
        foodItem.danceOffset = Math.random() * 2 * Math.PI;

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
            this.foodPool.push(foodItem);
        }
    }

    addFoodInBatch(count, players, spawnBuffer) {
        for (let i = 0; i < count; i++) {
            const foodTypeIndex = Math.random() < BUTTERFLY_SPAWN_CHANCE ? BUTTERFLY_FOOD_TYPE_INDEX : undefined;
            const foodItem = this.createFood(undefined, undefined, foodTypeIndex, players, spawnBuffer);
            this.addFood(foodItem);
        }
    }

    removeExpiredFood(expirationTimeMs = FOOD_EXPIRATION_TIME_MS) {
        const now = Date.now();
        for (const foodItem of this.food.values()) {
            if (now - foodItem.spawnTime > expirationTimeMs) {
                this.removeFood(foodItem);
            }
        }
    }

    updateFoodMovement() {
        const time = Date.now() / 1000 * FOOD_DANCE_SPEED;
        const boundary = worldSize / 2 - FOOD_BOUNDARY_BUFFER;

        for (const food of this.food.values()) {
            if (food.movement === 'butterfly') {
                food.x += Math.cos(food.moveAngle) * (food.moveSpeed * BUTTERFLY_SPEED_MULTIPLIER);
                food.y += Math.sin(food.moveAngle) * (food.moveSpeed * BUTTERFLY_SPEED_MULTIPLIER);

                if (Math.random() < BUTTERFLY_DIRECTION_CHANGE_CHANCE) {
                    food.moveAngle += (Math.random() - 0.5) * BUTTERFLY_DIRECTION_CHANGE_AMOUNT;
                }

                const distanceFromCenter = Math.hypot(food.x, food.y);
                if (distanceFromCenter > boundary) {
                    const angleToCenter = Math.atan2(-food.y, -food.x);
                    food.moveAngle = angleToCenter + (Math.random() - 0.5) * BUTTERFLY_BOUNDARY_ANGLE_CHANGE;
                    food.x = Math.cos(food.moveAngle) * (boundary - BUTTERFLY_BOUNDARY_POSITION_ADJUSTMENT);
                    food.y = Math.sin(food.moveAngle) * (boundary - BUTTERFLY_BOUNDARY_POSITION_ADJUSTMENT);
                }

            } else {
                if (!food.spawnX && food.spawnX !== 0) continue;
                food.x = food.spawnX + Math.cos(time + food.danceOffset) * FOOD_DANCE_RADIUS;
                food.y = food.spawnY + Math.sin(time + food.danceOffset) * FOOD_DANCE_RADIUS;
            }
            
            this.foodSpatialHashing.update(food);
        }
    }

    getFood() {
        return Array.from(this.food.values());
    }
}

export default FoodManager;
