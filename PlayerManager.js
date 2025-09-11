const { BOT_NAMES, SPAWN_BUFFER } = require('./Constants');
const { getSafeSpawnPoint } = require('./Utils');
const SpatialHashing = require('./SpatialHashing');
const CircularBuffer = require('./CircularBuffer');

class PlayerManager {
    constructor(io, foodManager) {
        this.io = io;
        this.players = {};
        this.playerSpatialHashing = new SpatialHashing(200);
        this.foodManager = foodManager;
        this.SPAWN_BUFFER = SPAWN_BUFFER;
    }

    createPlayer(id, nickname, isBot = false) {
        const startPos = getSafeSpawnPoint(this.players, SPAWN_BUFFER);
        const newPlayer = {
            id: id,
            nickname: nickname,
            x: startPos.x,
            y: startPos.y,
            color: `rgb(125, 125, 125)`,
            rgb: { r: 125, g: 125, b: 125 },
            body: new CircularBuffer(100),
            headHistory: new CircularBuffer(30), // For Lag Compensation (30 frames = 500ms at 60fps)
            maxLength: 30,
            radius: 12,
            angle: Math.random() * 2 * Math.PI,
            targetAngle: 0,
            turnRate: 0.1,
            speed: 4,
            isBot: isBot,
            isBoosting: false,
            aiState: 'FARMING',
            powerups: {},
            ping: 0 // Initialize ping
        };
        newPlayer.body.addFirst(startPos);
        newPlayer.targetAngle = newPlayer.angle;

        this.addPlayer(newPlayer);
        return newPlayer;
    }

    addPlayer(player) {
        this.players[player.id] = player;
        this.playerSpatialHashing.insert(player);
    }

    removePlayer(player) {
        if (!player) return;
        this.playerSpatialHashing.remove(player);
        delete this.players[player.id];
    }

    killPlayer(player) {
        const foodValueToRelease = player.maxLength * (0.6 + Math.random() * 0.15);
        let remainingValueToRelease = foodValueToRelease;
        while (remainingValueToRelease > 0 && player.body.length > 0) {
            const segment = player.body.get(Math.floor(Math.random() * player.body.length));
            const offsetX = (Math.random() - 0.5) * 20;
            const offsetY = (Math.random() - 0.5) * 20;
            let chosenFoodTypeIndex = Math.floor(Math.random() * this.foodManager.FOOD_TYPES.length);
            while (this.foodManager.FOOD_TYPES[chosenFoodTypeIndex].score > remainingValueToRelease && chosenFoodTypeIndex > 0) {
                chosenFoodTypeIndex--;
            }
            this.foodManager.addFood(this.foodManager.createFood(segment.x + offsetX, segment.y + offsetY, chosenFoodTypeIndex, this.players, this.SPAWN_BUFFER));
            remainingValueToRelease -= this.foodManager.FOOD_TYPES[chosenFoodTypeIndex].score;
        }

        if (!player.isBot) {
            const playerSocket = this.io.sockets.sockets.get(player.id);
            if (playerSocket) {
                playerSocket.emit('death', { score: Math.floor(player.maxLength) });
                playerSocket.clientState = 'DEAD';
            }
        }
        this.removePlayer(player);
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
        const botCount = process.env.BOT_COUNT || 10;
        for (let i = 0; i < botCount; i++) { this.addBot(); }
    }

    getPlayers() {
        return this.players;
    }

    getHumanPlayerCount() {
        return Object.values(this.players).filter(p => !p.isBot).length;
    }
}

module.exports = PlayerManager;
