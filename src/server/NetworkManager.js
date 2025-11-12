import Validator from './Validator.js';
import { MAX_INPUTS_PER_SECOND } from '../shared/Constants.js';

class NetworkManager {
    constructor(io, gameManager) {
        this.io = io;
        this.gameManager = gameManager;
        this.logger = gameManager.logger;
        this.lastInputTime = new Map(); // To store last input timestamp for each socket
    }

    setupSocketListeners() {
        this.io.on('connection', (socket) => {
            this.logger.info('A user connected:', socket.id);

            socket.on('join-game', (data) => {
                if (!Validator.validatePlayerData(data)) {
                    socket.emit('error', { message: 'Invalid player data' });
                    return;
                }
                // GameManager will find/create a room and add the player
                this.gameManager.findOrCreateRoom(socket, data);
            });

            socket.on('input', (data) => {
                const now = process.hrtime.bigint();
                const lastTime = this.lastInputTime.get(socket.id) || 0n;
                const timeElapsedMs = Number(now - lastTime) / 1_000_000; // Convert nanoseconds to milliseconds

                if (timeElapsedMs < (1000 / MAX_INPUTS_PER_SECOND)) {
                    // Input rate exceeded, ignore this input
                    return;
                }
                this.lastInputTime.set(socket.id, now);

                if (!Validator.validateMovement(data)) {
                    socket.emit('error', { message: 'Invalid input data' });
                    return;
                }
                // GameManager will find the player's room and forward the input
                this.gameManager.handleInput(socket, data);
            });

            socket.on('disconnect', () => {
                this.logger.info('User disconnected:', socket.id);
                this.lastInputTime.delete(socket.id); // Clean up
                // GameManager will find the player's room and remove them
                this.gameManager.handleDisconnect(socket);
            });

            socket.on('ping', () => { socket.emit('pong'); });

            socket.on('pingUpdate', (ping) => {
                const player = this.gameManager.findPlayerBySocketId(socket.id);
                if (player) {
                    player.ping = ping;
                }
            });
        });
    }
}

export default NetworkManager;
