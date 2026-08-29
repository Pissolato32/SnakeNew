import Validator from './Validator.js';
import { MAX_INPUTS_PER_SECOND } from '../shared/Constants.js';

class NetworkManager {
    constructor(io, WorldManager) {
        this.io = io;
        this.WorldManager = WorldManager;
        this.logger = WorldManager.logger;
        this.lastInputTime = new Map();
        this.lastStrategyUpdateTime = new Map();
    }

    setupSocketListeners() {
        this.io.on('connection', (socket) => {
            this.logger.info('A user connected:', socket.id);

            socket.on('join-game', (data) => {
                if (!Validator.validateAgentData(data)) {
                    socket.emit('error', { message: 'Invalid agent data' });
                    return;
                }
                this.WorldManager.findOrCreateRegion(socket, data);
            });

            socket.on('input', (data) => {
                const now = process.hrtime.bigint();
                const lastTime = this.lastInputTime.get(socket.id) || 0n;
                const timeElapsedMs = Number(now - lastTime) / 1_000_000;
                if (timeElapsedMs < (1000 / MAX_INPUTS_PER_SECOND)) return;
                this.lastInputTime.set(socket.id, now);

                if (!Validator.validateMovement(data)) {
                    socket.emit('error', { message: 'Invalid input data' });
                    return;
                }
                this.WorldManager.handleInput(socket, data);
            });

            socket.on('strategy-update', (data) => {
                const now = Date.now();
                const last = this.lastStrategyUpdateTime.get(socket.id) || 0;
                if (now - last < 250) return;
                if (!Validator.validateStrategy(data)) {
                    socket.emit('error', { message: 'Invalid strategy data' });
                    return;
                }
                this.lastStrategyUpdateTime.set(socket.id, now);
                this.WorldManager.handleStrategyUpdate(socket, data);
            });

            socket.on('disconnect', () => {
                this.logger.info('User disconnected:', socket.id);
                this.lastInputTime.delete(socket.id);
                this.lastStrategyUpdateTime.delete(socket.id);
                this.WorldManager.handleDisconnect(socket);
            });

            socket.on('ping', () => { socket.emit('pong'); });

            socket.on('pingUpdate', (ping) => {
                const agent = this.WorldManager.findAgentBySocketId(socket.id);
                if (agent) agent.ping = ping;
            });
        });
    }
}

export default NetworkManager;
