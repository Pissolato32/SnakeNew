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

        // Escaneia Agentes
        const nearbyAgents = agentManager.agentSpatialHashing.query(visionRect);
        bb.knownThreats = [];
        let localFear = 0;

        for (const other of nearbyAgents) {
            if (!other || other.id === agent.id) continue;

            // É uma ameaça se for maior (com vantagem definida na config)
            const advantage = config.game ? config.game.AI_ATTACK_SIZE_ADVANTAGE : 1.2;
            if (other.maxLength > agent.maxLength * advantage) {
                bb.knownThreats.push(other);
                localFear += 20; // Spike imediato de medo
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
