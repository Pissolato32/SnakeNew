const Constants = require('./Constants');

class GameLoop {
    constructor(playerManager, foodManager, powerupManager, collisionSystem, networkManager, aiManager) {
        this.playerManager = playerManager;
        this.foodManager = foodManager;
        this.powerupManager = powerupManager;
        this.collisionSystem = collisionSystem;
        this.networkManager = networkManager;
        this.aiManager = aiManager; // Store AIManager instance
        this.botTickCounter = 0;
    }

    initGame() {
        // Initial food and powerups are now handled by the dynamic management loop
        this.playerManager.initBots(); // Initialize bots
    }

    start() {
        // Main game loop for physics, AI, and collisions
        setInterval(() => {
            console.time("GameLoopTick"); // Start timing
            this.botTickCounter++;
            const players = this.playerManager.getPlayers();

            for (const id in players) {
                const player = players[id];

                if (Constants.DEBUG_MODE && !player.isBot) {
                    console.log(`SERVER - Player ${player.id} Pos: (${player.x.toFixed(2)}, ${player.y.toFixed(2)})`);
                }

                // --- AI Logic ---
                if (player.isBot) {
                    if (this.botTickCounter % 2 === 0) { // Run AI at 30 FPS
                        this.aiManager.update(player);
                    }
                }

                // --- Physics and Movement ---
                const angleDiff = player.targetAngle - player.angle;
                player.angle += Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)) * player.turnRate;

                const baseSpeed = Math.max(Constants.BASE_SPEED_MIN, Constants.BASE_SPEED_MAX_INITIAL - (player.maxLength / Constants.LENGTH_DIVISOR_SPEED));
                player.turnRate = Math.max(Constants.TURN_RATE_MIN, Constants.TURN_RATE_MAX_INITIAL - (player.maxLength / Constants.LENGTH_DIVISOR_TURN_RATE) * Constants.TURN_RATE_MIN);

                if (player.isBoosting && player.maxLength > Constants.BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
                    player.speed = baseSpeed * Constants.BOOST_SPEED_MULTIPLIER;
                    player.maxLength -= Constants.BOOST_LENGTH_CONSUMPTION_RATE;
                    if (Math.random() < Constants.BOOST_FOOD_DROP_PROBABILITY && player.body.length > Constants.BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
                        const tail = player.body.get(player.body.length - 1);
                        this.foodManager.addFood(this.foodManager.createFood(tail.x, tail.y, 0));
                    }
                    if (player.maxLength <= Constants.BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
                        player.isBoosting = false;
                    }
                } else {
                    player.speed = baseSpeed;
                }

                player.x += Math.cos(player.angle) * player.speed;
                player.y += Math.sin(player.angle) * player.speed;

                player.headHistory.addFirst({ x: player.x, y: player.y, timestamp: Date.now() });

                player.body.addFirst({ x: player.x, y: player.y });
                while (player.body.length > player.maxLength) {
                    player.body.removeLast();
                }

                this.playerManager.playerSpatialHashing.update(player);
            }

            this.collisionSystem.processCollisions();
            console.timeEnd("GameLoopTick");

        }, Constants.GAME_TICK_RATE_MS);

        // Network update loop
        setInterval(() => {
            this.networkManager.sendGameUpdates();
        }, Constants.NETWORK_UPDATE_RATE_MS);

        // Dynamic game management loop (bots, food, etc.)
        setInterval(() => {
            const allPlayers = Object.values(this.playerManager.getPlayers());
            const humanPlayers = allPlayers.filter(p => !p.isBot);
            const bots = allPlayers.filter(p => p.isBot);

            // --- Dynamic Bot Management ---
            let scoreBonusBots = 0;
            if (humanPlayers.length > 0 && bots.length > 0) {
                const totalBotScore = bots.reduce((sum, bot) => sum + bot.maxLength, 0);
                const averageBotScore = totalBotScore / bots.length;
                const maxHumanScore = Math.max(...humanPlayers.map(p => p.maxLength));

                if (maxHumanScore > averageBotScore * Constants.BOT_SCORE_DIFFERENCE_FACTOR) {
                    scoreBonusBots = Constants.BOT_SCORE_DIFFERENCE_BONUS;
                }
            }

            const targetBotCount = Math.max(Constants.MIN_BOT_COUNT, (humanPlayers.length * Constants.BOT_COUNT_HUMAN_MULTIPLIER) + scoreBonusBots);

            if (bots.length < targetBotCount) {
                this.playerManager.addBot();
            } else if (bots.length > targetBotCount) {
                const botToRemove = bots[0]; // Simple strategy: remove the first bot in the list
                if (botToRemove) {
                    this.playerManager.removePlayer(botToRemove);
                }
            }

            // --- Dynamic Food Management ---
            const targetFoodCount = allPlayers.length * Constants.FOOD_PER_PLAYER;
            const currentFoodCount = this.foodManager.getFood().length;
            if (currentFoodCount < targetFoodCount) {
                const foodToAdd = targetFoodCount - currentFoodCount;
                for (let i = 0; i < foodToAdd; i++) {
                    this.foodManager.addFood(this.foodManager.createFood(undefined, undefined, undefined, allPlayers, Constants.SPAWN_BUFFER));
                }
            }

            // --- Dynamic Powerup Management ---
            if (this.powerupManager.getPowerups().length < Constants.MIN_POWERUPS) {
                this.powerupManager.addPowerup(this.powerupManager.createPowerup());
            }

        }, Constants.BOT_MANAGEMENT_INTERVAL_MS);
    }
}

module.exports = GameLoop;
