import config from '../../../../config/index.js';

class PerceptionSystem {
    update(agent, context) {
        const { agentManager, foodManager } = context;
        const bb = agent.blackboard;

        const DIMENSION = config.game ? config.game.AI_VISION_RANGE_DIMENSION : 1500;
        const WIDTH = config.game ? config.game.AI_VISION_RANGE_WIDTH : 3000;

        const visionRect = {
            x: agent.x - DIMENSION,
            y: agent.y - DIMENSION,
            width: WIDTH,
            height: WIDTH
        };

        // Escaneia comida
        const nearbyFood = foodManager.foodSpatialHashing.query(visionRect);
        bb.lastKnownFood = nearbyFood;

        // Escaneia Agentes (heads e body segments)
        const nearbyEntities = agentManager.agentSpatialHashing.query(visionRect);
        bb.knownThreats = [];
        bb.knownPrey = [];
        let localFear = 0;

        for (const entity of nearbyEntities) {
            const other = entity.owner || entity;
            if (!other || other.id === agent.id || other.isDead) continue;

            // É uma ameaça se for maior (com vantagem definida na config)
            const advantage = config.game ? config.game.AI_ATTACK_SIZE_ADVANTAGE : 1.2;
            if (other.maxLength > agent.maxLength * advantage) {
                if (!bb.knownThreats.some(t => t.id === other.id)) {
                    bb.knownThreats.push(other);
                }
                localFear += 20; // Spike imediato de medo
            } else if (agent.maxLength > other.maxLength * advantage) {
                if (!bb.knownPrey.some(p => p.id === other.id)) {
                    bb.knownPrey.push(other);
                }
            }
        }

        agent.needs.fear = localFear; // Fear é imediato (zera se não há inimigos)

        // Estresse cresce com o Fear, mas desce lentamente
        if (localFear > 0) {
            agent.needs.stress += localFear * 0.1;
            if (agent.needs.stress > 100) agent.needs.stress = 100;
        }
    }
}

export default PerceptionSystem;
