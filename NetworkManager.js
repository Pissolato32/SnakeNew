const { worldSize } = require('./Constants');

class NetworkManager {
    constructor(io, playerManager, foodManager, powerupManager) {
        this.io = io;
        this.playerManager = playerManager;
        this.foodManager = foodManager;
        this.powerupManager = powerupManager;
    }

    setupSocketListeners() {
        this.io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);
            // Initialize lastSentState for this socket. It will be populated with
            // the actual state on the first sendGameUpdates call.
            socket.lastSentState = {
                players: {},
                food: new Map(),
                powerups: new Map()
            };
            socket.clientState = 'MENU';

            socket.on('join-game', (nickname) => {
                this.playerManager.players[socket.id] = this.playerManager.createPlayer(socket.id, nickname, false);
                socket.emit('game-setup', { worldSize: worldSize });
                socket.clientState = 'ACTIVE';
            });

            socket.on('player-update', (data) => {
                const player = this.playerManager.players[socket.id];
                if (!player || player.isBot) return;

                const now = Date.now();
                const minUpdateInterval = 1000 / 30; // 30 FPS
                if (socket.lastPlayerUpdate && (now - socket.lastPlayerUpdate < minUpdateInterval)) {
                    return;
                }
                socket.lastPlayerUpdate = now;

                if (typeof data.angle === 'number' && !isNaN(data.angle)) {
                    player.targetAngle = data.angle;
                }
                if (typeof data.isBoosting === 'boolean') {
                    player.isBoosting = data.isBoosting;
                }
            });

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
                const player = this.playerManager.players[socket.id];
                if (player) {
                    this.playerManager.removePlayer(player);
                }
            });

            socket.on('ping', () => { socket.emit('pong'); });

            socket.on('pingUpdate', (ping) => {
                const player = this.playerManager.players[socket.id];
                if (player) {
                    player.ping = ping;
                }
            });
        });
    }

    /**
     * Calculates the delta and updates the lastState in-place.
     * This is more efficient than deep copying the entire state every time.
     * @param {object} currentState - The current state of the game.
     * @param {object} lastState - The last state sent to a specific client. This object will be mutated.
     * @returns {object} The delta object to be sent to the client.
     */
    getDeltaAndUpdateLastState(currentState, lastState) {
        const delta = {
            players: { added: {}, updated: {}, removed: [] },
            food: { added: [], updated: [], removed: [] },
            powerups: { added: [], updated: [], removed: [] }
        };

        // --- Players ---
        const currentPlayerIds = Object.keys(currentState.players);
        const lastPlayerIds = Object.keys(lastState.players);

        for (const id of currentPlayerIds) {
            const currentPlayer = currentState.players[id];
            const lastPlayer = lastState.players[id];

            if (!lastPlayer) {
                // Player added: send a minimal object, exclude the body
                const { body, ...minimalPlayer } = currentPlayer;
                delta.players.added[id] = minimalPlayer;
                // Add the full player object to lastState for future comparisons
                lastState.players[id] = { ...currentPlayer };
            } else {
                // Player exists, check for updates
                const playerDelta = {};
                let changed = false;
                // Only check critical, frequently changing properties
                const propsToCheck = ['x', 'y', 'angle', 'maxLength', 'radius', 'isBoosting', 'ping']; // Added ping
                for (const key of propsToCheck) {
                    // Round numeric values to reduce small floating point changes
                    const currentValue = typeof currentPlayer[key] === 'number' ? Math.round(currentPlayer[key] * 100) / 100 : currentPlayer[key];
                    const lastValue = typeof lastPlayer[key] === 'number' ? Math.round(lastPlayer[key] * 100) / 100 : lastPlayer[key];

                    if (currentValue !== lastValue) {
                        playerDelta[key] = currentValue;
                        lastPlayer[key] = currentValue; // Update last state
                        changed = true;
                    }
                }
                if (changed) {
                    delta.players.updated[id] = playerDelta;
                }
            }
        }

        for (const id of lastPlayerIds) {
            if (!currentState.players[id]) {
                delta.players.removed.push(id);
                delete lastState.players[id];
            }
        }

        // --- Food & Powerups (Generic Handler) ---
        const handleItems = (type, currentItems, lastItemsMap) => {
            const currentItemsMap = new Map(currentItems.map(item => [item.id, item]));
            
            for (const [id, item] of currentItemsMap) {
                if (!lastItemsMap.has(id)) {
                    delta[type].added.push(item);
                    lastItemsMap.set(id, { ...item });
                }
                // No updates for food/powerups for now to save bandwidth, only add/remove
            }

            for (const id of lastItemsMap.keys()) {
                if (!currentItemsMap.has(id)) {
                    delta[type].removed.push(id);
                    lastItemsMap.delete(id);
                }
            }
        };

        handleItems('food', currentState.food, lastState.food);
        handleItems('powerups', currentState.powerups, lastState.powerups);

        return delta;
    }

    sendGameUpdates() {
        const currentState = {
            players: this.playerManager.getPlayers(),
            food: this.foodManager.getFood(),
            powerups: this.powerupManager.getPowerups()
        };

        const now = Date.now();
        this.io.sockets.sockets.forEach(socket => {
            const clientState = socket.clientState || 'MENU';
            if (clientState === 'MENU') return;

            let shouldSendUpdate = false;
            if (clientState === 'ACTIVE') {
                shouldSendUpdate = true;
            } else if (clientState === 'DEAD') {
                const deadUpdateInterval = 1000 / 10; // 10 FPS
                if (!socket.lastDeadUpdateTime || (now - socket.lastDeadUpdateTime) >= deadUpdateInterval) {
                    shouldSendUpdate = true;
                    socket.lastDeadUpdateTime = now;
                }
            }

            if (shouldSendUpdate) {
                const delta = this.getDeltaAndUpdateLastState(currentState, socket.lastSentState);
                socket.emit('game-state', delta);
                // No deep copy needed, lastSentState was mutated by the getDelta function
            }
        });
    }
}

module.exports = NetworkManager;