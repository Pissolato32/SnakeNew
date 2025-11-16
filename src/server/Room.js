import PlayerManager from './PlayerManager.js';
import FoodManager from './FoodManager.js';
import PowerupManager from './PowerupManager.js';
import CollisionSystem from './CollisionSystem.js';
import AIManager from './AIManager.js';
import AntiCheat from './AntiCheat.js';
import { 
    DYNAMIC_FOOD_TARGET_BASE, 
    DYNAMIC_FOOD_TARGET_PER_PLAYER, 
    SPAWN_BUFFER,
    BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP,
    BOOST_SPEED_MULTIPLIER,
    BOOST_FOOD_DROP_INTERVAL,
    BOOST_LENGTH_CONSUMED_PER_DROP,
    DEATH_FOOD_DROP_OFFSET,
    DEATH_FOOD_TYPE_INDEX,
    DEATH_FOOD_COLOR,
    DEATH_FOOD_RGB,
    SNAKE_SEGMENT_RADIUS,
    FOOD_MAGNET_RADIUS,
    FOOD_MAGNET_FORCE,
    FOOD_MAGNET_FORCE_MULTIPLIER,
    WORLD_SIZE,
    AI_TICK_RATE_DIVISOR,
    TURN_RATE_MIN,
    TURN_RATE_MAX_INITIAL,
    LENGTH_DIVISOR_TURN_RATE,
    BASE_SPEED_MIN,
    BASE_SPEED_MAX_INITIAL,
    LENGTH_DIVISOR_SPEED,
    MIN_POWERUPS,
    BOT_COUNT_HUMAN_MULTIPLIER,
    BOT_SCORE_DIFFERENCE_FACTOR,
    BOT_SCORE_DIFFERENCE_BONUS,
    MIN_BOT_COUNT,
    GAME_TICK_RATE_MS
} from '../shared/Constants.js';

class Room {
    constructor(roomId, io, logger) {
        this.id = roomId;
        this.io = io;
        this.logger = logger;

        this.logger.info(`Room ${this.id} created`);

        this.foodManager = new FoodManager(this.logger);
        this.playerManager = new PlayerManager(this.io, this.foodManager, this.logger, this.id);
        this.powerupManager = new PowerupManager(this.playerManager, this.logger);
        this.aiManager = new AIManager(this.playerManager, this.foodManager, this.logger);
        this.collisionSystem = new CollisionSystem(this.playerManager, this.foodManager, this.powerupManager, this, this.logger);
        this.antiCheat = new AntiCheat(this.logger);

        this.tickCount = 0;
        this.dynamicManagementCounter = 0;
        this.initializeWorld();
    }

    initializeWorld() {
        this.logger.info(`Initializing world for room ${this.id}...`);
        this.playerManager.initBots();
        const initialPlayerCount = Object.values(this.playerManager.getPlayers()).length;
        const initialFoodCount = DYNAMIC_FOOD_TARGET_BASE + (initialPlayerCount * DYNAMIC_FOOD_TARGET_PER_PLAYER);
        this.foodManager.addFoodInBatch(initialFoodCount, this.playerManager.getPlayers(), SPAWN_BUFFER);
    }

    addPlayer(socket, playerData) {
        const { nickname, skin, color } = playerData;
        this.playerManager.createPlayer(socket.id, nickname, false, skin, color);
        socket.emit('game-setup', { worldSize: WORLD_SIZE });
    }

    removePlayer(socketId) {
        this.playerManager.removePlayer(socketId);
    }

    killPlayer(player) {
        this.playerManager.killPlayer(player);
        const socket = this.io.sockets.sockets.get(player.id);
        if (socket) {
            socket.emit('death', { score: Math.floor(player.maxLength) });
        }
    }

    tick() {
        const tickStartTime = process.hrtime.bigint();

        this.tickCount++;
        this.updateGameLogic();
        this.dynamicManagementCounter++;
        if (this.dynamicManagementCounter >= (1000 / (1000 / GAME_TICK_RATE_MS)) / 2) { // Roughly every 2 seconds
            this.manageDynamicElements();
            this.dynamicManagementCounter = 0;
        }

        const tickEndTime = process.hrtime.bigint();
        const tickDurationMs = Number(tickEndTime - tickStartTime) / 1_000_000; // Convert nanoseconds to milliseconds
        // Log tick duration if it exceeds a certain threshold or periodically
        if (tickDurationMs > (1000 / GAME_TICK_RATE_MS)) {
            this.logger.warn(`Room ${this.id} tick took too long: ${tickDurationMs.toFixed(2)}ms`);
        }
        // Optionally log every tick for detailed performance analysis
        // this.logger.debug(`Room ${this.id} tick duration: ${tickDurationMs.toFixed(2)}ms`);
    }

