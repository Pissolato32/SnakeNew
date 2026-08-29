import config from '../../config/index.js';
import Logger from '../shared/Logger.js';
import Region from './Region.js';
import NetworkManager from './NetworkManager.js';
import Metrics from './Metrics.js';
import LifeSelectionService from './LifeSelectionService.js';
import AccountLifeService from './AccountLifeService.js';
import { WORLD_SIZE } from '../shared/Constants.js';

class WorldManager {
    constructor(io) {
        this.io = io;
        this.logger = new Logger(config.DEBUG_MODE ? 'debug' : 'info');
        this.metrics = new Metrics();
        this.socketToRegionMap = new Map();
        this.regions = new Map();
        this.accountLifeService = new AccountLifeService();
        this.networkManager = new NetworkManager(io, this);
        this.isSleeping = false;
        this.lastBackgroundTick = Date.now();
        this.logger.info('WorldManager initialized to manage regions');
    }

    start() {
        this.networkManager.setupSocketListeners();
        const regionId = 'A';
        if (!this.regions.has(regionId)) this.regions.set(regionId, new Region(regionId, this.io, this.logger));
        this.logger.info('WorldManager started and listening for connections.');
    }

    getRegion() { return this.regions.get('A'); }

    lifeListForAccount(region, token) {
        const account = this.accountLifeService.getAccount(token);
        if (!account) return [];
        return account.lifePersistentIds
            .map(id => Object.values(region.agentManager.getAgents()).find(a => a.persistentId === id && !a.isDead))
            .filter(Boolean)
            .map(a => ({ persistentId: a.persistentId, nickname: a.nickname, familyId: a.familyId, broodId: a.broodId, generation: a.generation, controller: a.controller, isOnline: Boolean(a.isOnline), isOffline: Boolean(a.isOffline) }));
    }

    emitLifeList(socket, token) {
        const region = this.getRegion();
        const account = this.accountLifeService.getAccount(token);
        socket.emit('life-list', {
            lives: account ? this.lifeListForAccount(region, token) : [],
            account: this.accountLifeService.serialize(account)
        });
    }

    findOrCreateRegion(socket, strategistData) {
        const region = this.getRegion();
        if (!region) return;
        this.socketToRegionMap.set(socket.id, 'A');
        const token = strategistData.token;

        if (strategistData.listLives) return this.emitLifeList(socket, token);

        if (strategistData.persistentId) {
            const selected = LifeSelectionService.findOwnedLife(region.agentManager.getAgents(), strategistData.persistentId, token);
            if (!selected) return this.failLogin(socket, 'Vida não encontrada ou credencial inválida.');
            if (selected.isOnline && selected.socketId) return this.failLogin(socket, 'Esta vida já está sob controle de outra sessão.');
            this.assumeLife(socket, region, selected, token);
            return;
        }

        region.addAgent(socket, strategistData);
        const agent = Object.values(region.agentManager.getAgents()).find(a => a.id === socket.id);
        if (agent && !agent.isDead && !agent.isBot) {
            agent.socketId = socket.id; agent.isOnline = true; agent.isOffline = false; agent.controller = 'HUMAN';
            if (token) this.accountLifeService.registerLife(token, agent.persistentId, agent.familyId);
        }
        socket.join('A');
    }

    failLogin(socket, error) {
        socket.emit('login-failed', { error });
        this.socketToRegionMap.delete(socket.id);
    }

    assumeLife(socket, region, selected, token) {
        const oldId = selected.id;
        delete region.agentManager.agents[oldId];
        region.agentManager.agentSpatialHashing.update(selected);
        selected.id = socket.id; selected.socketId = socket.id; selected.isOnline = true; selected.isOffline = false; selected.controller = 'HUMAN'; selected.offlineSince = null;
        region.agentManager.agents[socket.id] = selected;
        if (token) this.accountLifeService.registerLife(token, selected.persistentId, selected.familyId);
        socket.join('A');
        socket.emit('game-setup', { worldSize: WORLD_SIZE, token: selected.token, life: { persistentId: selected.persistentId, nickname: selected.nickname, familyId: selected.familyId, broodId: selected.broodId, generation: selected.generation }, lives: this.lifeListForAccount(region, token) });
    }

