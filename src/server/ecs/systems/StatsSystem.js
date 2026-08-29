class StatsSystem {
    constructor() {
        this.worldStats = {
            totalAgentsSpawned: 0,
            totalAgentsKilled: 0,
            totalFoodSpawned: 0,
            totalFoodEaten: 0,
            averageLifetimeSec: 0,
            lifetimeSumSec: 0
        };

        this.regionStats = {
            foodDensity: 0,
            effectiveTps: 10,
            averageLatencyMs: 0,
            collisionsPerMinute: 0
        };

        this.speciesStats = new Map();
        this.familyRankings = new Map();
    }

    recordAgentSpawn(agent) {
        this.worldStats.totalAgentsSpawned++;
        const species = agent.skin || 'default';
        if (!this.speciesStats.has(species)) {
            this.speciesStats.set(species, { spawned: 0, deaths: 0, kills: 0, foodEaten: 0 });
        }
        this.speciesStats.get(species).spawned++;
    }

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

    recordFoodSpawned(count = 1) { this.worldStats.totalFoodSpawned += count; }
    recordFoodEaten() { this.worldStats.totalFoodEaten++; }

    updateRegionStats(region) {
        const agents = Object.values(region.agentManager.getAgents());
        const foodCount = region.foodManager.getFood().length;
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
        const physicsTask = region.scheduler?.tasks.find(t => t.name === 'Physics');
        this.regionStats.effectiveTps = physicsTask?.avgDurationMs
            ? Math.round(1000 / Math.max(10, physicsTask.avgDurationMs))
            : 10;

        this.updateRankings(agents);
    }

    updateRankings(agents) {
        const families = new Map();

        for (const agent of agents) {
            if (agent.isDead) continue;
            const lifetimeMinutes = Math.max(0, (Date.now() - (agent.stats?.bornAt || Date.now())) / 60000);
            const wormScore = Math.round(
                lifetimeMinutes * 2 +
                (agent.stats?.kills || 0) * 100 +
                (agent.stats?.foodEaten || 0) * 2 +
                (agent.maxLength || 0) * 5
            );

            agent.stats = agent.stats || {};
            agent.stats.rankingScore = wormScore;

            const familyId = agent.familyId || `legacy:${agent.id}`;
            if (!families.has(familyId)) families.set(familyId, []);
            families.get(familyId).push(wormScore);
        }

        this.familyRankings.clear();
        for (const [familyId, scores] of families.entries()) {
            const score = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
            this.familyRankings.set(familyId, score);
        }

        for (const agent of agents) {
            const familyId = agent.familyId || `legacy:${agent.id}`;
            if (agent.stats) agent.stats.familyRankingScore = this.familyRankings.get(familyId) || 0;
        }
    }
}

export default StatsSystem;
