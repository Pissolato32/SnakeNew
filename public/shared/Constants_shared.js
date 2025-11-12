// shared/Constants.js - Constants shared between client and server

export const BOT_NAMES = ['Slinky', 'Noodle', 'Worminator', 'Sir Hiss', 'Pretzel', 'Zippy', 'Slitherin', 'Boop', 'Mr. Wiggles', 'Snek'];
export const SPAWN_BUFFER = 800;
export const BOT_BOUNDARY_BUFFER = 500;

export const gridCellSize = 200;

// Game Loop and Physics Constants
export const GAME_TICK_RATE_MS = 1000 / 60; // 60 FPS
export const NETWORK_UPDATE_RATE_MS = 1000 / 30; // 30 FPS for network updates
export const POWERUP_SPAWN_INTERVAL_MS = 15000;
export const MIN_POWERUPS = 5;
export const FOOD_MAGNET_RADIUS = 200;
export const FOOD_MAGNET_FORCE = 0.1;
export const BASE_SPEED_MIN = 3.5;
export const BASE_SPEED_MAX_INITIAL = 4;
export const LENGTH_DIVISOR_SPEED = 50000;
export const TURN_RATE_MIN = 0.05;
export const TURN_RATE_MAX_INITIAL = 0.1;
export const LENGTH_DIVISOR_TURN_RATE = 5000;
export const BOOST_SPEED_MULTIPLIER = 1.8;
export const BOOST_LENGTH_CONSUMPTION_RATE = 0.05;
export const BOOST_FOOD_DROP_PROBABILITY = 0.1;
export const BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP = 5;
export const BOT_MANAGEMENT_INTERVAL_MS = 5000;
export const MIN_BOT_COUNT = 5;
export const BOT_COUNT_HUMAN_MULTIPLIER = 2;
export const BOT_SCORE_DIFFERENCE_FACTOR = 1.5;
export const BOT_SCORE_DIFFERENCE_BONUS = 3;
export const SNAKE_SEGMENT_RADIUS = 6; // New constant for snake body segment radius

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
export const AI_GOAL_VECTOR_WEIGHT = 10.0;
export const AI_AVOIDANCE_VECTOR_WEIGHT = 0.5;
export const AI_STEERING_MAGNITUDE_THRESHOLD = 0.01;

// Base FOOD_TYPES and POWERUP_TYPES - to be extended by server and client
export const BASE_FOOD_TYPES = [
    { radius: 4, score: 1, color: '#FF6347' },
    { radius: 6, score: 2, color: '#FFD700' },
    { radius: 8, score: 3, color: '#ADFF2F' },
    { radius: 10, score: 4, color: '#8A2BE2' }
];

export const worldSize = 30000; // Define worldSize here
export const BASE_POWERUP_TYPES = [
    { type: 'FOOD_MAGNET', color: '#FFFFFF', radius: 12 }
];

// Player and Snake Constants
export const PLAYER_SPATIAL_HASH_CELL_SIZE = 100;
export const POWERUP_SPATIAL_HASH_CELL_SIZE = 100;
export const DEFAULT_PLAYER_COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
export const SNAKE_BODY_BUFFER_SIZE = 200;
export const SNAKE_HEAD_HISTORY_SIZE = 10;
export const INITIAL_SNAKE_LENGTH = 10;
export const INITIAL_SNAKE_RADIUS = 8;
export const INITIAL_SNAKE_TURN_RATE = 0.1;
export const INITIAL_SNAKE_SPEED = 4;

// Death Mechanics
export const DEATH_FOOD_DROP_STEP = 5;
export const DEATH_FOOD_DROP_OFFSET = 50;
export const DEATH_FOOD_TYPE_INDEX = 0; // Index in BASE_FOOD_TYPES
export const DEATH_FOOD_COLOR = '#808080';
export const DEATH_FOOD_RGB = { r: 128, g: 128, b: 128 };

// Dynamic Game Management
export const DYNAMIC_FOOD_TARGET_BASE = 500;
export const DYNAMIC_FOOD_TARGET_PER_PLAYER = 75;

// Network Constants
export const PLAYER_UPDATE_RATE_LIMIT_FPS = 30;
export const HIGH_PING_THRESHOLD = 100;
export const HIGH_PING_UPDATE_RATE_FPS = 30;
export const LOW_PING_UPDATE_RATE_FPS = 60;
export const DEAD_PLAYER_UPDATE_RATE_FPS = 10;
