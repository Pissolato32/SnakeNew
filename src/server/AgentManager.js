import { BOT_NAMES, SPAWN_BUFFER, AGENT_SPATIAL_HASH_CELL_SIZE, DEFAULT_PLAYER_COLORS, Creature_BODY_BUFFER_SIZE, Creature_HEAD_HISTORY_SIZE, INITIAL_Creature_LENGTH, INITIAL_Creature_RADIUS, INITIAL_Creature_TURN_RATE, INITIAL_Creature_SPEED, DEATH_FOOD_DROP_STEP, DEATH_FOOD_DROP_OFFSET, DEATH_FOOD_TYPE_INDEX, DEATH_FOOD_COLOR, DEATH_FOOD_RGB } from '../shared/Constants.js';
import { getSafeSpawnPoint } from '../shared/Utils.js';
import SpatialHashing from '../shared/SpatialHashing.js';
import CircularBuffer from '../shared/CircularBuffer.js';
import config from '../../config/index.js';
import Validator from './Validator.js';
import { applyFocus, createDefaultFocus, createLifeIdentity } from '../shared/LifeModel.js';

class AgentManager {
    constructor(io, foodManager, logger, RegionId, eventBus = null) {
        this.io = io;
        this.agents = {};
        this.agentSpatialHashing = new SpatialHashing(AGENT_SPATIAL_HASH_CELL_SIZE);
        this.foodManager = foodManager;
        this.logger = logger;
        this.RegionId = RegionId;
        this.eventBus = eventBus;
    }

    createAgent(id, nickname, isBot = true, skin = 'default', color = null) {
        let startPos;
        if (isBot && Object.keys(this.agents).length > 50) {
            const WORLD_SIZE = 30000;
            const angle = Math.random() * 2 * Math.PI;
            const r = Math.random() * (WORLD_SIZE / 4);
            startPos = { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
        } else {
            startPos = getSafeSpawnPoint(this.agents, SPAWN_BUFFER);
        }

        let agentColor = color;
        if (!agentColor) {
            agentColor = DEFAULT_PLAYER_COLORS[Math.floor(Math.random() * DEFAULT_PLAYER_COLORS.length)];
        }

        const r = parseInt(agentColor.slice(1, 3), 16) || 0;
        const g = parseInt(agentColor.slice(3, 5), 16) || 0;
        const b = parseInt(agentColor.slice(5, 7), 16) || 0;
        const life = createLifeIdentity({ isBot });

        const newAgent = {
            id,
            persistentId: life.persistentId,
            nickname,
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
            isBot,
            isOnline: !isBot,
            controller: life.controller,
            socketId: isBot ? null : id,
            isBoosting: false,
            aiState: 'FARMING',
            powerups: {},
            ping: 0,
            lastFoodDropTime: 0,
            boostDropCounter: 0,
            skin,
            lastProcessedInputSeq: 0,
            familyId: life.familyId,
            broodId: life.broodId,
            generation: life.generation,
            genes: life.genes,
            traits: life.traits,
            skills: life.skills,
            focus: createDefaultFocus(),
            strategy: {
                aggression: 50,
                caution: 50,
                curiosity: 50,
                greed: 50,
                cooperation: 50,
                energyConservation: 50
            },
            blackboard: {
                currentGoal: 'EXPLORE',
                currentTarget: null,
                lastDecision: null,
                decisionCooldown: 0,
                emotionalState: 'CALM',
                lastKnownFood: [],
                knownThreats: [],
                knownPrey: [],
                knownAllies: [],
                dangerMap: [],
                visitedRegions: [],
                safeZones: [],
                lastDangerArea: null,
                currentPath: null,
                visitedCells: new Map(),
                worldModel: { opportunities: [], threats: [], allies: [] },
                decisionTrace: null
            },
            needs: {
                hunger: 0,
                energy: 100,
                stress: 0,
                fear: 0,
                fatigue: 0,
                curiosity: 50,
                confidence: 50
            },
            stats: {
                bornAt: life.bornAt,
                kills: 0,
                foodEaten: 0,
                maxHungerReached: 0,
                maxStressReached: 0,
                maxFearReached: 0,
                maxFatigueReached: 0,
                deathReason: 'collision',
                rankingScore: 0,
                familyRankingScore: 0
            },
            handleStrategyInput: (data) => {
                if (!data || data.type !== 'STRATEGY_UPDATE') return;

                // Novo contrato: foco discreto 1-5. O modelo legado 0-100 é derivado
                // para manter os avaliadores existentes compatíveis.
                if (data.focus) {
                    applyFocus(newAgent, data.focus);
                }

                // Compatibilidade temporária com clientes antigos.
                if (data.strategy) {
                    newAgent.strategy = { ...newAgent.strategy, ...data.strategy };
                }
            }
        };

        this.addAgent(newAgent);
        newAgent.body.addFirst(startPos);
        newAgent.targetAngle = newAgent.angle;
        return newAgent;
    }

    addAgent(agent) {
        this.agents[agent.id] = agent;
        this.agentSpatialHashing.insert(agent);
        this.logger.info(`Agent ${agent.nickname} (${agent.persistentId || agent.id}) added to Region ${this.RegionId}.`);
        if (this.eventBus) this.eventBus.publish('AGENT_BORN', agent);
    }

    removeAgent(agentId) {
        const agent = this.agents[agentId];
        if (!agent) return;

        this.agentSpatialHashing.remove(agent);
        for (const segment of agent.bodySegments) this.agentSpatialHashing.remove(segment);

        delete this.agents[agent.id];
        this.logger.info(`Agent ${agent.nickname} (${agent.persistentId || agentId}) removed from Region ${this.RegionId}.`);
    }

    killAgent(agent) {
        agent.isDead = true;
        agent.controller = 'NONE';
        agent.isOnline = false;

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
    }

    addBot(activeNames = null) {
        const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
        let baseName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        let botName = baseName;
        let counter = 1;

        if (activeNames) {
            while (activeNames.has(botName)) {
                botName = `${baseName} ${counter}`;
                counter++;
            }
            activeNames.add(botName);
        } else {
            const currentNames = new Set(Object.values(this.agents).map(p => p.nickname));
            while (currentNames.has(botName)) {
                botName = `${baseName} ${counter}`;
                counter++;
            }
        }
        this.createAgent(botId, botName, true);
    }

    initBots() {
        const botCount = config.BOT_COUNT || 0;
        const activeNames = new Set(Object.values(this.agents).map(p => p.nickname));
        for (let i = 0; i < botCount; i++) this.addBot(activeNames);
    }

    getAgents() {
        return this.agents;
    }
}

export default AgentManager;
