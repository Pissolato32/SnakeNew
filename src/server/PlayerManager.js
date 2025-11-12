import { BOT_NAMES, SPAWN_BUFFER, PLAYER_SPATIAL_HASH_CELL_SIZE, DEFAULT_PLAYER_COLORS, SNAKE_BODY_BUFFER_SIZE, SNAKE_HEAD_HISTORY_SIZE, INITIAL_SNAKE_LENGTH, INITIAL_SNAKE_RADIUS, INITIAL_SNAKE_TURN_RATE, INITIAL_SNAKE_SPEED, DEATH_FOOD_DROP_STEP, DEATH_FOOD_DROP_OFFSET, DEATH_FOOD_TYPE_INDEX, DEATH_FOOD_COLOR, DEATH_FOOD_RGB } from '../shared/Constants.js';
import { getSafeSpawnPoint } from '../shared/Utils.js';
import SpatialHashing from '../shared/SpatialHashing.js';
import CircularBuffer from '../shared/CircularBuffer.js';
import config from '../../config/index.js';
import Validator from './Validator.js';

class PlayerManager {
    constructor(io, foodManager, logger, roomId) {
        this.io = io;
        this.players = {};
        this.playerSpatialHashing = new SpatialHashing(PLAYER_SPATIAL_HASH_CELL_SIZE);
        this.foodManager = foodManager;
        this.logger = logger;
        this.roomId = roomId;
    }

    createPlayer(id, nickname, isBot = false, skin = 'default', color = null) {
        const startPos = getSafeSpawnPoint(this.players, SPAWN_BUFFER);

        let playerColor = color;
        if (!playerColor) {
            playerColor = DEFAULT_PLAYER_COLORS[Math.floor(Math.random() * DEFAULT_PLAYER_COLORS.length)];
        }

        const r = parseInt(playerColor.slice(1, 3), 16) || 0;
        const g = parseInt(playerColor.slice(3, 5), 16) || 0;
        const b = parseInt(playerColor.slice(5, 7), 16) || 0;

        const newPlayer = {
            id: id,
            nickname: nickname,
            x: startPos.x,
            y: startPos.y,
            color: playerColor,
            rgb: { r, g, b },
            body: new CircularBuffer(SNAKE_BODY_BUFFER_SIZE),
            headHistory: new CircularBuffer(SNAKE_HEAD_HISTORY_SIZE),
            bodySegments: [],
            maxLength: INITIAL_SNAKE_LENGTH,
            radius: INITIAL_SNAKE_RADIUS,
            angle: Math.random() * 2 * Math.PI,
            targetAngle: 0,
            turnRate: INITIAL_SNAKE_TURN_RATE,
            speed: INITIAL_SNAKE_SPEED,
            isBot: isBot,
            isBoosting: false,
            aiState: 'FARMING',
            powerups: {},
            ping: 0,
            lastFoodDropTime: 0,
            boostDropCounter: 0,
            skin: skin,
            lastProcessedInputSeq: 0,
            handleInput: (data) => {
                if (Validator.validateMovement(data)) {
                    newPlayer.targetAngle = data.angle;
                    newPlayer.isBoosting = data.isBoosting;
                    if (data.seq) {
                        newPlayer.lastProcessedInputSeq = data.seq;
                    }
                }
            }
        };
        newPlayer.body.addFirst(startPos);
        newPlayer.targetAngle = newPlayer.angle;
        
        this.addPlayer(newPlayer);
        return newPlayer;
    }

    addPlayer(player) {
        this.players[player.id] = player;
        this.playerSpatialHashing.insert(player);
        this.logger.info(`Player ${player.nickname} (${player.id}) added to room ${this.roomId}.`);
    }

    removePlayer(playerId) {
        const player = this.players[playerId];
        if (!player) return;

        this.playerSpatialHashing.remove(player);
        // Also remove body segments from spatial hash
        for (const segment of player.bodySegments) {
            this.playerSpatialHashing.remove(segment);
        }

        delete this.players[player.id];
        this.logger.info(`Player ${player.nickname} (${playerId}) removed from room ${this.roomId}.`);
    }

    killPlayer(player) {
        player.isDead = true;

        // Game logic for dropping food on death
        if (player.body.length > 0) {
            for (let i = 0; i < player.body.length; i += DEATH_FOOD_DROP_STEP) {
                const segment = player.body.get(i);
                if (!segment) continue;

                const offsetX = (Math.random() - 0.5) * DEATH_FOOD_DROP_OFFSET;
                const offsetY = (Math.random() - 0.5) * DEATH_FOOD_DROP_OFFSET;

                const foodItem = this.foodManager.createFood(
                    segment.x + offsetX, 
                    segment.y + offsetY, 
                    DEATH_FOOD_TYPE_INDEX, 
                    this.players, 
                    SPAWN_BUFFER
                );
                foodItem.glow = true;
                foodItem.color = DEATH_FOOD_COLOR;
                foodItem.rgb = DEATH_FOOD_RGB;
                this.foodManager.addFood(foodItem);
            }
        }

        // The 'death' event will be emitted by the Room, which has the socket reference
        // this.removePlayer(player.id); // The player object is kept as 'dead' until cleanup
    }

    addBot() {
        const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
        let baseName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        let botName = baseName;
        let counter = 1;

        while (Object.values(this.players).some(p => p.nickname === botName)) {
            botName = `${baseName} ${counter}`;
            counter++;
        }
        this.createPlayer(botId, botName, true);
    }

    initBots() {
        const botCount = config.BOT_COUNT || 0;
        for (let i = 0; i < botCount; i++) { this.addBot(); }
    }

    getPlayers() {
        return this.players;
    }
}

export default PlayerManager;

