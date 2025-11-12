// =================================================================================
// Client Constants
// =================================================================================

export const DEBUG_MODE = false;
export const foodAmount = 500; // This might be dynamic now, but keeping for initial client setup
export const BOT_COUNT = 30; // This is server-side, but might be used for client-side bot rendering if applicable

// Food and Powerup Types (Client-side specific, if any)
export const FOOD_TYPES = []; // Will be populated from server if needed
export const POWERUP_TYPES = []; // Will be populated from server if needed

// Game Loop and Physics Constants (Client-side specific)
export const FOOD_COLLISION_BUFFER = 5; // Client-side visual buffer

// Performance and Network Constants (Client-side specific)
export const HIGH_PING_THRESHOLD = 100;
export const HIGH_PING_UPDATE_RATE_FPS = 30;
export const LOW_PING_UPDATE_RATE_FPS = 60;
export const DEAD_PLAYER_UPDATE_RATE_FPS = 10;

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
