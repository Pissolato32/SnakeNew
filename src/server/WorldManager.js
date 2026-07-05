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
        this.regions = new Map();
        this.networkManager = new NetworkManager(io, this);
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
        region.addAgent(socket, strategistData);
        socket.join(regionId);
    }

    findAgentBySocketId(socketId) {
        for (const region of this.regions.values()) {
            const agent = region.agentManager.getAgents()[socketId];
            if (agent) {
                return agent;
            }
        }
        return null;
    }

    handleDisconnect(socket) {
        for (const region of this.regions.values()) {
            // Em ECS Persistent World, desconectar o socket não apaga o Agent.
            // O Agent continua existindo no mundo. Apenas desatrelamos o socket, ou setamos offline.
            // Mas para o MVP de refatoração, vamos apenas remover o socket dos observers.
            this.logger.info(`Strategist ${socket.id} disconnected from region ${region.id}`);

            // Opcional: Se quisermos matar o agente quando desconecta (temporário).
            // region.removeAgent(socket.id);
            // region.agentManager.setAgentOffline(socket.id);

            // Não deletamos mais a region, pois ela é persistente.
        }
    }

    handleInput(socket, data) {
        // Agora input não é movimento, é alteração de estratégia (Traits/Needs/Goals)
        const agent = this.findAgentBySocketId(socket.id);
        if (agent && typeof agent.handleStrategyInput === 'function') {
            agent.handleStrategyInput(data);
        }
    }

    tick() {
        for (const region of this.regions.values()) {
            region.tick();
        }
    }

    sendSnapshots() {
        for (const region of this.regions.values()) {
            const snapshot = region.getSnapshot();
            this.io.to(region.id).emit('snapshot', snapshot);
        }
    }
}

export default WorldManager;
