class MemorySystem {
    update(agent) {
        const bb = agent.blackboard;
        if (!bb) return;

        // Certifica-se de que a estrutura existe
        if (!bb.visitedCells) {
            bb.visitedCells = new Map();
        }

        // 1. Grava a célula espacial atual visitada pelo agente
        const cellX = Math.floor(agent.x / 600);
        const cellY = Math.floor(agent.y / 600);
        const key = `${cellX},${cellY}`;

        // Obtém estatísticas perceptuais locais para enriquecer a memória
        const foodCount = bb.lastKnownFood ? bb.lastKnownFood.length : 0;
        const threatsCount = bb.knownThreats ? bb.knownThreats.length : 0;

        const existingCell = bb.visitedCells.get(key);
        bb.visitedCells.set(key, {
            visitCount: (existingCell?.visitCount || 0) + 1,
            lastVisitTick: Date.now(),
            foodScore: foodCount,
            dangerScore: threatsCount * 10,
            confidence: 100,
            timestamp: Date.now()
        });

        // 2. Decaimento do dangerMap clássico (histórico de eventos de dano/morte)
        if (!Array.isArray(bb.dangerMap)) {
            bb.dangerMap = [];
        }

        const decayRate = 0.05; // Reduz 5% de intensidade por tick
        bb.dangerMap.forEach(zone => {
            zone.intensity -= decayRate;
        });

        // Filtra zonas com intensidade ativa
        bb.dangerMap = bb.dangerMap.filter(zone => zone.intensity > 0);
    }
}

export default MemorySystem;
