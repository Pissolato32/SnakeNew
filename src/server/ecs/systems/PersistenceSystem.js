import SQLitePersistenceProvider from '../providers/SQLitePersistenceProvider.js';

class PersistenceSystem {
    constructor(logger, provider = null) {
        this.logger = logger;
        this.provider = provider || new SQLitePersistenceProvider(this.logger);
        this.lastSave = Date.now();
        this.saveInterval = 30000;
    }

    update(agents) {
        if (Date.now() - this.lastSave > this.saveInterval) {
            this.saveState(agents);
            this.lastSave = Date.now();
        }
    }

    async saveState(agents) {
        const state = { timestamp: Date.now(), agents: [] };

        for (const agentId in agents) {
            const agent = agents[agentId];
            state.agents.push({
                id: agent.id,
                persistentId: agent.persistentId,
                nickname: agent.nickname,
                isBot: agent.isBot,
                token: agent.token,
                isOffline: agent.isOffline || false,
                isOnline: agent.isOnline || false,
                controller: agent.controller || (agent.isBot ? 'AI' : 'HUMAN'),
                offlineSince: agent.offlineSince || null,
                familyId: agent.familyId,
                broodId: agent.broodId,
                generation: agent.generation,
                genes: agent.genes || [],
                traits: agent.traits || [],
                skills: agent.skills || { individual: { points: 0, unlocked: [] }, family: { points: 0, unlocked: [] } },
                focus: agent.focus || null,
                x: agent.x,
                y: agent.y,
                angle: agent.angle,
                color: agent.color,
                skin: agent.skin,
                maxLength: agent.maxLength,
                radius: agent.radius,
                strategy: agent.strategy,
                needs: agent.needs,
                blackboard: {
                    currentGoal: agent.blackboard?.currentGoal || 'EXPLORE'
                },
                stats: agent.stats
            });
        }

        try {
            await this.provider.saveState(state);
        } catch (err) {
            this.logger.error('PersistenceSystem failed to save state:', err);
        }
    }

    async loadState() {
        try {
            return await this.provider.loadState();
        } catch (err) {
            this.logger.error('PersistenceSystem failed to load state:', err);
            return null;
        }
    }
}

export default PersistenceSystem;
