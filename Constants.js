const DEBUG_MODE = false;
const worldSize = 30000;
const BOT_NAMES = ['Slinky', 'Noodle', 'Worminator', 'Sir Hiss', 'Pretzel', 'Zippy', 'Slitherin', 'Boop', 'Mr. Wiggles', 'Snek'];
const SPAWN_BUFFER = 800;
const BOT_BOUNDARY_BUFFER = 500;

const FOOD_TYPES = [
    { radius: 4, score: 1, color: '#FF6347', glow: false },
    { radius: 6, score: 2, color: '#FFD700', glow: false },
    { radius: 8, score: 3, color: '#ADFF2F', glow: false },
    { radius: 10, score: 4, color: '#8A2BE2', glow: false },
    { radius: 12, score: 5, color: '#FF1493', glow: true, effect: 'speed_boost' }, // New: Pink glowing food for speed boost
    { radius: 14, score: 6, color: '#00FFFF', glow: true, effect: 'shield' }, // New: Cyan glowing food for temporary shield
    { radius: 15, score: 25, color: '#FFFFFF', glow: true, movement: 'butterfly' } // New: White glowing, high-value, moving food
];

const POWERUP_TYPES = [
    { type: 'FOOD_MAGNET', color: '#FFFFFF', radius: 12 },
    { type: 'SPEED_BOOST', color: '#FF4500', radius: 15, duration: 10000 }, // New: Orange speed boost powerup
    { type: 'SHIELD', color: '#00CED1', radius: 18, duration: 15000 } // New: Turquoise shield powerup
];

const gridCellSize = 200;

// Game Loop and Physics Constants
const GAME_TICK_RATE_MS = 1000 / 60; // 60 FPS
const NETWORK_UPDATE_RATE_MS = 1000 / 60; // 60 FPS for network updates
const POWERUP_SPAWN_INTERVAL_MS = 15000;
const MIN_POWERUPS = 5;
const FOOD_PER_PLAYER = 600; // Dynamic food setting, multiplied by 8x
const FOOD_MAGNET_RADIUS = 200;
const FOOD_MAGNET_FORCE = 0.1;
const BASE_SPEED_MIN = 3;
const BASE_SPEED_MAX_INITIAL = 4;
const LENGTH_DIVISOR_SPEED = 1000;
const TURN_RATE_MIN = 0.05;
const TURN_RATE_MAX_INITIAL = 0.1;
const LENGTH_DIVISOR_TURN_RATE = 1000;
const BOOST_SPEED_MULTIPLIER = 1.8;
const BOOST_LENGTH_CONSUMPTION_RATE = 0.05;
const BOOST_FOOD_DROP_PROBABILITY = 0.1;
const BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP = 5;
const BOOST_FOOD_DROP_INTERVAL = 3; // Drop food every 3 ticks when boosting
const BOT_MANAGEMENT_INTERVAL_MS = 5000;
const MIN_BOT_COUNT = 5;
const BOT_COUNT_HUMAN_MULTIPLIER = 2;
const BOT_SCORE_DIFFERENCE_FACTOR = 1.5;
const BOT_SCORE_DIFFERENCE_BONUS = 3;
const SNAKE_SEGMENT_RADIUS = 6; // New constant for snake body segment radius
const FOOD_COLLISION_BUFFER = 0; // Adjust food collision distance

// AI Constants
const AI_VISION_RANGE_DIMENSION = 800; // Half width/height for vision range
const AI_VISION_RANGE_WIDTH = 1600; // Full width/height for vision range
const AI_THREAT_SIZE_RATIO = 1.2;
const AI_FLEE_THRESHOLD_BASE = 300;
const AI_FLEE_THRESHOLD_INCREASED = 500;
const AI_FLEE_THRESHOLD_SIZE_RATIO = 2;
const AI_ATTACK_THRESHOLD = 500;
const AI_ATTACK_SIZE_ADVANTAGE = 1.1;
const AI_SENSOR_LENGTH_MULTIPLIER = 5;
const AI_GOAL_VECTOR_WEIGHT = 10.0;
const AI_AVOIDANCE_VECTOR_WEIGHT = 0.5;
const AI_STEERING_MAGNITUDE_THRESHOLD = 0.01;

// PlayerManager Constants
export const PLAYER_SPATIAL_HASH_CELL_SIZE = 40;
export const DEFAULT_PLAYER_COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#33FFF3'];
export const SNAKE_BODY_BUFFER_SIZE = 100;
export const SNAKE_HEAD_HISTORY_SIZE = 30;
export const INITIAL_SNAKE_LENGTH = 30;
export const INITIAL_SNAKE_RADIUS = 12;
export const INITIAL_SNAKE_TURN_RATE = 0.1;
export const INITIAL_SNAKE_SPEED = 4;
export const DEATH_FOOD_DROP_STEP = 3;
export const DEATH_FOOD_DROP_OFFSET = 15;
export const DEATH_FOOD_TYPE_INDEX = 3;
export const DEATH_FOOD_COLOR = '#FFD700';
export const DEFAULT_BOT_COUNT = 10;
export const DEATH_FOOD_RGB = { r: 255, g: 215, b: 0 };

