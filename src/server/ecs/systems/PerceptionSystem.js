import config from '../../../../config/index.js';
import { sameFamily } from '../../../shared/LifeModel.js';
import { getAgentModifiers } from '../../../shared/SkillEffects.js';

class PerceptionSystem {
    update(agent, context) {
        const { agentManager, foodManager } = context;
        const bb = agent.blackboard;
        const modifiers = getAgentModifiers(agent);
        const senseMult = Math.max(0.8, Math.min(1.5, 1 + (modifiers.sense || 0)));
        const DIMENSION = (config.game ? config.game.AI_VISION_RANGE_DIMENSION : 1500) * senseMult;
        const WIDTH = DIMENSION * 2;
        const visionRect = { x: agent.x - DIMENSION, y: agent.y - DIMENSION, width: WIDTH, height: WIDTH };

        const nearbyFood = foodManager.foodSpatialHashing.query(visionRect);
        bb.lastKnownFood = nearbyFood;

        const nearbyEntities = agentManager.agentSpatialHashing.query(visionRect);
        bb.knownThreats = [];
        bb.knownPrey = [];
        bb.knownAllies = [];
        let localFear = 0;

        for (const entity of nearbyEntities) {
            const other = entity.owner || entity;
            if (!other || other.id === agent.id || other.isDead) continue;

            // Parentesco é uma relação social explícita: membros da mesma família
            // não entram no conjunto de presa/predador.
            if (sameFamily(agent, other)) {
                if (!bb.knownAllies.some(a => a.id === other.id)) bb.knownAllies.push(other);
                continue;
            }

            const advantage = config.game ? config.game.AI_ATTACK_SIZE_ADVANTAGE : 1.2;
            if (other.maxLength > agent.maxLength * advantage) {
                if (!bb.knownThreats.some(t => t.id === other.id)) bb.knownThreats.push(other);
                localFear += 20;
            } else if (agent.maxLength > other.maxLength * advantage) {
                if (!bb.knownPrey.some(p => p.id === other.id)) bb.knownPrey.push(other);
            }
        }

        agent.needs.fear = localFear;
        if (localFear > 0) {
            agent.needs.stress = Math.min(100, agent.needs.stress + localFear * 0.1);
        }
    }
}

export default PerceptionSystem;
