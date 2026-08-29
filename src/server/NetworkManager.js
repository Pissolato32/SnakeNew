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
                if (!Validator.validateAgentData(data)) return socket.emit('error', { message: 'Invalid agent data' });
                this.WorldManager.findOrCreateRegion(socket, data);
            });

            socket.on('life-list', (data = {}) => {
                if (!data.token || data.token.length < 8) return socket.emit('error', { message: 'Invalid account credential' });
                this.WorldManager.emitLifeList(socket, data.token);
            });

            socket.on('life-create', (data) => {
                if (!Validator.validateLifeCreate(data)) return socket.emit('life-create-failed', { error: 'Dados de vida inválidos.' });
                this.WorldManager.createLife(socket, data);
            });

            socket.on('life-select', (data) => {
                if (!Validator.validateLifeSelect(data)) return socket.emit('life-select-failed', { error: 'Dados de seleção inválidos.' });
                this.WorldManager.selectLife(socket, data);
            });

            socket.on('input', (data) => {
                const now = process.hrtime.bigint();
                const lastTime = this.lastInputTime.get(socket.id) || 0n;
                const timeElapsedMs = Number(now - lastTime) / 1_000_000;
                if (timeElapsedMs < (1000 / MAX_INPUTS_PER_SECOND)) return;
                this.lastInputTime.set(socket.id, now);
                if (!Validator.validateMovement(data)) return socket.emit('error', { message: 'Invalid input data' });
                this.WorldManager.handleInput(socket, data);
            });

            socket.on('strategy-update', (data) => {
                const now = Date.now();
                const last = this.lastStrategyUpdateTime.get(socket.id) || 0;
                if (now - last < 250) return;
                if (!Validator.validateStrategy(data)) return socket.emit('error', { message: 'Invalid strategy data' });
                this.lastStrategyUpdateTime.set(socket.id, now);
                this.WorldManager.handleStrategyUpdate(socket, data);
            });

            socket.on('disconnect', () => {
                this.lastInputTime.delete(socket.id);
                this.lastStrategyUpdateTime.delete(socket.id);
                this.WorldManager.handleDisconnect(socket);
            });

            socket.on('ping', () => socket.emit('pong'));
            socket.on('pingUpdate', (ping) => { const agent = this.WorldManager.findAgentBySocketId(socket.id); if (agent) agent.ping = ping; });
        });
    }
}

export default NetworkManager;