// FoodManager Constants
export const FOOD_SPATIAL_HASH_CELL_SIZE = 200;
export const BUTTERFLY_SPAWN_CHANCE = 0.01;
export const BUTTERFLY_FOOD_TYPE_INDEX = 6;
export const FOOD_EXPIRATION_TIME_MS = 30000;
export const FOOD_DANCE_RADIUS = 2.5;
export const FOOD_DANCE_SPEED = 0.5;
export const FOOD_BOUNDARY_BUFFER = 20;
export const BUTTERFLY_SPEED_MULTIPLIER = 5;
export const BUTTERFLY_DIRECTION_CHANGE_CHANCE = 0.05;
export const BUTTERFLY_DIRECTION_CHANGE_AMOUNT = 1.5;
export const BUTTERFLY_BOUNDARY_ANGLE_CHANGE = 0.5;
export const BUTTERFLY_BOUNDARY_POSITION_ADJUSTMENT = 5;

// CollisionSystem Constants
export const MAX_PLAYER_RADIUS = 100;
export const RADIUS_GAIN_FACTOR = 0.02;
export const HEAD_ON_COLLISION_ANGLE_THRESHOLD = Math.PI / 2;

// NetworkManager Constants
export const PLAYER_UPDATE_RATE_LIMIT_FPS = 30;
export const HIGH_PING_THRESHOLD = 100;
export const HIGH_PING_UPDATE_RATE_FPS = 30;
export const LOW_PING_UPDATE_RATE_FPS = 60;
export const DEAD_PLAYER_UPDATE_RATE_FPS = 10;

// GameLoop Constants
export const AI_TICK_RATE_DIVISOR = 2;
export const PLAYER_SPEED_INTERPOLATION_FACTOR = 0.1;
export const BOOST_FOOD_DROP_DISTANCE = 10;
export const FOOD_MAGNET_FORCE_MULTIPLIER = 10;
export const DYNAMIC_FOOD_TARGET_BASE = 1600;
export const DYNAMIC_FOOD_TARGET_PER_PLAYER = 600;

export {
    worldSize,
    BOT_NAMES,
    SPAWN_BUFFER,
    BOT_BOUNDARY_BUFFER,
    FOOD_TYPES,
    POWERUP_TYPES,
    gridCellSize,

    // Export new constants
    GAME_TICK_RATE_MS,
    NETWORK_UPDATE_RATE_MS,
    POWERUP_SPAWN_INTERVAL_MS,
    MIN_POWERUPS,
    FOOD_PER_PLAYER,
    FOOD_MAGNET_RADIUS,
    FOOD_MAGNET_FORCE,
    BASE_SPEED_MIN,
    BASE_SPEED_MAX_INITIAL,
    LENGTH_DIVISOR_SPEED,
    TURN_RATE_MIN,
    TURN_RATE_MAX_INITIAL,
    LENGTH_DIVISOR_TURN_RATE,
    BOOST_SPEED_MULTIPLIER,
    BOOST_LENGTH_CONSUMPTION_RATE,
    BOOST_FOOD_DROP_PROBABILITY,
    BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP,
    BOOST_FOOD_DROP_INTERVAL,
    BOT_MANAGEMENT_INTERVAL_MS,
    MIN_BOT_COUNT,
    BOT_COUNT_HUMAN_MULTIPLIER,
    BOT_SCORE_DIFFERENCE_FACTOR,
    BOT_SCORE_DIFFERENCE_BONUS,
    SNAKE_SEGMENT_RADIUS,
    FOOD_COLLISION_BUFFER,

    // Export AI constants
    AI_VISION_RANGE_DIMENSION,
    AI_VISION_RANGE_WIDTH,
    AI_THREAT_SIZE_RATIO,
    AI_FLEE_THRESHOLD_BASE,
    AI_FLEE_THRESHOLD_INCREASED,
    AI_FLEE_THRESHOLD_SIZE_RATIO,
    AI_ATTACK_THRESHOLD,
    AI_ATTACK_SIZE_ADVANTAGE,
    AI_SENSOR_LENGTH_MULTIPLIER,
    AI_GOAL_VECTOR_WEIGHT,
    AI_AVOIDANCE_VECTOR_WEIGHT,
    AI_STEERING_MAGNITUDE_THRESHOLD,
    DEBUG_MODE
};
