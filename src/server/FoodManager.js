import config from '../../config/index.js';
import { hslToRgb, getSafeSpawnPoint } from '../shared/Utils.js';
import SpatialHashing from '../shared/SpatialHashing.js';

class FoodManager {
    constructor(logger) {
        this.food = new Map();
        this.foodPool = [];
        this.foodSpatialHashing = new SpatialHashing(config.game.FOOD_SPATIAL_HASH_CELL_SIZE);
        this.FOOD_TYPES = config.game.FOOD_TYPES;
        this.logger = logger;
    }

    createFood(x, y, typeIndex, players, spawnBuffer) {
        let foodItem;
        if (this.foodPool.length > 0) {
            foodItem = this.foodPool.pop();
        } else {
            foodItem = { id: `food_${Math.random().toString(36).substr(2, 9)}` };
        }

        const foodType = typeIndex !== undefined ? config.game.FOOD_TYPES[typeIndex] : config.game.FOOD_TYPES[Math.floor(Math.random() * config.game.FOOD_TYPES.length)];
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
            const foodTypeIndex = Math.random() < config.game.BUTTERFLY_SPAWN_CHANCE ? config.game.BUTTERFLY_FOOD_TYPE_INDEX : undefined;
            const foodItem = this.createFood(undefined, undefined, foodTypeIndex, players, spawnBuffer);
            this.addFood(foodItem);
        }
    }

    removeExpiredFood(expirationTimeMs = config.game.FOOD_EXPIRATION_TIME_MS) {
        const now = Date.now();
        for (const foodItem of this.food.values()) {
            if (now - foodItem.spawnTime > expirationTimeMs) {
                this.removeFood(foodItem);
            }
        }
    }

    updateFoodMovement() {
        const time = Date.now() / 1000 * config.game.FOOD_DANCE_SPEED;
        const boundary = config.WORLD_SIZE / 2 - config.game.FOOD_BOUNDARY_BUFFER;

        for (const food of this.food.values()) {
            if (food.movement === 'butterfly') {
                food.x += Math.cos(food.moveAngle) * (food.moveSpeed * config.game.BUTTERFLY_SPEED_MULTIPLIER);
                food.y += Math.sin(food.moveAngle) * (food.moveSpeed * config.game.BUTTERFLY_SPEED_MULTIPLIER);

                if (Math.random() < config.game.BUTTERFLY_DIRECTION_CHANGE_CHANCE) {
                    food.moveAngle += (Math.random() - 0.5) * config.game.BUTTERFLY_DIRECTION_CHANGE_AMOUNT;
                }

                const distanceFromCenter = Math.hypot(food.x, food.y);
                if (distanceFromCenter > boundary) {
                    const angleToCenter = Math.atan2(-food.y, -food.x);
                    food.moveAngle = angleToCenter + (Math.random() - 0.5) * config.game.BUTTERFLY_BOUNDARY_ANGLE_CHANGE;
                    food.x = Math.cos(food.moveAngle) * (boundary - config.game.BUTTERFLY_BOUNDARY_POSITION_ADJUSTMENT);
                    food.y = Math.sin(food.moveAngle) * (boundary - config.game.BUTTERFLY_BOUNDARY_POSITION_ADJUSTMENT);
                }

            } else {
                if (!food.spawnX && food.spawnX !== 0) continue;
                food.x = food.spawnX + Math.cos(time + food.danceOffset) * config.game.FOOD_DANCE_RADIUS;
                food.y = food.spawnY + Math.sin(time + food.danceOffset) * config.game.FOOD_DANCE_RADIUS;
            }
            
            this.foodSpatialHashing.update(food);
        }
    }

    getFood() {
        return Array.from(this.food.values());
    }
}

export default FoodManager;
