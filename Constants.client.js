export const worldSize = 30000;
export const foodAmount = 500;
export const BOT_COUNT = 30;
export const BOT_NAMES = ['Slinky', 'Noodle', 'Worminator', 'Sir Hiss', 'Pretzel', 'Zippy', 'Slitherin', 'Boop', 'Mr. Wiggles', 'Snek'];
export const SPAWN_BUFFER = 800;
export const BOT_BOUNDARY_BUFFER = 500;

export const FOOD_TYPES = [
    { radius: 4, score: 1, color: '#FF6347' },
    { radius: 6, score: 2, color: '#FFD700' },
    { radius: 8, score: 3, color: '#ADFF2F' },
    { radius: 10, score: 4, color: '#8A2BE2' }
];

export const POWERUP_TYPES = [
    { type: 'FOOD_MAGNET', color: '#FFFFFF', radius: 12 }
];

export const gridCellSize = 200;

// Game Loop and Physics Constants
export const GAME_TICK_RATE_MS = 1000 / 60; // 60 FPS
export const POWERUP_SPAWN_INTERVAL_MS = 15000;
export const MIN_POWERUPS = 5;
export const FOOD_MAGNET_RADIUS = 200;
export const FOOD_MAGNET_FORCE = 0.1;
export const BASE_SPEED_MIN = 3;
export const BASE_SPEED_MAX_INITIAL = 4;
export const LENGTH_DIVISOR_SPEED = 1000;
export const TURN_RATE_MIN = 0.05;
export const TURN_RATE_MAX_INITIAL = 0.1;
export const LENGTH_DIVISOR_TURN_RATE = 1000;
export const BOOST_SPEED_MULTIPLIER = 1.8;
export const BOOST_LENGTH_CONSUMPTION_RATE = 0.05;
export const BOOST_FOOD_DROP_PROBABILITY = 0.1;
export const BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP = 5;
export const BOT_MANAGEMENT_INTERVAL_MS = 5000;
export const MIN_BOT_COUNT = 5;
export const BOT_COUNT_HUMAN_MULTIPLIER = 2;

// AI Constants
export const AI_VISION_RANGE_DIMENSION = 800; // Half width/height for vision range
export const AI_VISION_RANGE_WIDTH = 1600; // Full width/height for vision range
export const AI_THREAT_SIZE_RATIO = 1.2;
export const AI_FLEE_THRESHOLD_BASE = 300;
export const AI_FLEE_THRESHOLD_INCREASED = 500;
export const AI_FLEE_THRESHOLD_SIZE_RATIO = 2;
export const AI_ATTACK_THRESHOLD = 500;
export const AI_ATTACK_SIZE_ADVANTAGE = 1.1;
export const AI_SENSOR_LENGTH_MULTIPLIER = 5;
export const AI_GOAL_VECTOR_WEIGHT = 1.0;
export const AI_AVOIDANCE_VECTOR_WEIGHT = 2.0;
export const AI_STEERING_MAGNITUDE_THRESHOLD = 0.1;
