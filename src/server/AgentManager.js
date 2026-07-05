import { BOT_NAMES, SPAWN_BUFFER, AGENT_SPATIAL_HASH_CELL_SIZE, DEFAULT_PLAYER_COLORS, Creature_BODY_BUFFER_SIZE, Creature_HEAD_HISTORY_SIZE, INITIAL_Creature_LENGTH, INITIAL_Creature_RADIUS, INITIAL_Creature_TURN_RATE, INITIAL_Creature_SPEED, DEATH_FOOD_DROP_STEP, DEATH_FOOD_DROP_OFFSET, DEATH_FOOD_TYPE_INDEX, DEATH_FOOD_COLOR, DEATH_FOOD_RGB } from '../shared/Constants.js';
import { getSafeSpawnPoint } from '../shared/Utils.js';
import SpatialHashing from '../shared/SpatialHashing.js';
import CircularBuffer from '../shared/CircularBuffer.js';
import config from '../../config/index.js';
import Validator from './Validator.js';

class AgentManager {
    constructor(io, foodManager, logger, RegionId) {
        this.io = io;
        this.agents = {};
        this.agentSpatialHashing = new SpatialHashing(AGENT_SPATIAL_HASH_CELL_SIZE);
        this.foodManager = foodManager;
        this.logger = logger;
        this.RegionId = RegionId;
    }

    createAgent(id, nickname, isBot = true, skin = 'default', color = null) {
        const startPos = getSafeSpawnPoint(this.agents, SPAWN_BUFFER);

        let agentColor = color;
        if (!agentColor) {
            agentColor = DEFAULT_PLAYER_COLORS[Math.floor(Math.random() * DEFAULT_PLAYER_COLORS.length)];
        }

        const r = parseInt(agentColor.slice(1, 3), 16) || 0;
        const g = parseInt(agentColor.slice(3, 5), 16) || 0;
        const b = parseInt(agentColor.slice(5, 7), 16) || 0;

        const newAgent = {
            id: id,
            nickname: nickname,
            x: startPos.x,
            y: startPos.y,
            color: agentColor,
            rgb: { r, g, b },
            body: new CircularBuffer(Creature_BODY_BUFFER_SIZE),
            headHistory: new CircularBuffer(Creature_HEAD_HISTORY_SIZE),
            bodySegments: [],
            maxLength: INITIAL_Creature_LENGTH,
            radius: INITIAL_Creature_RADIUS,
            angle: Math.random() * 2 * Math.PI,
            targetAngle: 0,
            turnRate: INITIAL_Creature_TURN_RATE,
            speed: INITIAL_Creature_SPEED,
            isBot: isBot,
            isBoosting: false,
            aiState: 'FARMING',
            powerups: {},
            ping: 0,
            lastFoodDropTime: 0,
            boostDropCounter: 0,
            skin: skin,
            lastProcessedInputSeq: 0,
            // Base component for ALife
            strategy: {
                aggression: 50,
                caution: 50,
                curiosity: 50
            },
            blackboard: {},
            needs: { hunger: 0, energy: 100 },
            handleStrategyInput: (data) => {
                if (data && data.type === "STRATEGY_UPDATE") {
                    newAgent.strategy = data.strategy;
                }
            }
        };
        newAgent.body.addFirst(startPos);
        newAgent.targetAngle = newAgent.angle;

        this.addAgent(newAgent);
        return newAgent;
    }

    addAgent(agent) {
        this.agents[agent.id] = agent;
        this.agentSpatialHashing.insert(agent);
        this.logger.info(`Agent ${agent.nickname} (${agent.id}) added to Region ${this.RegionId}.`);
    }

    removeAgent(agentId) {
        const agent = this.agents[agentId];
        if (!agent) return;

        this.agentSpatialHashing.remove(agent);
        // Also remove body segments from spatial hash
        for (const segment of agent.bodySegments) {
            this.agentSpatialHashing.remove(segment);
        }

        delete this.agents[agent.id];
        this.logger.info(`Agent ${agent.nickname} (${agentId}) removed from Region ${this.RegionId}.`);
    }

    killAgent(agent) {
        agent.isDead = true;

        // Game logic for dropping food on death
        if (agent.body.length > 0) {
            for (let i = 0; i < agent.body.length; i += DEATH_FOOD_DROP_STEP) {
                const segment = agent.body.get(i);
                if (!segment) continue;

                const offsetX = (Math.random() - 0.5) * DEATH_FOOD_DROP_OFFSET;
                const offsetY = (Math.random() - 0.5) * DEATH_FOOD_DROP_OFFSET;

                const foodItem = this.foodManager.createFood(
                    segment.x + offsetX,
                    segment.y + offsetY,
                    DEATH_FOOD_TYPE_INDEX,
                    this.agents,
                    SPAWN_BUFFER
                );
                foodItem.glow = true;
                foodItem.color = DEATH_FOOD_COLOR;
                foodItem.rgb = DEATH_FOOD_RGB;
                this.foodManager.addFood(foodItem);
            }
        }

        // The 'death' event will be emitted by the Region, which has the socket reference
        // this.removeAgent(agent.id); // The agent object is kept as 'dead' until cleanup
    }

    addBot() {
        const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
        let baseName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        let botName = baseName;
        let counter = 1;

        while (Object.values(this.agents).some(p => p.nickname === botName)) {
            botName = `${baseName} ${counter}`;
            counter++;
        }
        this.createAgent(botId, botName, true);
    }

    initBots() {
        const botCount = config.BOT_COUNT || 0;
        for (let i = 0; i < botCount; i++) { this.addBot(); }
    }

    getAgents() {
        return this.agents;
    }
}

export default AgentManager;
