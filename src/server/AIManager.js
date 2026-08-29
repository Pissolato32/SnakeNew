import UtilityAI from './ecs/systems/UtilityAI.js';
import NeedSystem from './ecs/systems/NeedSystem.js';
import PerceptionSystem from './ecs/systems/PerceptionSystem.js';
import MemorySystem from './ecs/systems/MemorySystem.js';
import GoalSystem from './ecs/systems/GoalSystem.js';
import GeneticsSystem from './ecs/systems/GeneticsSystem.js';
import RelationshipSystem from './ecs/systems/RelationshipSystem.js';

/**
 * Scheduler cognitivo. A IA controla somente agentes cujo controller === 'AI'.
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
        this.geneticsSystem = new GeneticsSystem();
        this.relationshipSystem = new RelationshipSystem();

        if (this.eventBus) this.eventBus.subscribe('AGENT_DIED', (data) => this.handleAgentDeath(data));
    }

    handleAgentDeath(data) {
        const agents = this.agentManager.getAgents();
        for (const id in agents) {
            const agent = agents[id];
            if (agent.isDead || agent.id === data.id) continue;
            if (!agent.blackboard.dangerMap) agent.blackboard.dangerMap = [];
            const dist = Math.hypot(agent.x - data.x, agent.y - data.y);
            if (dist < 4000) {
                agent.blackboard.dangerMap.push({ x: data.x, y: data.y, intensity: 1.0, timestamp: Date.now() });
            }
        }
    }

    update(agent, globalTickCount) {
        if (!agent || agent.isDead || agent.controller !== 'AI') return;
        const context = { agentManager: this.agentManager, foodManager: this.foodManager, tickCount: globalTickCount };

        // Genética e traits modificam predisposições, nunca substituem o contexto.
        this.geneticsSystem.apply(agent);
        if (globalTickCount % 3 === 0) this.perceptionSystem.update(agent, context);
        this.relationshipSystem.update(agent, context);

        if (globalTickCount % 60 === 0) {
            this.needSystem.update(agent);
            this.goalSystem.update(agent);
            this.memorySystem.update(agent);
        }
        if (globalTickCount % 12 === 0) this.utilityAI.update(agent, context);
    }
}

export default AIManager;
