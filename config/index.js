const path = require('path');

// Load environment variables if dotenv is available
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not installed, use process.env directly
}

const config = {
    PORT: process.env.PORT || 3000,
    DEBUG_MODE: process.env.DEBUG_MODE === 'true' || false,
    BOT_COUNT: parseInt(process.env.BOT_COUNT) || 10,
    WORLD_SIZE: parseInt(process.env.WORLD_SIZE) || 30000,
    MAX_PLAYERS: parseInt(process.env.MAX_PLAYERS) || 100,
    // Add more config as needed
};

function loadConfig() {
    // Could load from file or database
    return config;
}

function getConfig(key) {
    return config[key];
}

export default {
    loadConfig,
    getConfig,
    config
};
