// =================================================================================
// Unified Constants - Shared between client and server
// =================================================================================

// Game World Constants
export const DEBUG_MODE = false;
export const worldSize = 30000;
export const foodAmount = 500;
export const BOT_COUNT = 30;
export const BOT_NAMES = ['Slinky', 'Noodle', 'Worminator', 'Sir Hiss', 'Pretzel', 'Zippy', 'Slitherin', 'Boop', 'Mr. Wiggles', 'Snek'];
export const SPAWN_BUFFER = 800;
export const BOT_BOUNDARY_BUFFER = 500;

// Food and Powerup Types
export const FOOD_TYPES = [
    { radius: 4, score: 1, color: '#FF6347' },
    { radius: 6, score: 2, color: '#FFD700' },
    { radius: 8, score: 3, color: '#ADFF2F' },
    { radius: 10, score: 4, color: '#8A2BE2' }
];

export const POWERUP_TYPES = [
    { type: 'FOOD_MAGNET', color: '#FFFFFF', radius: 12 }
];

// Spatial Grid Constants
export const gridCellSize = 200;

// Game Loop and Physics Constants
export const GAME_TICK_RATE_MS = 1000 / 60; // 60 FPS
export const NETWORK_UPDATE_RATE_MS = 1000 / 30; // 30 FPS for network updates
export const POWERUP_SPAWN_INTERVAL_MS = 15000;
export const MIN_POWERUPS = 5;
export const FOOD_PER_PLAYER = 75; // Dynamic food setting
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
export const BOT_SCORE_DIFFERENCE_FACTOR = 1.5;
export const BOT_SCORE_DIFFERENCE_BONUS = 3;
export const SNAKE_SEGMENT_RADIUS = 6; // Snake body segment radius
export const FOOD_COLLISION_BUFFER = 5; // Food collision distance adjustment

// AI Constants (unified values)
export const AI_VISION_RANGE_DIMENSION = 800; // Half width/height for vision range
export const AI_VISION_RANGE_WIDTH = 1600; // Full width/height for vision range
export const AI_THREAT_SIZE_RATIO = 1.2;
export const AI_FLEE_THRESHOLD_BASE = 300;
export const AI_FLEE_THRESHOLD_INCREASED = 500;
export const AI_FLEE_THRESHOLD_SIZE_RATIO = 2;
export const AI_ATTACK_THRESHOLD = 500;
export const AI_ATTACK_SIZE_ADVANTAGE = 1.1;
export const AI_SENSOR_LENGTH_MULTIPLIER = 5;
export const AI_GOAL_VECTOR_WEIGHT = 10.0; // Using server value for consistency
export const AI_AVOIDANCE_VECTOR_WEIGHT = 0.5; // Using server value for consistency
export const AI_STEERING_MAGNITUDE_THRESHOLD = 0.01; // Using server value for consistency

// Performance and Network Constants
export const MAX_PLAYERS = 100; // Maximum concurrent players
export const CONNECTION_TIMEOUT_MS = 5000; // Connection timeout
export const PING_INTERVAL_MS = 2000; // Ping interval for latency measurement
export const MAX_UPDATES_PER_SECOND = 30; // Rate limiting for client updates

// UI Constants
export const MINIMAP_SIZE = 200;
export const LEADERBOARD_MAX_ENTRIES = 10;
export const CHAT_MESSAGE_MAX_LENGTH = 200;
export const NICKNAME_MAX_LENGTH = 20;

// Validation Constants
export const MIN_NICKNAME_LENGTH = 1;
export const MAX_NICKNAME_LENGTH = 20;
export const VALID_NICKNAME_REGEX = /^[a-zA-Z0-9\s\-_]+$/;

// Renderer Constants
export const CAMERA_ZOOM_FACTOR = -0.3;
export const CAMERA_ZOOM_MULTIPLIER = 1;
export const CAMERA_ZOOM_SMOOTHING = 0.05;
export const CAMERA_MOVE_SMOOTHING = 0.1;

// UIManager Constants
export const UI_SOLID_COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF', '#33FFF3', '#F4D03F', '#FFFFFF'];
export const LEADERBOARD_SELF_COLOR = '#4CAF50';
