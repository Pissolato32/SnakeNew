import UtilityAI from './ecs/systems/UtilityAI.js';
import NeedSystem from './ecs/systems/NeedSystem.js';
import PerceptionSystem from './ecs/systems/PerceptionSystem.js';

/**
 * AIManager atua como o Scheduler Cognitivo para cada agente individual.
 * Delega as chamadas nas frequências corretas.
 */
class AIManager {
    constructor(agentManager, foodManager, logger) {
        this.agentManager = agentManager;
        this.foodManager = foodManager;
        this.logger = logger;

        this.utilityAI = new UtilityAI();
        this.needSystem = new NeedSystem();
        this.perceptionSystem = new PerceptionSystem();

        this.tickCounter = 0;
    }

    update(agent) {
        this.tickCounter++;

        const context = {
            agentManager: this.agentManager,
            foodManager: this.foodManager
        };

        // 1Hz (a cada 60 ticks) - Atualização lenta de Needs e Fadiga
        if (this.tickCounter % 60 === 0) {
            this.needSystem.update(agent);
        }

        // 20Hz (a cada 3 ticks) - Sensores Visuais
        if (this.tickCounter % 3 === 0) {
            this.perceptionSystem.update(agent, context);
        }

        // 5Hz (a cada 12 ticks) - Tomada de Decisão (Brain)
        if (this.tickCounter % 12 === 0) {
            this.utilityAI.update(agent, context);
        }
    }
}

export default AIManager;
