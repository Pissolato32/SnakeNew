class InterestManager {
    /**
     * Filtra e retorna apenas as entidades que estão dentro do raio de interesse (visão) de um agente jogador.
     * @param {Object} playerAgent - O agente estrategista que receberá o snapshot.
     * @param {Object} worldState - Objeto contendo os managers de comida, powerups e agentes.
     * @returns {Object} Coleções filtradas de comidas, powerups e outros agentes próximos.
     */
    getVisibleEntities(playerAgent, worldState) {
        const INTEREST_RADIUS = 2000; // Raio nominal de interesse visual (2000 pixels)
        const queryBox = {
            x: playerAgent.x - INTEREST_RADIUS,
            y: playerAgent.y - INTEREST_RADIUS,
            width: INTEREST_RADIUS * 2,
            height: INTEREST_RADIUS * 2
        };

        // 1. Busca rápida no Spatial Hashing de comidas
        const visibleFoods = worldState.foodManager.foodSpatialHashing.query(queryBox)
            .filter(f => Math.hypot(playerAgent.x - f.x, playerAgent.y - f.y) < INTEREST_RADIUS);

        // 2. Busca rápida no Spatial Hashing de powerups
        const visiblePowerups = worldState.powerupManager.powerupSpatialHashing.query(queryBox)
            .filter(p => Math.hypot(playerAgent.x - p.x, playerAgent.y - p.y) < INTEREST_RADIUS);

        // 3. Busca rápida no Spatial Hashing de agentes (desduplicando segmentos corporais)
        const seenIds = new Set();
        const visiblePlayers = [];

        const nearbyEntities = worldState.agentManager.agentSpatialHashing.query(queryBox);
        for (const entity of nearbyEntities) {
            const agent = entity.owner || entity; // Segmentos apontam para owner, a cabeça é o próprio agent
            if (agent.isDead || seenIds.has(agent.id)) {
                continue;
            }

            const dist = Math.hypot(playerAgent.x - agent.x, playerAgent.y - agent.y);
            if (dist < INTEREST_RADIUS) {
                seenIds.add(agent.id);
                visiblePlayers.push(agent);
            }
        }

        return {
            food: visibleFoods,
            powerups: visiblePowerups,
            players: visiblePlayers
        };
    }
}

export default InterestManager;
