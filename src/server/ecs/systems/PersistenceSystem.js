import JsonPersistenceProvider from '../providers/JsonPersistenceProvider.js';

class PersistenceSystem {
    constructor(logger, provider = null) {
        this.logger = logger;
        // Injeta o provider, ou usa o JSON como default fallback (MVP)
        this.provider = provider || new JsonPersistenceProvider(this.logger);

        this.lastSave = Date.now();
        this.saveInterval = 30000; // Salva a cada 30 segundos
    }

    update(agents) {
        if (Date.now() - this.lastSave > this.saveInterval) {
            this.saveState(agents);
            this.lastSave = Date.now();
        }
    }

    async saveState(agents) {
        const state = {
            timestamp: Date.now(),
            agents: []
        };

        for (const agentId in agents) {
            const agent = agents[agentId];
            state.agents.push({
                id: agent.id,
                nickname: agent.nickname,
                x: agent.x,
                y: agent.y,
                strategy: agent.strategy,
                needs: agent.needs,
                blackboard: agent.blackboard,
                stats: agent.stats
            });
        }

        try {
            await this.provider.saveState(state);
        } catch (err) {
            this.logger.error('PersistenceSystem failed to save state:', err);
        }
    }
}

export default PersistenceSystem;
