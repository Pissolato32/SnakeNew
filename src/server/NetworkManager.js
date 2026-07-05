import Validator from './Validator.js';
import { MAX_INPUTS_PER_SECOND } from '../shared/Constants.js';

class NetworkManager {
    constructor(io, WorldManager) {
        this.io = io;
        this.WorldManager = WorldManager;
        this.logger = WorldManager.logger;
        this.lastInputTime = new Map(); // To store last input timestamp for each socket
    }

    setupSocketListeners() {
        this.io.on('connection', (socket) => {
            this.logger.info('A user connected:', socket.id);

            socket.on('join-game', (data) => {
                if (!Validator.validateAgentData(data)) {
                    socket.emit('error', { message: 'Invalid agent data' });
                    return;
                }
                // WorldManager will find/create a Region and add the agent
                this.WorldManager.findOrCreateRegion(socket, data);
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
                // WorldManager will find the agent's Region and forward the input
                this.WorldManager.handleInput(socket, data);
            });

            socket.on('disconnect', () => {
                this.logger.info('User disconnected:', socket.id);
                this.lastInputTime.delete(socket.id); // Clean up
                // WorldManager will find the agent's Region and remove them
                this.WorldManager.handleDisconnect(socket);
            });

            socket.on('ping', () => { socket.emit('pong'); });

            socket.on('pingUpdate', (ping) => {
                const agent = this.WorldManager.findAgentBySocketId(socket.id);
                if (agent) {
                    agent.ping = ping;
                }
            });
        });
    }
}

export default NetworkManager;
