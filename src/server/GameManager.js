import config from '../../config/index.js';
import Logger from '../../public/shared/Logger.js';
import Room from './Room.js';
import NetworkManager from './NetworkManager.js';

class GameManager {
    constructor(io) {
        this.io = io;
        this.logger = new Logger(config.DEBUG_MODE ? 'debug' : 'info');
        this.rooms = new Map();
        this.networkManager = new NetworkManager(io, this); // Pass GameManager instance
        this.logger.info('GameManager initialized to manage rooms');
    }

    start() {
        this.networkManager.setupSocketListeners();
        this.logger.info('GameManager started and listening for connections.');
    }

    findOrCreateRoom(socket, playerData) {
        // Simple logic: for now, all players join a single room 'A'.
        const roomId = 'A';
        if (!this.rooms.has(roomId)) {
            this.logger.info(`Creating new room with id: ${roomId}`);
            const newRoom = new Room(roomId, this.io, this.logger);
            this.rooms.set(roomId, newRoom);
        }
        const room = this.rooms.get(roomId);
        room.addPlayer(socket, playerData);
        socket.join(roomId);
    }
    
    findPlayerBySocketId(socketId) {
        for (const room of this.rooms.values()) {
            const player = room.playerManager.getPlayers()[socketId];
            if (player) {
                return player;
            }
        }
        return null;
    }

    handleDisconnect(socket) {
        for (const room of this.rooms.values()) {
            // Check if the player exists in this room
            if (room.playerManager.getPlayers()[socket.id]) {
                room.removePlayer(socket.id);
                this.logger.info(`Player ${socket.id} disconnected from room ${room.id}`);
                // If room is empty, consider deleting it
                if (Object.keys(room.playerManager.getPlayers()).length === 0) {
                    this.logger.info(`Room ${room.id} is empty, deleting.`);
                    this.rooms.delete(room.id);
                }
                break;
            }
        }
    }
    
    handleInput(socket, data) {
        const player = this.findPlayerBySocketId(socket.id);
        if (player && typeof player.handleInput === 'function') {
            player.handleInput(data);
        }
    }

    tick() {
        for (const room of this.rooms.values()) {
            room.tick();
        }
    }

    sendSnapshots() {
        for (const room of this.rooms.values()) {
            const snapshot = room.getSnapshot();
            this.io.to(room.id).emit('snapshot', snapshot);
        }
    }
}

export default GameManager;