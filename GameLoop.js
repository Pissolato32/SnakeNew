const { foodAmount, SPAWN_BUFFER, GAME_TICK_RATE_MS, POWERUP_SPAWN_INTERVAL_MS, MIN_POWERUPS, FOOD_MAGNET_RADIUS, FOOD_MAGNET_FORCE, BASE_SPEED_MIN, BASE_SPEED_MAX_INITIAL, LENGTH_DIVISOR_SPEED, TURN_RATE_MIN, TURN_RATE_MAX_INITIAL, LENGTH_DIVISOR_TURN_RATE, BOOST_SPEED_MULTIPLIER, BOOST_LENGTH_CONSUMPTION_RATE, BOOST_FOOD_DROP_PROBABILITY, BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP, BOT_MANAGEMENT_INTERVAL_MS, MIN_BOT_COUNT, BOT_COUNT_HUMAN_MULTIPLIER } = require('./Constants');

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
        for (let i = 0; i < foodAmount; i++) {
            this.foodManager.addFood(this.foodManager.createFood(undefined, undefined, undefined, this.playerManager.getPlayers(), SPAWN_BUFFER));
        }
        this.powerupManager.addPowerup(this.powerupManager.createPowerup());
        this.playerManager.initBots(); // Initialize bots

        setInterval(() => {
            if (this.powerupManager.getPowerups().length < MIN_POWERUPS) {
                this.powerupManager.addPowerup(this.powerupManager.createPowerup());
            }
        }, POWERUP_SPAWN_INTERVAL_MS);
    }

    start() {
        setInterval(() => {
            this.botTickCounter++;
            const players = this.playerManager.getPlayers();

            for (const id in players) {
                const player = players[id];

                // --- AI Logic ---
                if (player.isBot) {
                    if (this.botTickCounter % 2 === 0) { // Run AI at 30 FPS
                        this.aiManager.update(player);
                    }
                }

                // --- Power-up Effects ---
                if (player.powerups.foodMagnet?.active) {
                    if (Date.now() > player.powerups.foodMagnet.endTime) {
                        player.powerups.foodMagnet.active = false;
                    } else {
                        const magnetRadius = FOOD_MAGNET_RADIUS;
                        const magnetForce = FOOD_MAGNET_FORCE;
                        const foodQueryRange = { x: player.x - magnetRadius, y: player.y - magnetRadius, width: magnetRadius * 2, height: magnetRadius * 2 };
                        const nearbyFood = this.foodManager.foodSpatialHashing.query(foodQueryRange);
                        nearbyFood.forEach(f => {
                            if (Math.hypot(player.x - f.x, player.y - f.y) < magnetRadius) {
                                f.x += (player.x - f.x) * magnetForce;
                                f.y += (player.y - f.y) * magnetForce;
                                // Update spatial hashing for the moved food item
                                this.foodManager.foodSpatialHashing.update(f);
                            }
                        });
                    }
                }

                // --- Physics and Movement ---
                const angleDiff = player.targetAngle - player.angle;
                player.angle += Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)) * player.turnRate;

                const baseSpeed = Math.max(BASE_SPEED_MIN, BASE_SPEED_MAX_INITIAL - (player.maxLength / LENGTH_DIVISOR_SPEED));
                player.turnRate = Math.max(TURN_RATE_MIN, TURN_RATE_MAX_INITIAL - (player.maxLength / LENGTH_DIVISOR_TURN_RATE) * TURN_RATE_MIN);

                if (player.isBoosting && player.maxLength > BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
                    player.speed = baseSpeed * BOOST_SPEED_MULTIPLIER;
                    player.maxLength -= BOOST_LENGTH_CONSUMPTION_RATE;
                    if (Math.random() < BOOST_FOOD_DROP_PROBABILITY && player.body.length > BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
                        const tail = player.body.get(player.body.length - 1);
                        this.foodManager.addFood(this.foodManager.createFood(tail.x, tail.y, 0));
                    }
                    // If boosting causes length to drop below threshold, stop boosting
                    if (player.maxLength <= BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
                        player.isBoosting = false;
                    }
                } else {
                    player.speed = baseSpeed;
                }

                player.x += Math.cos(player.angle) * player.speed;
                player.y += Math.sin(player.angle) * player.speed;

                // Add current position to head history for lag compensation
                player.headHistory.addFirst({ x: player.x, y: player.y, timestamp: Date.now() });

                player.body.addFirst({ x: player.x, y: player.y });
                while (player.body.length > player.maxLength) {
                    player.body.removeLast();
                }

                this.playerManager.playerSpatialHashing.update(player);
            }

            this.collisionSystem.processCollisions();
            this.networkManager.sendGameUpdates();

        }, GAME_TICK_RATE_MS);

        // Note: Dynamic bot management logic could be moved to its own manager in the future.
        setInterval(() => {
            const humanPlayerCount = this.playerManager.getHumanPlayerCount();
            const currentBotCount = Object.values(this.playerManager.getPlayers()).filter(p => p.isBot).length;
            const targetBotCount = Math.max(MIN_BOT_COUNT, humanPlayerCount * BOT_COUNT_HUMAN_MULTIPLIER); // Simplified logic

            if (currentBotCount < targetBotCount) {
                this.playerManager.addBot();
            } else if (currentBotCount > targetBotCount) {
                const botToRemove = Object.values(this.playerManager.getPlayers()).find(p => p.isBot);
                if (botToRemove) {
                    this.playerManager.removePlayer(botToRemove);
                }
            }
        }, BOT_MANAGEMENT_INTERVAL_MS);
    }
}

module.exports = GameLoop;
