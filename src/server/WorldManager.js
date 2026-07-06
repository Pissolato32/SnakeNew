import config from '../../config/index.js';
import Logger from '../shared/Logger.js';
import Region from './Region.js';
import NetworkManager from './NetworkManager.js';
import Metrics from './Metrics.js';

class WorldManager {
    constructor(io) {
        this.io = io;
        this.logger = new Logger(config.DEBUG_MODE ? 'debug' : 'info');
        this.metrics = new Metrics();
        // Mapeamentos otimizados para acesso rápido: socketId -> Region ID
        this.socketToRegionMap = new Map();
        this.regions = new Map();
        this.networkManager = new NetworkManager(io, this);
        this.isSleeping = false;
        this.lastBackgroundTick = Date.now();
        this.logger.info('WorldManager initialized to manage regions');
    }

    start() {
        this.networkManager.setupSocketListeners();

        // Pre-create region 'A' on server startup so the world stays active 24/7
        const regionId = 'A';
        if (!this.regions.has(regionId)) {
            this.logger.info(`Pre-creating persistent region: ${regionId}`);
            const newRegion = new Region(regionId, this.io, this.logger);
            this.regions.set(regionId, newRegion);
        }

        this.logger.info('WorldManager started and listening for connections.');
    }

    findOrCreateRegion(socket, strategistData) {
        const regionId = 'A';
        const region = this.regions.get(regionId);
        if (!region) return; // Segurança: Garantir que a região exista

        // Atualizar mapeamento global e adicionar o socket à região
        this.socketToRegionMap.set(socket.id, regionId);
        region.addAgent(socket, strategistData);
        socket.join(regionId);
    }

    findAgentBySocketId(socketId) {
        const regionId = this.socketToRegionMap.get(socketId);
        if (!regionId) return null;

        const region = this.regions.get(regionId);
        if (region) {
            return region.agentManager.getAgents()[socketId];
        }
        return null;
    }

    handleDisconnect(socket) {
        const regionId = this.socketToRegionMap.get(socket.id);
        if (!regionId) return;

        const region = this.regions.get(regionId);
        if (!region) return;

        // Obter agente da região e remover do mapa global/regional
        const agent = region.agentManager.getAgents()[socket.id];

        if (agent && !agent.isBot) {
            agent.isOffline = true;
            agent.offlineSince = Date.now();
            this.logger.info(`Strategist '${agent.nickname}' (${socket.id}) marked OFFLINE in region ${region.id}. Snake continues living under AI control.`);

            // Persistir imediatamente e remover o mapeamento do socket desconectado
            if (region.isReady) {
                region.persistenceSystem.saveState(region.agentManager.getAgents());
            }
        }
        this.socketToRegionMap.delete(socket.id);
    }

    handleInput(socket, data) {
        // Agora a busca é O(1) devido ao mapeamento otimizado
        const agent = this.findAgentBySocketId(socket.id);
        if (agent && typeof agent.handleStrategyInput === 'function') {
            agent.handleStrategyInput(data);
        }
    }

    tick() {
        // Verifica o estado de conexão ativamente para decidir se é necessário hibernar/despertar
        const activeSockets = this.io.sockets.sockets;
        const hasActiveConnections = activeSockets.size > 0;

        if (!hasActiveConnections) {
            if (!this.isSleeping) {
                this.isSleeping = true;
                this.logger.info('No active connections. Putting world simulation to sleep...');
                for (const region of this.regions.values()) {
                    if (region.isReady) {
                        region.persistenceSystem.saveState(region.agentManager.getAgents());
                    }
                }
            }

            // Simular progressão estratégica offline a cada 5 segundos
            const now = Date.now();
            if (!this.lastBackgroundTick || (now - this.lastBackgroundTick >= 5000)) {
                const dt = Math.max(0, (now - this.lastBackgroundTick) / 1000); // Garante que dt seja positivo
                this.lastBackgroundTick = now;
                for (const region of this.regions.values()) {
                    if (region.isReady) {
                        region.simulateOfflineProgression(dt);
                    }
                }
            }
            return;
        }

        // Se estava dormindo e agora há conexões, acorde o mundo
        if (this.isSleeping && hasActiveConnections) {
            this.isSleeping = false;
            this.logger.info('Active connection detected. Waking up world simulation!');
        }

        this.lastBackgroundTick = Date.now();

        // Tick principal para todas as regiões ativas
        for (const region of this.regions.values()) {
            region.tick();
        }
    }

    sendSnapshots() {
        // Apenas envia snapshots se não estiver dormindo e houver sockets ativos
        if (this.isSleeping || this.io.sockets.sockets.size === 0) return;
        for (const region of this.regions.values()) {
            const snapshot = region.getSnapshot();
            this.io.to(region.id).emit('snapshot', snapshot);
        }
    }
}

export default WorldManager;