import PlayerManager from './PlayerManager.js';
import FoodManager from './FoodManager.js';
import PowerupManager from './PowerupManager.js';
import CollisionSystem from './CollisionSystem.js';
import NetworkManager from './NetworkManager.js';
import GameLoop from './GameLoop.js';
import AIManager from './AIManager.js';
import * as Constants from './Constants.js';
import Logger from './public/shared/Logger.js';

class GameManager {
    constructor(io) {
        this.io = io;
        this.logger = new Logger(Constants.DEBUG_MODE ? 'debug' : 'info');
        this.logger.info('GameManager initialized');

        // Instantiate Managers
        this.foodManager = new FoodManager(this.logger);
        this.playerManager = new PlayerManager(this.io, this.foodManager, this.logger);
        this.powerupManager = new PowerupManager(this.playerManager, this.logger);
        this.aiManager = new AIManager(this.playerManager, this.foodManager, this.logger);
        this.collisionSystem = new CollisionSystem(this.playerManager, this.foodManager, this.powerupManager, this.logger);
        this.networkManager = new NetworkManager(this.io, this.playerManager, this.foodManager, this.powerupManager, this.logger);
        this.gameLoop = new GameLoop(this.playerManager, this.foodManager, this.powerupManager, this.collisionSystem, this.networkManager, this.aiManager, this.logger);
    }

    async initializeWorld() {
        this.logger.info('Initializing game world...');
        // 1. Initialize bots
        this.playerManager.initBots();
        this.logger.info(`${Object.values(this.playerManager.getPlayers()).length} bots initialized.`);

        // 2. Populate the world with initial food
        const initialPlayerCount = Object.values(this.playerManager.getPlayers()).length;
        const initialFoodCount = Constants.DYNAMIC_FOOD_TARGET_BASE + (initialPlayerCount * Constants.DYNAMIC_FOOD_TARGET_PER_PLAYER);
        this.foodManager.addFoodInBatch(initialFoodCount, this.playerManager.getPlayers(), Constants.SPAWN_BUFFER);
        this.logger.info(`${initialFoodCount} food items generated.`);
        this.logger.info('Game world initialized.');
    }

    async start() {
        this.logger.info('Starting GameManager...');
        
        // First, populate the world
        await this.initializeWorld();

        // Then, allow players to connect
        this.networkManager.setupSocketListeners();
        
        // Finally, start the game's continuous loop
        this.gameLoop.start();
        
        this.logger.info('GameManager started and listening for connections.');
    }
}

export default GameManager;