    updateGameLogic() {
        const players = this.playerManager.getPlayers();

        for (const id in players) {
            const player = players[id];
            if (player.isDead) continue;

            this._updatePlayerAI(player);
            const targetSpeed = this._handlePlayerBoosting(player);
            this._updatePlayerMovement(player, targetSpeed);
            this._updatePlayerBody(player);
            this._applyPowerUps(player);
            this._runAntiCheat(player);
        }

        this.collisionSystem.processCollisions();
        this.foodManager.updateFoodMovement();
    }

    manageDynamicElements() {
        const allPlayers = Object.values(this.playerManager.getPlayers());
        const humanPlayers = allPlayers.filter(p => !p.isBot);
        const bots = allPlayers.filter(p => p.isBot);

        let scoreBonusBots = 0;
        if (humanPlayers.length > 0 && bots.length > 0) {
            const totalBotScore = bots.reduce((sum, bot) => sum + bot.maxLength, 0);
            const averageBotScore = totalBotScore / bots.length;
            const maxHumanScore = Math.max(...humanPlayers.map(p => p.maxLength));

            if (maxHumanScore > averageBotScore * BOT_SCORE_DIFFERENCE_FACTOR) {
                scoreBonusBots = BOT_SCORE_DIFFERENCE_BONUS;
            }
        }

        const targetBotCount = Math.max(MIN_BOT_COUNT, (humanPlayers.length * BOT_COUNT_HUMAN_MULTIPLIER) + scoreBonusBots);

        if (bots.length < targetBotCount) {
            this.playerManager.addBot();
        } else if (bots.length > targetBotCount) {
            const botToRemove = bots.reduce((lowest, bot) => bot.maxLength < lowest.maxLength ? bot : lowest);
            if (botToRemove) {
                this.playerManager.removePlayer(botToRemove.id);
            }
        }

        const targetFoodCount = DYNAMIC_FOOD_TARGET_BASE + (allPlayers.length * DYNAMIC_FOOD_TARGET_PER_PLAYER);
        const currentFoodCount = this.foodManager.getFood().length;
        if (currentFoodCount < targetFoodCount) {
            const foodToAdd = targetFoodCount - currentFoodCount;
            this.foodManager.addFoodInBatch(foodToAdd, this.playerManager.getPlayers(), SPAWN_BUFFER);
        } else if (currentFoodCount > targetFoodCount * 1.5) {
            const foodToRemove = currentFoodCount - targetFoodCount;
            const allFood = this.foodManager.getFood();
            allFood.slice(0, foodToRemove).forEach(f => this.foodManager.removeFood(f.id));
        }

        if (this.powerupManager.getPowerups().length < MIN_POWERUPS) {
            this.powerupManager.addPowerup(this.powerupManager.createPowerup());
        }
    }

    getSnapshot() {
        const players = this.playerManager.getPlayers();
        const food = this.foodManager.getFood();
        const powerups = this.powerupManager.getPowerups();

        const playersState = Object.values(players).map(p => ({
            id: p.id,
            n: p.nickname,
            skin: p.skin,
            radius: p.radius,
            x: p.x,
            y: p.y,
            angle: p.angle,
            color: p.color,
            s: p.body.toArray().map(segment => ({ x: Math.round(segment.x), y: Math.round(segment.y) })),
            a: !p.isDead,
            sc: p.maxLength,
            seq: p.lastProcessedInputSeq,
        }));

        const foodState = food.map(f => ({ id: f.id, x: f.x, y: f.y, color: f.color, radius: f.radius }));
        const powerupsState = powerups.map(p => ({ id: p.id, x: p.x, y: p.y, type: p.type, color: p.color }));

        return {
            t: this.tickCount,
            players: playersState,
            food: foodState,
            powerups: powerupsState,
        };
    }
    
    _updatePlayerAI(player) {
        if (player.isBot && this.tickCount % (AI_TICK_RATE_DIVISOR || 2) === 0) {
            this.aiManager.update(player);
        }
    }

