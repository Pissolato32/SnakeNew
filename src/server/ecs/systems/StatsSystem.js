class StatsSystem {
    constructor() {
        // Estatísticas Globais do Servidor
        this.worldStats = {
            totalAgentsSpawned: 0,
            totalAgentsKilled: 0,
            totalFoodSpawned: 0,
            totalFoodEaten: 0,
            averageLifetimeSec: 0,
            lifetimeSumSec: 0
        };

        // Estatísticas Locais da Região
        this.regionStats = {
            foodDensity: 0,
            effectiveTps: 10,
            averageLatencyMs: 0,
            collisionsPerMinute: 0
        };

        // Estatísticas por Espécie (Linhagens genéticas)
        this.speciesStats = new Map();
    }

    /**
     * Registra o nascimento de um novo agente.
     */
    recordAgentSpawn(agent) {
        this.worldStats.totalAgentsSpawned++;
        
        // Atualiza estatísticas por espécie
        const species = agent.skin || 'default';
        if (!this.speciesStats.has(species)) {
            this.speciesStats.set(species, { spawned: 0, deaths: 0, kills: 0, foodEaten: 0 });
        }
        this.speciesStats.get(species).spawned++;
    }

    /**
     * Registra o falecimento/remoção de um agente.
     */
    recordAgentDeath(agent) {
        this.worldStats.totalAgentsKilled++;
        const lifetimeMs = Date.now() - (agent.stats?.bornAt || Date.now());
        const lifetimeSec = lifetimeMs / 1000;
        this.worldStats.lifetimeSumSec += lifetimeSec;
        this.worldStats.averageLifetimeSec = this.worldStats.lifetimeSumSec / this.worldStats.totalAgentsKilled;

        const species = agent.skin || 'default';
        if (this.speciesStats.has(species)) {
            const ss = this.speciesStats.get(species);
            ss.deaths++;
            ss.kills += (agent.stats?.kills || 0);
            ss.foodEaten += (agent.stats?.foodEaten || 0);
        }
    }

    /**
     * Registra o spawn de comida no mapa.
     */
    recordFoodSpawned(count = 1) {
        this.worldStats.totalFoodSpawned += count;
    }

    /**
     * Registra o consumo de comida por um agente.
     */
    recordFoodEaten() {
        this.worldStats.totalFoodEaten++;
    }

    /**
     * Atualiza as métricas regionais dinamicamente.
     * @param {Object} region - A região da simulação.
     */
    updateRegionStats(region) {
        const agents = Object.values(region.agentManager.getAgents());
        const foodCount = region.foodManager.getFood().length;
        
        // Densidade de comida por 1,000,000 pixels quadrados
        const WORLD_SIZE = 30000;
        const area = Math.PI * Math.pow(WORLD_SIZE / 2, 2);
        this.regionStats.foodDensity = foodCount / (area / 1_000_000);

        let latencySum = 0;
        let humanCount = 0;
        for (const agent of agents) {
            if (!agent.isBot && agent.ping !== undefined) {
                latencySum += agent.ping;
                humanCount++;
            }
        }
        this.regionStats.averageLatencyMs = humanCount > 0 ? latencySum / humanCount : 0;
        this.regionStats.effectiveTps = region.scheduler?.tasks.find(t => t.name === 'Physics')?.avgDurationMs ? 
            Math.round(1000 / Math.max(10, region.scheduler.tasks.find(t => t.name === 'Physics').avgDurationMs)) : 10;
    }
}

// Exporta um singleton global por padrão para o WorldManager / Region
export default StatsSystem;
