import config from '../../config/index.js';
import Logger from '../shared/Logger.js';
import Region from './Region.js';
import NetworkManager from './NetworkManager.js';
import Metrics from './Metrics.js';
import LifeSelectionService from './LifeSelectionService.js';
import { WORLD_SIZE } from '../shared/Constants.js';

class WorldManager {
    constructor(io) {
        this.io = io;
        this.logger = new Logger(config.DEBUG_MODE ? 'debug' : 'info');
        this.metrics = new Metrics();
        this.socketToRegionMap = new Map();
        this.regions = new Map();
        this.networkManager = new NetworkManager(io, this);
        this.isSleeping = false;
        this.lastBackgroundTick = Date.now();
        this.logger.info('WorldManager initialized to manage regions');
    }

    start() {
        this.networkManager.setupSocketListeners();
        const regionId = 'A';
        if (!this.regions.has(regionId)) {
            this.logger.info(`Pre-creating persistent region: ${regionId}`);
            this.regions.set(regionId, new Region(regionId, this.io, this.logger));
        }
        this.logger.info('WorldManager started and listening for connections.');
    }

    findOrCreateRegion(socket, strategistData) {
        const regionId = 'A';
        const region = this.regions.get(regionId);
        if (!region) return;

        this.socketToRegionMap.set(socket.id, regionId);

        if (strategistData.listLives) {
            const lives = LifeSelectionService.listLives(region.agentManager.getAgents(), strategistData);
            socket.emit('life-list', { lives });
            return;
        }

        if (strategistData.persistentId) {
            const selected = LifeSelectionService.findOwnedLife(
                region.agentManager.getAgents(),
                strategistData.persistentId,
                strategistData.token
            );

            if (!selected) {
                socket.emit('login-failed', { error: 'Vida não encontrada ou credencial inválida.' });
                this.socketToRegionMap.delete(socket.id);
                return;
            }

            if (selected.isOnline && selected.socketId) {
                socket.emit('login-failed', { error: 'Esta vida já está sob controle de outra sessão.' });
                this.socketToRegionMap.delete(socket.id);
                return;
            }

            const oldId = selected.id;
            delete region.agentManager.agents[oldId];
            region.agentManager.agentSpatialHashing.update(selected);
            selected.id = socket.id;
            selected.socketId = socket.id;
            selected.isOnline = true;
            selected.isOffline = false;
            selected.controller = 'HUMAN';
            selected.offlineSince = null;
            region.agentManager.agents[socket.id] = selected;

            socket.join(regionId);
            socket.emit('game-setup', {
                worldSize: WORLD_SIZE,
                token: selected.token,
                life: {
                    persistentId: selected.persistentId,
                    nickname: selected.nickname,
                    familyId: selected.familyId,
                    broodId: selected.broodId,
                    generation: selected.generation
                },
                lives: LifeSelectionService.listLives(region.agentManager.getAgents(), strategistData)
            });
            this.logger.info(`Strategist reassumed life '${selected.nickname}' (${selected.persistentId}).`);
            return;
        }

        region.addAgent(socket, strategistData);

        const agent = Object.values(region.agentManager.getAgents()).find(a => a.id === socket.id);
        if (agent && !agent.isDead && !agent.isBot) {
            agent.socketId = socket.id;
            agent.isOnline = true;
            agent.isOffline = false;
            agent.controller = 'HUMAN';
        }
        socket.join(regionId);
    }

    findAgentBySocketId(socketId) {
        const regionId = this.socketToRegionMap.get(socketId);
        if (!regionId) return null;
        const region = this.regions.get(regionId);
        if (!region) return null;
        return Object.values(region.agentManager.getAgents()).find(agent => agent.socketId === socketId || agent.id === socketId) || null;
    }

    handleDisconnect(socket) {
        const regionId = this.socketToRegionMap.get(socket.id);
        if (!regionId) return;
        const region = this.regions.get(regionId);
        if (!region) return;

        const agent = this.findAgentBySocketId(socket.id);
        if (agent && !agent.isBot && !agent.isDead) {
            agent.isOnline = false;
            agent.controller = 'AI';
            agent.socketId = null;
            agent.isOffline = true;
            agent.offlineSince = Date.now();
            this.logger.info(`Strategist '${agent.nickname}' (${agent.persistentId || agent.id}) disconnected. AI assumes control; life remains active.`);
            if (region.isReady) region.persistenceSystem.saveState(region.agentManager.getAgents());
        }
        this.socketToRegionMap.delete(socket.id);
    }

    handleInput(socket, data) {
        const agent = this.findAgentBySocketId(socket.id);
        if (!agent || agent.controller !== 'HUMAN' || agent.isDead) return;

        if (Number.isFinite(data.angle)) agent.targetAngle = data.angle;
        if (typeof data.isBoosting === 'boolean') agent.isBoosting = data.isBoosting;
        if (Number.isInteger(data.seq) && data.seq > agent.lastProcessedInputSeq) {
            agent.lastProcessedInputSeq = data.seq;
        }
    }

    handleStrategyUpdate(socket, data) {
        const agent = this.findAgentBySocketId(socket.id);
        if (!agent || agent.controller !== 'HUMAN' || agent.isDead) return;
        agent.handleStrategyInput({ type: 'STRATEGY_UPDATE', focus: data.focus, strategy: data.strategy });
        agent.strategyUpdatedAt = Date.now();
        if (agent.isOffline) {
            agent.isOffline = false;
            agent.offlineSince = null;
        }
        this.logger.debug?.(`Strategy updated for ${agent.nickname} (${agent.persistentId || agent.id}).`);
    }

    tick() {
        const activeSockets = this.io.sockets.sockets;
        const hasActiveConnections = activeSockets.size > 0;

        if (!hasActiveConnections) {
            if (!this.isSleeping) {
                this.isSleeping = true;
                this.logger.info('No active connections. Switching world to background simulation...');
                for (const region of this.regions.values()) if (region.isReady) region.persistenceSystem.saveState(region.agentManager.getAgents());
            }

            const now = Date.now();
            if (!this.lastBackgroundTick || now - this.lastBackgroundTick >= 5000) {
                const dt = Math.max(0, (now - this.lastBackgroundTick) / 1000);
                this.lastBackgroundTick = now;
                for (const region of this.regions.values()) if (region.isReady) region.simulateOfflineProgression(dt);
            }
            return;
        }

        if (this.isSleeping) {
            this.isSleeping = false;
            this.logger.info('Active connection detected. Waking up world simulation.');
        }

        this.lastBackgroundTick = Date.now();
        for (const region of this.regions.values()) region.tick();
    }

    sendSnapshots() {
        if (this.isSleeping || this.io.sockets.sockets.size === 0) return;
        for (const region of this.regions.values()) if (region.isReady) region.sendSnapshots();
    }
}

export default WorldManager;