    createLife(socket, data) {
        const region = this.getRegion();
        const token = data?.token;
        if (!region || !token) return socket.emit('life-create-failed', { error: 'Credencial obrigatória.' });
        const account = this.accountLifeService.getOrCreateAccount(token);
        if (!this.accountLifeService.canCreateLife(token)) return socket.emit('life-create-failed', { error: 'Limite de vidas atingido para este plano.' });
        const agent = region.agentManager.createAgent(`life_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, data.nickname, false, data.skin, data.color, { familyId: account.familyId });
        agent.token = token; agent.isOnline = false; agent.isOffline = true; agent.controller = 'AI'; agent.socketId = null; agent.offlineSince = Date.now();
        this.accountLifeService.registerLife(token, agent.persistentId, account.familyId);
        socket.emit('life-created', { life: { persistentId: agent.persistentId, nickname: agent.nickname, familyId: agent.familyId, broodId: agent.broodId, generation: agent.generation }, account: this.accountLifeService.serialize(account) });
    }

    selectLife(socket, data) {
        const token = data?.token;
        const region = this.getRegion();
        if (!region || !token || !data.persistentId) return socket.emit('life-select-failed', { error: 'Credencial e persistentId são obrigatórios.' });
        try { this.accountLifeService.selectLife(token, data.persistentId); } catch (err) { return socket.emit('life-select-failed', { error: err.message }); }
        const selected = LifeSelectionService.findOwnedLife(region.agentManager.getAgents(), data.persistentId, token);
        if (!selected || (selected.isOnline && selected.socketId)) return socket.emit('life-select-failed', { error: 'Vida indisponível.' });
        this.assumeLife(socket, region, selected, token);
    }

    findAgentBySocketId(socketId) {
        const regionId = this.socketToRegionMap.get(socketId); if (!regionId) return null;
        const region = this.regions.get(regionId); if (!region) return null;
        return Object.values(region.agentManager.getAgents()).find(agent => agent.socketId === socketId || agent.id === socketId) || null;
    }

    handleDisconnect(socket) {
        const regionId = this.socketToRegionMap.get(socket.id); if (!regionId) return;
        const region = this.regions.get(regionId); if (!region) return;
        const agent = this.findAgentBySocketId(socket.id);
        if (agent && !agent.isBot && !agent.isDead) {
            agent.isOnline = false; agent.controller = 'AI'; agent.socketId = null; agent.isOffline = true; agent.offlineSince = Date.now();
            if (region.isReady) region.persistenceSystem.saveState(region.agentManager.getAgents());
        }
        this.socketToRegionMap.delete(socket.id);
    }

    handleInput(socket, data) {
        const agent = this.findAgentBySocketId(socket.id); if (!agent || agent.controller !== 'HUMAN' || agent.isDead) return;
        if (Number.isFinite(data.angle)) agent.targetAngle = data.angle;
        if (typeof data.isBoosting === 'boolean') agent.isBoosting = data.isBoosting;
        if (Number.isInteger(data.seq) && data.seq > agent.lastProcessedInputSeq) agent.lastProcessedInputSeq = data.seq;
    }

    handleStrategyUpdate(socket, data) {
        const agent = this.findAgentBySocketId(socket.id); if (!agent || agent.controller !== 'HUMAN' || agent.isDead) return;
        agent.handleStrategyInput({ type: 'STRATEGY_UPDATE', focus: data.focus, strategy: data.strategy }); agent.strategyUpdatedAt = Date.now();
    }

    tick() {
        const hasActiveConnections = this.io.sockets.sockets.size > 0;
        if (!hasActiveConnections) {
            if (!this.isSleeping) { this.isSleeping = true; for (const region of this.regions.values()) if (region.isReady) region.persistenceSystem.saveState(region.agentManager.getAgents()); }
            const now = Date.now();
            if (!this.lastBackgroundTick || now - this.lastBackgroundTick >= 5000) {
                const dt = Math.max(0, (now - this.lastBackgroundTick) / 1000); this.lastBackgroundTick = now;
                for (const region of this.regions.values()) if (region.isReady) region.simulateOfflineProgression(dt);
            }
            return;
        }
        this.isSleeping = false; this.lastBackgroundTick = Date.now();
        for (const region of this.regions.values()) region.tick();
    }

    sendSnapshots() { if (this.isSleeping || this.io.sockets.sockets.size === 0) return; for (const region of this.regions.values()) if (region.isReady) region.sendSnapshots(); }
}

export default WorldManager;
