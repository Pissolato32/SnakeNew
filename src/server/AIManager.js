import UtilityAI from './ecs/systems/UtilityAI.js';
import NeedSystem from './ecs/systems/NeedSystem.js';
import PerceptionSystem from './ecs/systems/PerceptionSystem.js';
import MemorySystem from './ecs/systems/MemorySystem.js';
import GoalSystem from './ecs/systems/GoalSystem.js';

/**
 * AIManager atua como o Scheduler Cognitivo para cada agente individual.
 * Delega as chamadas nas frequências corretas.
 */
class AIManager {
    constructor(agentManager, foodManager, logger, eventBus = null) {
        this.agentManager = agentManager;
        this.foodManager = foodManager;
        this.logger = logger;
        this.eventBus = eventBus;

        this.utilityAI = new UtilityAI();
        this.needSystem = new NeedSystem();
        this.perceptionSystem = new PerceptionSystem();
        this.memorySystem = new MemorySystem();
        this.goalSystem = new GoalSystem();

        if (this.eventBus) {
            this.eventBus.subscribe('AGENT_DIED', (data) => {
                this.handleAgentDeath(data);
            });
        }
    }

    handleAgentDeath(data) {
        const agents = this.agentManager.getAgents();
        for (const id in agents) {
            const agent = agents[id];
            if (agent.isDead || agent.id === data.id) continue;

            if (!agent.blackboard.dangerMap) {
                agent.blackboard.dangerMap = [];
            }

            // Apenas registra a zona de perigo se estiver dentro de uma distância limite (ex: 4000 pixels)
            const dist = Math.hypot(agent.x - data.x, agent.y - data.y);
            if (dist < 4000) {
                agent.blackboard.dangerMap.push({
                    x: data.x,
                    y: data.y,
                    intensity: 1.0,
                    timestamp: Date.now()
                });
            }
        }
    }

    update(agent, globalTickCount) {
        const context = {
            agentManager: this.agentManager,
            foodManager: this.foodManager
        };

        // 1Hz (a cada 60 ticks) - Atualização lenta de Needs, Fadiga, Metas e Memória
        if (globalTickCount % 60 === 0) {
            this.needSystem.update(agent);
            this.goalSystem.update(agent);
            this.memorySystem.update(agent);
        }

        // 20Hz (a cada 3 ticks) - Sensores Visuais
        if (globalTickCount % 3 === 0) {
            this.perceptionSystem.update(agent, context);
        }

        // 5Hz (a cada 12 ticks) - Tomada de Decisão (Brain)
        if (globalTickCount % 12 === 0) {
            this.utilityAI.update(agent, context);
        }
    }
}

export default AIManager;
