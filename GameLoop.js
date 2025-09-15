import * as Constants from './Constants.js';
import AntiCheat from './server/AntiCheat.js';

class GameLoop {
    constructor(playerManager, foodManager, powerupManager, collisionSystem, networkManager, aiManager, logger) {
        this.playerManager = playerManager;
        this.foodManager = foodManager;
        this.powerupManager = powerupManager;
        this.collisionSystem = collisionSystem;
        this.networkManager = networkManager;
        this.aiManager = aiManager; // Store AIManager instance
        this.botTickCounter = 0;
        this.logger = logger;
        this.antiCheat = new AntiCheat(this.logger);
    }

    initGame() {
        // Initial food and powerups are now handled by the dynamic management loop
    }

    start() {
        // Main game loop for physics, AI, and collisions
        setInterval(() => {
            this.botTickCounter++;
            const players = this.playerManager.getPlayers();

            for (const id in players) {
                const player = players[id];

                if (player.isDead) {
                    // Skip updating dead players and their body segments in spatial hashing and other updates
                    continue;
                }

                this.logger.debug(`SERVER - Player ${player.id} Pos: (${player.x.toFixed(2)}, ${player.y.toFixed(2)})`);

                // --- AI Logic ---
                if (player.isBot) {
                    if (this.botTickCounter % Constants.AI_TICK_RATE_DIVISOR === 0) { // Run AI at 30 FPS
                        this.aiManager.update(player);
                    }
                }

                // --- Physics and Movement ---
                const angleDiff = player.targetAngle - player.angle;
                player.angle += Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)) * player.turnRate;

                player.baseSpeed = Math.max(Constants.BASE_SPEED_MIN, Constants.BASE_SPEED_MAX_INITIAL - (player.maxLength / Constants.LENGTH_DIVISOR_SPEED));
                player.turnRate = Math.max(Constants.TURN_RATE_MIN, Constants.TURN_RATE_MAX_INITIAL - (player.maxLength / Constants.LENGTH_DIVISOR_TURN_RATE) * Constants.TURN_RATE_MIN);

                let targetSpeed;
                if (player.isBoosting && player.body.length > Constants.BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
                    targetSpeed = player.baseSpeed * Constants.BOOST_SPEED_MULTIPLIER;
                    player.boostDropCounter++;

                    // Drop food every few ticks to create a trail
                    if (player.boostDropCounter >= Constants.BOOST_FOOD_DROP_INTERVAL) {
                        player.maxLength -= 1; // Consume length
                        player.boostDropCounter = 0;

                        const dropDistance = player.radius + Constants.BOOST_FOOD_DROP_DISTANCE;
                        const dropX = player.x - Math.cos(player.angle) * dropDistance;
                        const dropY = player.y - Math.sin(player.angle) * dropDistance;
                        
                        if (Math.hypot(dropX, dropY) < Constants.worldSize / 2 - 10) {
                            // Drop a single, low-value food item (type 0)
                            const food = this.foodManager.createFood(dropX, dropY, 0, this.playerManager.getPlayers(), Constants.SPAWN_BUFFER);
                            this.foodManager.addFood(food);
                        }
                    }

                    if (player.maxLength <= Constants.BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
                        player.isBoosting = false;
                    }
                } else {
                    targetSpeed = player.baseSpeed;
                }

                // Smoothly interpolate the current speed towards the target speed
                player.speed += (targetSpeed - player.speed) * Constants.PLAYER_SPEED_INTERPOLATION_FACTOR;

                player.x += Math.cos(player.angle) * player.speed;
                player.y += Math.sin(player.angle) * player.speed;

                // Update spatial hash with new position
                this.playerManager.playerSpatialHashing.update(player);

                player.headHistory.addFirst({ x: player.x, y: player.y, timestamp: Date.now() });

                player.body.addFirst({ x: player.x, y: player.y });
                while (player.body.length > player.maxLength) {
                    player.body.removeLast();
                }

                // Update spatial hash for each body segment for accurate collision detection
                for (let i = 0; i < player.body.length; i++) {
                    const segment = player.body.get(i);
                    this.playerManager.playerSpatialHashing.update(segment);
                }

                this.playerManager.playerSpatialHashing.update(player);

                // Food magnet one-time attraction
                if (player.powerups.foodMagnet && player.powerups.foodMagnet.attractOnce) {
                    const foodItems = this.foodManager.getFood();
                    foodItems.forEach(f => {
                        const distance = Math.hypot(player.x - f.x, player.y - f.y);
                        if (distance < Constants.FOOD_MAGNET_RADIUS) {
                            const angle = Math.atan2(player.y - f.y, player.x - f.x);
                            const force = Constants.FOOD_MAGNET_FORCE * Constants.FOOD_MAGNET_FORCE_MULTIPLIER * (Constants.FOOD_MAGNET_RADIUS - distance) / Constants.FOOD_MAGNET_RADIUS;
                            f.x += Math.cos(angle) * force;
                            f.y += Math.sin(angle) * force;
                            // Ensure food stays within bounds
                            const distFromCenter = Math.hypot(f.x, f.y);
                            if (distFromCenter > Constants.worldSize / 2 - 10) {
                                const angleToCenter = Math.atan2(f.y, f.x);
                                f.x = Math.cos(angleToCenter) * (Constants.worldSize / 2 - 10);
                                f.y = Math.sin(angleToCenter) * (Constants.worldSize / 2 - 10);
                            }
                        }
                    });
                    player.powerups.foodMagnet.attractOnce = false;
                }

                // Anti-cheat checks
                if (!player.isBot) {
                    this.antiCheat.updatePlayerHistory(player);
                    if (this.antiCheat.detectSpeedHack(player) || this.antiCheat.detectTeleport(player)) {
                        this.logger.warn(`Cheating detected for player ${player.id}, removing from game`);
                        this.playerManager.killPlayer(player);
                    }
                }
            }

            this.collisionSystem.processCollisions();

            this.foodManager.updateFoodMovement(); // Update food positions for floating effect

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
                // Remove the bot with the lowest score
                const botToRemove = bots.reduce((lowest, bot) => bot.maxLength < lowest.maxLength ? bot : lowest);
                if (botToRemove) {
                    this.playerManager.removePlayer(botToRemove);
                }
            }

            // --- Dynamic Food Management ---
            const targetFoodCount = Constants.DYNAMIC_FOOD_TARGET_BASE + (allPlayers.length * Constants.DYNAMIC_FOOD_TARGET_PER_PLAYER);
            const currentFoodCount = this.foodManager.getFood().length;
            if (currentFoodCount < targetFoodCount) {
                const foodToAdd = targetFoodCount - currentFoodCount;
                this.foodManager.addFoodInBatch(foodToAdd, this.playerManager.getPlayers(), Constants.SPAWN_BUFFER);
            }

            // Removed expired food removal to prevent food disappearing

            // --- Dynamic Powerup Management ---
            if (this.powerupManager.getPowerups().length < Constants.MIN_POWERUPS) {
                this.powerupManager.addPowerup(this.powerupManager.createPowerup());
            }

        }, Constants.BOT_MANAGEMENT_INTERVAL_MS);
    }
}

export default GameLoop;
