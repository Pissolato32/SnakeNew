const PlayerManager = require('./PlayerManager');
const FoodManager = require('./FoodManager');
const PowerupManager = require('./PowerupManager');
const CollisionSystem = require('./CollisionSystem');
const NetworkManager = require('./NetworkManager');
const GameLoop = require('./GameLoop');
const AIManager = require('./AIManager'); // Import AIManager

class GameManager {
    constructor(io) {
        this.io = io;
        console.log('GameManager initialized');

        // Instantiate Managers
        this.foodManager = new FoodManager();
        this.playerManager = new PlayerManager(this.io, this.foodManager);
        this.powerupManager = new PowerupManager(this.playerManager);
        this.aiManager = new AIManager(this.playerManager, this.foodManager); // Instantiate AIManager
        this.collisionSystem = new CollisionSystem(this.playerManager, this.foodManager, this.powerupManager);
        this.networkManager = new NetworkManager(this.io, this.playerManager, this.foodManager, this.powerupManager);
        this.gameLoop = new GameLoop(this.playerManager, this.foodManager, this.powerupManager, this.collisionSystem, this.networkManager, this.aiManager); // Pass AIManager to GameLoop
    }

    start() {
        console.log('GameManager started');
        this.networkManager.setupSocketListeners();
        this.gameLoop.initGame();
        this.gameLoop.start();
    }
}

module.exports = GameManager;
