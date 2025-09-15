import { worldSize, PLAYER_UPDATE_RATE_LIMIT_FPS, HIGH_PING_THRESHOLD, HIGH_PING_UPDATE_RATE_FPS, LOW_PING_UPDATE_RATE_FPS, DEAD_PLAYER_UPDATE_RATE_FPS } from './Constants.js';
import Validator from './server/Validator.js';

class NetworkManager {
    constructor(io, playerManager, foodManager, powerupManager, logger) {
        this.io = io;
        this.playerManager = playerManager;
        this.foodManager = foodManager;
        this.powerupManager = powerupManager;
        this.logger = logger;
        this.lastStates = new Map(); // Use Map for better performance
        this.updateQueues = new Map(); // Batch updates per client
    }

    setupSocketListeners() {
        this.io.on('connection', (socket) => {
            this.logger.info('A user connected:', socket.id);
            // Initialize lastSentState for this socket. It will be populated with
            // the actual state on the first sendGameUpdates call.
            socket.lastSentState = {
                players: new Map(), // Use Map for players in lastState
                food: new Map(),
                powerups: new Map()
            };
            socket.clientState = 'MENU';

            socket.on('join-game', (data) => {
                const { nickname, skin, color } = data;
                if (!Validator.validateNickname(nickname)) {
                    socket.emit('error', { message: 'Invalid nickname' });
                    return;
                }
                this.playerManager.players[socket.id] = this.playerManager.createPlayer(socket.id, nickname, false, skin, color);
                socket.emit('game-setup', { worldSize: worldSize });
                socket.clientState = 'ACTIVE';
            });

            socket.on('player-update', (data) => {
                const player = this.playerManager.players[socket.id];
                if (!player || player.isBot) return;

                const now = Date.now();
                const minUpdateInterval = 1000 / PLAYER_UPDATE_RATE_LIMIT_FPS;
                if (socket.lastPlayerUpdate && (now - socket.lastPlayerUpdate < minUpdateInterval)) {
                    return;
                }
                socket.lastPlayerUpdate = now;

                if (Validator.validateMovement(data)) {
                    player.targetAngle = data.angle;
                    player.isBoosting = data.isBoosting;
                }
            });

            socket.on('disconnect', () => {
                this.logger.info('User disconnected:', socket.id);
                const player = this.playerManager.players[socket.id];
                if (player) {
                    this.playerManager.removePlayer(player);
                }
                this.lastStates.delete(socket.id); // Clean up lastState for disconnected client
                this.updateQueues.delete(socket.id); // Clean up updateQueue
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
     * Calculates the delta between the current game state and the last state sent to a client.
     * This is a core optimization to reduce network bandwidth.
     * The method compares the current state with the `lastState` object and builds a `delta` object
     * containing only what has changed.
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
        
        if (!lastState || Object.keys(lastState.players).length === 0) {
            // If there is no last state, send the full current state.
            for (const id in currentState.players) {
                const { body, ...minimalPlayer } = currentState.players[id];
                delta.players.added[id] = minimalPlayer;
                lastState.players[id] = { ...currentState.players[id] };
            }
            currentState.food.forEach(f => {
                delta.food.added.push(f);
                lastState.food.set(f.id, { ...f });
            });
            currentState.powerups.forEach(p => {
                delta.powerups.added.push(p);
                lastState.powerups.set(p.id, { ...p });
            });
            return delta;
        }
        
        this.processPlayerDeltas(currentState.players, lastState.players, delta.players);
        this.processItemDeltas('food', currentState.food, lastState.food, delta.food);
        this.processItemDeltas('powerups', currentState.powerups, lastState.powerups, delta.powerups);
        
        return delta;
    }
    
    _findNewPlayers(currentPlayers, lastPlayers, deltaPlayers) {
        for (const id in currentPlayers) {
            if (!lastPlayers[id]) {
                const { body, ...minimalPlayer } = currentPlayers[id];
                deltaPlayers.added[id] = minimalPlayer;
                lastPlayers[id] = { ...currentPlayers[id] };
            }
        }
    }

    _findUpdatedPlayers(currentPlayers, lastPlayers, deltaPlayers) {
        for (const id in currentPlayers) {
            if (lastPlayers[id]) {
                const playerDelta = {};
                let changed = false;
                const propsToCheck = ['x', 'y', 'angle', 'maxLength', 'radius', 'isBoosting', 'ping', 'baseSpeed', 'speed', 'color', 'rgb'];
                for (const key of propsToCheck) {
                    let currentValue = currentPlayers[id][key];
                    let lastValue = lastPlayers[id][key];

                    if (key === 'x' || key === 'y' || key === 'angle') {
                        currentValue = typeof currentValue === 'number' ? Math.round(currentValue * 100) / 100 : currentValue;
                        lastValue = typeof lastValue === 'number' ? Math.round(lastValue * 100) / 100 : lastValue;
                    }

                    if (currentValue !== lastValue) {
                        playerDelta[key] = currentPlayers[id][key];
                        lastPlayers[id][key] = currentPlayers[id][key];
                        changed = true;
                    }
                }
                if (changed) {
                    deltaPlayers.updated[id] = playerDelta;
                }
            }
        }
    }

    _findRemovedPlayers(currentPlayers, lastPlayers, deltaPlayers) {
        for (const id in lastPlayers) {
            if (!currentPlayers[id]) {
                deltaPlayers.removed.push(id);
                delete lastPlayers[id];
            }
        }
    }

    processPlayerDeltas(currentPlayers, lastPlayers, deltaPlayers) {
        this._findNewPlayers(currentPlayers, lastPlayers, deltaPlayers);
        this._findUpdatedPlayers(currentPlayers, lastPlayers, deltaPlayers);
        this._findRemovedPlayers(currentPlayers, lastPlayers, deltaPlayers);
    }
    
    processItemDeltas(type, currentItems, lastItemsMap, deltaItems) {
        const currentItemsMap = new Map(currentItems.map(item => [item.id, item]));
        
        for (const [id, currentItem] of currentItemsMap) {
            const lastItem = lastItemsMap.get(id);
            
            if (!lastItem) {
                deltaItems.added.push(currentItem);
                lastItemsMap.set(id, { ...currentItem });
            } else {
                const itemDelta = {};
                let changed = false;
                if (currentItem.x !== lastItem.x) { itemDelta.x = currentItem.x; changed = true; }
                if (currentItem.y !== lastItem.y) { itemDelta.y = currentItem.y; changed = true; }

                if (changed) {
                    itemDelta.id = currentItem.id;
                    deltaItems.updated.push(itemDelta);
                    lastItemsMap.set(id, { ...currentItem });
                }
            }
        }
        
        for (const id of lastItemsMap.keys()) {
            if (!currentItemsMap.has(id)) {
                deltaItems.removed.push(id);
                lastItemsMap.delete(id);
            }
        }
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
            let updateRate = LOW_PING_UPDATE_RATE_FPS;
            
            if (clientState === 'ACTIVE') {
                updateRate = socket.ping > HIGH_PING_THRESHOLD ? HIGH_PING_UPDATE_RATE_FPS : LOW_PING_UPDATE_RATE_FPS;
                shouldSendUpdate = true;
            } else if (clientState === 'DEAD') {
                updateRate = DEAD_PLAYER_UPDATE_RATE_FPS;
                if (!socket.lastDeadUpdateTime || (now - socket.lastDeadUpdateTime) >= (1000 / updateRate)) {
                    shouldSendUpdate = true;
                    socket.lastDeadUpdateTime = now;
                }
            }

            if (shouldSendUpdate) {
                const lastSentState = this.lastStates.get(socket.id) || socket.lastSentState;
                const delta = this.getDeltaAndUpdateLastState(currentState, lastSentState);
                
                if (Object.keys(delta.players.added).length > 0 || 
                    Object.keys(delta.players.updated).length > 0 || 
                    delta.players.removed.length > 0 ||
                    delta.food.added.length > 0 ||
                    delta.food.updated.length > 0 ||
                    delta.food.removed.length > 0 ||
                    delta.powerups.added.length > 0 ||
                    delta.powerups.updated.length > 0 ||
                    delta.powerups.removed.length > 0) {
                    
                    socket.emit('game-state', delta);
                    this.lastStates.set(socket.id, lastSentState);
                }
            }
        });
    }
}

export default NetworkManager;