    _handlePlayerBoosting(player) {
        let targetSpeed = player.baseSpeed;
        if (player.isBoosting && player.maxLength > BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
            targetSpeed = player.baseSpeed * BOOST_SPEED_MULTIPLIER;
            player.boostDropCounter++;

            if (player.boostDropCounter >= BOOST_FOOD_DROP_INTERVAL) {
                player.maxLength -= BOOST_LENGTH_CONSUMED_PER_DROP;
                player.boostDropCounter = 0;

                const dropDistance = player.radius + DEATH_FOOD_DROP_OFFSET;
                const dropX = player.x - Math.cos(player.angle) * dropDistance;
                const dropY = player.y - Math.sin(player.angle) * dropDistance;
                
                if (Math.hypot(dropX, dropY) < WORLD_SIZE / 2 - 10) {
                    const food = this.foodManager.createFood(dropX, dropY, DEATH_FOOD_TYPE_INDEX, this.playerManager.getPlayers(), SPAWN_BUFFER);
                    food.glow = true;
                    food.color = DEATH_FOOD_COLOR;
                    food.rgb = DEATH_FOOD_RGB;
                    this.foodManager.addFood(food);
                }
            }

            if (player.maxLength <= BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
                player.isBoosting = false;
            }
        } else {
            targetSpeed = player.baseSpeed;
        }
        return targetSpeed;
    }

    _updatePlayerMovement(player, targetSpeed) {
        const angleDiff = player.targetAngle - player.angle;
        const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        
        player.turnRate = Math.max(TURN_RATE_MIN, TURN_RATE_MAX_INITIAL - (player.maxLength / LENGTH_DIVISOR_TURN_RATE));
        player.angle += normalizedDiff * Math.min(player.turnRate * 2, Math.abs(normalizedDiff));
        
        player.baseSpeed = Math.max(BASE_SPEED_MIN, BASE_SPEED_MAX_INITIAL - (player.maxLength / LENGTH_DIVISOR_SPEED));
        player.speed = targetSpeed;
        
        const deltaX = Math.cos(player.angle) * player.speed;
        const deltaY = Math.sin(player.angle) * player.speed;
        
        if (!isNaN(deltaX) && !isNaN(deltaY)) {
            player.x += deltaX;
            player.y += deltaY;
        }
        
        player.headHistory.addFirst({ x: player.x, y: player.y, timestamp: Date.now() });
    }

    _updatePlayerBody(player) {
        player.body.addFirst({ x: player.x, y: player.y });
        while (player.body.length > player.maxLength) {
            player.body.removeLast();
        }

        while (player.bodySegments.length > player.body.length - 1) {
            const segmentToRemove = player.bodySegments.pop();
            this.playerManager.playerSpatialHashing.remove(segmentToRemove);
        }
        while (player.bodySegments.length < player.body.length - 1) {
            const newSegment = {
                x: 0, y: 0,
                radius: SNAKE_SEGMENT_RADIUS,
                owner: player
            };
            player.bodySegments.push(newSegment);
            this.playerManager.playerSpatialHashing.insert(newSegment);
        }

        for (let i = 0; i < player.bodySegments.length; i++) {
            const point = player.body.get(i + 1);
            const segment = player.bodySegments[i];
            segment.x = point.x;
            segment.y = point.y;
            this.playerManager.playerSpatialHashing.update(segment);
        }

        this.playerManager.playerSpatialHashing.update(player);
    }

    _applyPowerUps(player) {
        if (player.powerups.foodMagnet && player.powerups.foodMagnet.attractOnce) {
            const foodItems = this.foodManager.getFood();
            foodItems.forEach(f => {
                const distance = Math.hypot(player.x - f.x, player.y - f.y);
                if (distance < FOOD_MAGNET_RADIUS) {
                    const angle = Math.atan2(player.y - f.y, player.x - f.x);
                    const force = FOOD_MAGNET_FORCE * FOOD_MAGNET_FORCE_MULTIPLIER * (FOOD_MAGNET_RADIUS - distance) / FOOD_MAGNET_RADIUS;
                    f.x += Math.cos(angle) * force;
                    f.y += Math.sin(angle) * force;
                    const distFromCenter = Math.hypot(f.x, f.y);
                    if (distFromCenter > WORLD_SIZE / 2 - 10) {
                        const angleToCenter = Math.atan2(f.y, f.x);
                        f.x = Math.cos(angleToCenter) * (WORLD_SIZE / 2 - 10);
                        f.y = Math.sin(angleToCenter) * (WORLD_SIZE / 2 - 10);
                    }
                }
            });
            player.powerups.foodMagnet.attractOnce = false;
        }
    }

    _runAntiCheat(player) {
        if (!player.isBot) {
            this.antiCheat.updatePlayerHistory(player);
            if (this.antiCheat.detectSpeedHack(player) || this.antiCheat.detectTeleport(player)) {
                this.logger.warn(`Cheating detected for player ${player.id}, removing from game`);
                this.killPlayer(player);
            }
        }
    }
}

export default Room;
