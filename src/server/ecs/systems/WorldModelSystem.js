import config from '../../../../config/index.js';

class WorldModelSystem {
    update(agent, context) {
        const bb = agent.blackboard;
        if (!bb) return;

        // Inicializa ou limpa a estrutura interpretada do World Model
        bb.worldModel = {
            opportunities: [],
            threats: []
        };

        const { lastKnownFood = [], knownThreats = [], knownPrey = [], dangerMap = [] } = bb;

        // 1. Processa Ameaças (Predadores)
        for (const threat of knownThreats) {
            const dx = threat.x - agent.x;
            const dy = threat.y - agent.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 0 && dist < 1200) {
                const sizeRatio = threat.maxLength / agent.maxLength;
                // Quanto mais perto e maior, maior o perigo interpretado (escala de 0 a 100)
                const danger = Math.min(100, Math.round(((1200 - dist) / 12) * sizeRatio));
                bb.worldModel.threats.push({
                    type: 'predator',
                    id: threat.id,
                    danger,
                    x: threat.x,
                    y: threat.y
                });
            }
        }

        // Adiciona perigo da borda do mapa se estiver muito perto
        const WORLD_SIZE = config.game ? config.game.WORLD_SIZE : 30000;
        const distFromCenter = Math.hypot(agent.x, agent.y);
        const boundaryBuffer = 800;
        if (distFromCenter > (WORLD_SIZE / 2 - boundaryBuffer)) {
            const danger = Math.min(100, Math.round((distFromCenter - (WORLD_SIZE / 2 - boundaryBuffer)) / (boundaryBuffer / 100)));
            bb.worldModel.threats.push({
                type: 'boundary',
                id: 'world_edge',
                danger,
                x: 0,
                y: 0
            });
        }

        // 2. Processa Oportunidades de Comida
        for (const food of lastKnownFood) {
            const dx = food.x - agent.x;
            const dy = food.y - agent.y;
            const dist = Math.hypot(dx, dy);

            // Base score pela proximidade e pontuação do item
            let opportunityScore = (food.score * 40) - dist * 0.5;

            // Fator de Cautela reduz o score se o alimento estiver em zona perigosa ou perto de predadores
            for (const t of bb.worldModel.threats) {
                const ftdx = food.x - t.x;
                const ftdy = food.y - t.y;
                if (ftdx * ftdx + ftdy * ftdy < 90000) { // 300px
                    opportunityScore -= 150 * (agent.strategy.caution / 50);
                }
            }

            // Fator do DangerMap
            if (Array.isArray(dangerMap)) {
                for (const zone of dangerMap) {
                    const fdx = food.x - zone.x;
                    const fdy = food.y - zone.y;
                    if (fdx * fdx + fdy * fdy < 160000) { // 400px
                        opportunityScore -= 100 * zone.intensity * (agent.strategy.caution / 50);
                    }
                }
            }

            bb.worldModel.opportunities.push({
                type: 'food',
                id: food.id,
                score: Math.max(1, Math.round(opportunityScore)),
                x: food.x,
                y: food.y
            });
        }

        // 3. Processa Oportunidades de Caça (Presas)
        for (const prey of knownPrey) {
            if (prey.isDead) continue;

            const dx = prey.x - agent.x;
            const dy = prey.y - agent.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 1500) continue;

            const sizeRatio = agent.maxLength / prey.maxLength;
            
            // Base hunting score: agressividade, proximidade, tamanho relativo
            let opportunityScore = (agent.strategy.aggression * 1.5) + (sizeRatio * 20) - (dist * 0.1);

            // Desistência / Confiança: se a chance de vitória é insignificante ou muito arriscada
            const winProbability = sizeRatio / (sizeRatio + 1); // Ex: se igual, 50%
            if (winProbability < 0.4) {
                opportunityScore -= 200; // Desestimula fortemente
            }

            // Cautela na proximidade de ameaças conhecidas
            for (const t of bb.worldModel.threats) {
                const ptdx = prey.x - t.x;
                const ptdy = prey.y - t.y;
                if (ptdx * ptdx + ptdy * ptdy < 160000) {
                    opportunityScore -= 180 * (agent.strategy.caution / 50);
                }
            }

            bb.worldModel.opportunities.push({
                type: 'prey',
                id: prey.id,
                score: Math.max(1, Math.round(opportunityScore)),
                x: prey.x,
                y: prey.y
            });
        }

        // Ordena oportunidades pelas melhores primeiro
        bb.worldModel.opportunities.sort((a, b) => b.score - a.score);
    }
}

export default WorldModelSystem;
