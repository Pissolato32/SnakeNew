import AgentManager from './AgentManager.js';
import FoodManager from './FoodManager.js';
import PowerupManager from './PowerupManager.js';
import CollisionSystem from './CollisionSystem.js';
import AIManager from './AIManager.js';
import PersistenceSystem from './ecs/systems/PersistenceSystem.js';
import AntiCheat from './AntiCheat.js';
import config from '../../config/index.js';
import EventBus from '../shared/EventBus.js';
import Scheduler from './ecs/Scheduler.js';
import ResourceManager from './ecs/systems/ResourceManager.js';
import InterestManager from './ecs/systems/InterestManager.js';
import DiffEngine from './ecs/systems/DiffEngine.js';
import SnapshotBuilder from './ecs/systems/SnapshotBuilder.js';
import StatsSystem from './ecs/systems/StatsSystem.js';
import PredictionSystem from './ecs/systems/PredictionSystem.js';
import WorldModelSystem from './ecs/systems/WorldModelSystem.js';
import NavigationSystem from './ecs/systems/NavigationSystem.js';
import ReproductionSystem from './ecs/systems/ReproductionSystem.js';
import { getAgentModifiers } from '../shared/SkillEffects.js';
import {
    DYNAMIC_FOOD_TARGET_BASE, DYNAMIC_FOOD_TARGET_PER_PLAYER, SPAWN_BUFFER,
    BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP, BOOST_SPEED_MULTIPLIER, BOOST_FOOD_DROP_INTERVAL,
    BOOST_LENGTH_CONSUMED_PER_DROP, DEATH_FOOD_DROP_OFFSET, DEATH_FOOD_TYPE_INDEX,
    DEATH_FOOD_COLOR, DEATH_FOOD_RGB, Creature_SEGMENT_RADIUS, FOOD_MAGNET_RADIUS,
    FOOD_MAGNET_FORCE, FOOD_MAGNET_FORCE_MULTIPLIER, WORLD_SIZE, AI_TICK_RATE_DIVISOR,
    TURN_RATE_MIN, TURN_RATE_MAX_INITIAL, LENGTH_DIVISOR_TURN_RATE, BASE_SPEED_MIN,
    BASE_SPEED_MAX_INITIAL, LENGTH_DIVISOR_SPEED, MIN_POWERUPS, BOT_COUNT_HUMAN_MULTIPLIER,
    BOT_SCORE_DIFFERENCE_FACTOR, BOT_SCORE_DIFFERENCE_BONUS, MIN_BOT_COUNT, GAME_TICK_RATE_MS
} from '../shared/Constants.js';

class Region {
    constructor(regionId, io, logger) {
        this.id = regionId;
        this.io = io;
        this.logger = logger;
        this.logger.info(`Region ${this.id} created`);
        this.eventBus = new EventBus();
        this.foodManager = new FoodManager(this.logger);
        this.agentManager = new AgentManager(this.io, this.foodManager, this.logger, this.id, this.eventBus);
        this.powerupManager = new PowerupManager(this.agentManager, this.logger);
        this.aiManager = new AIManager(this.agentManager, this.foodManager, this.logger, this.eventBus);
        this.collisionSystem = new CollisionSystem(this.agentManager, this.foodManager, this.powerupManager, this, this.logger, this.eventBus);
        this.antiCheat = new AntiCheat(this.logger);
        this.persistenceSystem = new PersistenceSystem(this.logger);
        this.scheduler = new Scheduler(this.logger);
        this.resourceManager = new ResourceManager(this.foodManager, this.powerupManager, this.agentManager, this.logger);
        this.interestManager = new InterestManager();
        this.diffEngine = new DiffEngine();
        this.snapshotBuilder = new SnapshotBuilder();
        this.predictionSystem = new PredictionSystem();
        this.worldModelSystem = new WorldModelSystem();
        this.navigationSystem = new NavigationSystem(this.predictionSystem);
        this.reproductionSystem = new ReproductionSystem();
        this.reproductionCooldownMs = 30000;

        this.scheduler.addTask('Physics', 10, () => this.runPhysicsTick());
        this.scheduler.addTask('Collision', 10, () => this.collisionSystem.processCollisions());
        this.scheduler.addTask('Perception', 5, () => this.runPerceptionTick());
        this.scheduler.addTask('AI', 10, () => this.runAITick());
        this.scheduler.addTask('Needs', 1, () => this.runNeedsTick());
        this.scheduler.addTask('Goals', 1, () => this.runGoalsTick());
        this.scheduler.addTask('Reproduction', 0.5, () => this.runReproductionTick());
        this.scheduler.addTask('ResourceManager', 0.5, (now) => this.resourceManager.update(now));
        this.scheduler.addTask('Persistence', 1 / 30, () => this.persistenceSystem.update(this.agentManager.getAgents()));
        this.statsSystem = new StatsSystem();
        this.scheduler.addTask('Stats', 1, () => this.statsSystem.updateRegionStats(this));
        this.scheduler.addTask('BotManager', 0.2, () => this.runBotManagement());

        this.eventBus.subscribe('AGENT_BORN', (agent) => this.statsSystem.recordAgentSpawn(agent));
        this.eventBus.subscribe('AGENT_DIED', (data) => this.statsSystem.recordAgentDeath(data));
        this.eventBus.subscribe('FOOD_SPAWNED', (data) => this.statsSystem.recordFoodSpawned(data.count || 1));
        this.eventBus.subscribe('FOOD_EATEN', () => this.statsSystem.recordFoodEaten());

        this.tickCount = 0;
        this.isReady = false;
        this.initializeWorld();
    }

    async initializeWorld() {
        this.logger.info(`Initializing world for Region ${this.id}...`);
        try {
            const savedState = await this.persistenceSystem.loadState();
            if (savedState?.agents?.length) {
                this.logger.info(`Loading ${savedState.agents.length} agents from persistent state...`);
                for (const savedAgent of savedState.agents) {
                    const agent = this.agentManager.createAgent(
                        savedAgent.id, savedAgent.nickname,
                        savedAgent.isBot !== undefined ? savedAgent.isBot : true,
                        savedAgent.skin || 'default', savedAgent.color
                    );
                    const distFromCenter = Math.hypot(savedAgent.x, savedAgent.y);
                    if (distFromCenter <= WORLD_SIZE / 2 - 200) {
                        agent.x = savedAgent.x;
                        agent.y = savedAgent.y;
                    }
                    if (savedAgent.angle !== undefined) agent.angle = agent.targetAngle = savedAgent.angle;
                    agent.maxLength = savedAgent.maxLength || agent.maxLength;
                    agent.radius = savedAgent.radius || agent.radius;
                    agent.token = savedAgent.token;
                    agent.isOffline = savedAgent.isOffline || false;
                    agent.offlineSince = savedAgent.offlineSince || null;
                    agent.persistentId = savedAgent.persistentId || agent.persistentId;
                    agent.familyId = savedAgent.familyId || agent.familyId;
                    agent.broodId = savedAgent.broodId || agent.broodId;
                    agent.generation = savedAgent.generation || agent.generation;
                    agent.genes = savedAgent.genes || agent.genes;
                    agent.traits = savedAgent.traits || agent.traits;
                    agent.skills = savedAgent.skills || agent.skills;
                    agent.focus = savedAgent.focus || agent.focus;
                    agent.controller = savedAgent.controller || (agent.isOffline ? 'AI' : (agent.isBot ? 'AI' : 'HUMAN'));
                    if (savedAgent.strategy) agent.strategy = { ...agent.strategy, ...savedAgent.strategy };
                    if (savedAgent.needs) agent.needs = { ...agent.needs, ...savedAgent.needs };
                    if (savedAgent.blackboard) agent.blackboard = { ...agent.blackboard, ...savedAgent.blackboard };
                    if (savedAgent.stats) agent.stats = { ...agent.stats, ...savedAgent.stats };
                    agent.body.clear();
                    agent.body.addFirst({ x: agent.x, y: agent.y });
                }
            } else {
                this.logger.info('No persistent state found, initializing fresh bots.');
                this.agentManager.initBots();
            }
        } catch (err) {
            this.logger.error('Error during world initialization:', err);
            this.agentManager.initBots();
        }
        const initialAgentCount = Object.values(this.agentManager.getAgents()).length;
        this.foodManager.addFoodInBatch(
            DYNAMIC_FOOD_TARGET_BASE + initialAgentCount * DYNAMIC_FOOD_TARGET_PER_PLAYER,
            this.agentManager.getAgents(), SPAWN_BUFFER
        );
        this.isReady = true;
        this.logger.info(`Region ${this.id} initialization complete.`);
    }

    addAgent(socket, agentData) {
        const { nickname, skin, color, token } = agentData;
        const existingAgent = Object.values(this.agentManager.getAgents()).find(a => a.nickname === nickname && !a.isBot);
        if (existingAgent) {
            if (existingAgent.token && existingAgent.token !== token) {
                this.logger.warn(`Security alert: Attempted hijack of agent '${nickname}' with invalid token.`);
                socket.emit('login-failed', { error: 'Este nickname já está em uso por outra cobra ativa!' });
                return;
            }
            this.logger.info(`Reconnecting strategist to existing agent: ${nickname}`);
            const oldId = existingAgent.id;
            delete this.agentManager.agents[oldId];
            this.agentManager.agentSpatialHashing.update(existingAgent);
            existingAgent.id = socket.id;
            existingAgent.socketId = socket.id;
            existingAgent.isOnline = true;
            existingAgent.isOffline = false;
            existingAgent.controller = 'HUMAN';
            if (existingAgent.offlineSince) {
                const offlineDuration = Math.floor((Date.now() - existingAgent.offlineSince) / 1000);
                this.logger.info(`Agent '${nickname}' was AI-controlled for ${offlineDuration}s. Returning to player control.`);
                existingAgent.offlineSince = null;
            }
            this.agentManager.agents[socket.id] = existingAgent;
            socket.emit('game-setup', { worldSize: WORLD_SIZE, token: existingAgent.token });
        } else {
            const secureToken = token || `tok_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`;
            const agent = this.agentManager.createAgent(socket.id, nickname, false, skin, color);
            agent.token = secureToken;
            socket.emit('game-setup', { worldSize: WORLD_SIZE, token: secureToken });
        }
    }

    removeAgent(socketId) {
        const agent = this.agentManager.getAgents()[socketId];
        if (agent && !agent.isBot && !agent.isDead) {
            agent.isOffline = true;
            agent.isOnline = false;
            agent.controller = 'AI';
            agent.socketId = null;
            agent.offlineSince = Date.now();
            this.logger.info(`Agent ${agent.nickname} remains alive under AI control after socket removal.`);
            return;
        }
        this.agentManager.removeAgent(socketId);
        this.diffEngine.clearClient(socketId);
    }

    killAgent(agent) {
        this.agentManager.killAgent(agent);
        const socket = this.io.sockets.sockets.get(agent.id);
        if (socket) socket.emit('death', { score: Math.floor(agent.maxLength), stats: agent.stats });
        if (this.eventBus) this.eventBus.publish('AGENT_DIED', agent);
    }

    tick() {
        if (!this.isReady) return;
        const start = process.hrtime.bigint();
        this.scheduler.tick(Date.now());
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
        if (durationMs > 100) this.logger.warn(`Region ${this.id} tick took too long: ${durationMs.toFixed(2)}ms`);
    }

    runPhysicsTick() {
        const agents = this.agentManager.getAgents();
        const context = { agentManager: this.agentManager, foodManager: this.foodManager };
        for (const id in agents) {
            const agent = agents[id];
            if (agent.isDead) continue;
            if (agent.controller === 'AI') this.navigationSystem.update(agent, context);
            const targetSpeed = this._handleAgentBoosting(agent);
            this._updateAgentMovement(agent, targetSpeed);
            this._updateAgentBody(agent);
            this._applyPowerUps(agent);
            this._runAntiCheat(agent);
        }
    }

    runPerceptionTick() {
        const agents = this.agentManager.getAgents();
        const context = { agentManager: this.agentManager, foodManager: this.foodManager };
        for (const id in agents) {
            const agent = agents[id];
            if (!agent.isDead && agent.controller === 'AI') this.aiManager.perceptionSystem.update(agent, context);
        }
    }

    runAITick() {
        const agents = this.agentManager.getAgents();
        const context = { agentManager: this.agentManager, foodManager: this.foodManager };
        for (const agent of Object.values(agents)) {
            if (agent.isDead || agent.controller !== 'AI') continue;
            const now = Date.now();
            const intervalMs = agent.isOffline ? 5000 : 500;
            if (now - (agent.blackboard.lastAITickTime || 0) < intervalMs) continue;
            this.worldModelSystem.update(agent, context);
            this.aiManager.utilityAI.update(agent, { ...context, tickCount: this.tickCount });
            agent.blackboard.lastAITickTime = now;
        }
    }

    runNeedsTick() {
        for (const agent of Object.values(this.agentManager.getAgents())) {
            if (!agent.isDead) this.aiManager.needSystem.update(agent);
        }
    }

    runGoalsTick() {
        for (const agent of Object.values(this.agentManager.getAgents())) {
            if (!agent.isDead && agent.controller === 'AI') {
                this.aiManager.goalSystem.update(agent);
                this.aiManager.memorySystem.update(agent);
            }
        }
    }

    runReproductionTick() {
        const agents = Object.values(this.agentManager.getAgents());
        const now = Date.now();
        const getCooldown = (agent) => {
            const mod = getAgentModifiers(agent);
            const bonus = Math.max(0, Math.min(0.3, mod.reproduction || 0));
            return this.reproductionCooldownMs * (1 - bonus);
        };

        const candidates = agents.filter((agent) =>
            !agent.isDead &&
            agent.controller === 'AI' &&
            this.reproductionSystem.canReproduce(agent) &&
            now - (agent.blackboard.lastReproductionAt || 0) >= getCooldown(agent)
        );

        for (const parentA of candidates) {
            const cooldownA = getCooldown(parentA);
            if (parentA.isDead || now - (parentA.blackboard.lastReproductionAt || 0) < cooldownA) continue;
            const partner = candidates.find((parentB) =>
                parentB !== parentA &&
                parentB.familyId === parentA.familyId &&
                Math.hypot(parentA.x - parentB.x, parentA.y - parentB.y) <= 800 &&
                now - (parentB.blackboard.lastReproductionAt || 0) >= getCooldown(parentB)
            );
            if (!partner) continue;

            const offspring = this.reproductionSystem.createOffspring(parentA, partner, {
                broodId: parentA.broodId || null,
                mutationRate: 0.05,
                isBot: true
            });
            const offspringId = `offspring_${offspring.persistentId}`;
            const nickname = `Worm-${offspring.persistentId.slice(-6)}`;
            const child = this.agentManager.createAgent(offspringId, nickname, true, parentA.skin, parentA.color);
            child.persistentId = offspring.persistentId;
            child.familyId = offspring.familyId;
            child.broodId = offspring.broodId;
            child.generation = offspring.generation;
            child.genes = offspring.genes;
            child.traits = offspring.traits;
            child.parents = offspring.parents;
            child.controller = 'AI';
            child.isOnline = false;
            child.isOffline = false;
            child.blackboard.lastReproductionAt = now;
            parentA.blackboard.lastReproductionAt = now;
            partner.blackboard.lastReproductionAt = now;
            this.logger.info(`New offspring '${nickname}' born from ${parentA.persistentId} + ${partner.persistentId}.`);
        }
    }

    sendSnapshots() {
        const agents = this.agentManager.getAgents();
        for (const [socketId, socket] of this.io.sockets.sockets.entries()) {
            const playerAgent = agents[socketId];
            const visibleEntities = playerAgent && !playerAgent.isDead
                ? this.interestManager.getVisibleEntities(playerAgent, this)
                : { players: Object.values(agents).filter(p => !p.isDead).slice(0, 10), food: this.foodManager.getFood().slice(0, 50), powerups: this.powerupManager.getPowerups() };
            socket.emit('snapshot', this.snapshotBuilder.buildSnapshot(this.tickCount, this.diffEngine.computeDelta(socketId, visibleEntities)));
        }
        this.tickCount++;
    }

    getSnapshot() {
        const agents = this.agentManager.getAgents();
        return this.snapshotBuilder.buildSnapshot(this.tickCount, {
            players: { spawns: Object.values(agents).map(p => this.diffEngine.serializePlayer(p)), updates: [], removes: [] },
            food: { spawns: this.foodManager.getFood().slice(0, 100), removes: [] },
            powerups: { spawns: this.powerupManager.getPowerups(), removes: [] }
        });
    }

    _handleAgentBoosting(agent) {
        let targetSpeed = agent.baseSpeed;
        if (agent.isBoosting && agent.maxLength > BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
            targetSpeed = agent.baseSpeed * BOOST_SPEED_MULTIPLIER;
            agent.boostDropCounter++;
            if (agent.boostDropCounter >= BOOST_FOOD_DROP_INTERVAL) {
                const defMod = Math.max(-0.2, Math.min(0.25, getAgentModifiers(agent).defense || 0));
                const lengthLoss = Math.max(0.5, BOOST_LENGTH_CONSUMED_PER_DROP * (1 - defMod * 0.5));
                agent.maxLength -= lengthLoss;
                agent.boostDropCounter = 0;
                const dropDistance = agent.radius + DEATH_FOOD_DROP_OFFSET;
                const dropX = agent.x - Math.cos(agent.angle) * dropDistance;
                const dropY = agent.y - Math.sin(agent.angle) * dropDistance;
                if (Math.hypot(dropX, dropY) < WORLD_SIZE / 2 - 10) {
                    const food = this.foodManager.createFood(dropX, dropY, DEATH_FOOD_TYPE_INDEX, this.agentManager.getAgents(), SPAWN_BUFFER);
                    food.glow = true; food.color = DEATH_FOOD_COLOR; food.rgb = DEATH_FOOD_RGB;
                    this.foodManager.addFood(food);
                }
            }
            if (agent.maxLength <= BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) agent.isBoosting = false;
        }
        return targetSpeed;
    }

    _updateAgentMovement(agent, targetSpeed) {
        const angleDiff = agent.targetAngle - agent.angle;
        const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        agent.turnRate = Math.max(TURN_RATE_MIN, TURN_RATE_MAX_INITIAL - agent.maxLength / LENGTH_DIVISOR_TURN_RATE);
        agent.angle += normalizedDiff * Math.min(agent.turnRate * 2, Math.abs(normalizedDiff));
        const speedMod = Math.max(-0.2, Math.min(0.25, getAgentModifiers(agent).speed || 0));
        agent.baseSpeed = Math.max(BASE_SPEED_MIN, (BASE_SPEED_MAX_INITIAL - agent.maxLength / LENGTH_DIVISOR_SPEED) * (1 + speedMod));
        agent.speed = targetSpeed;
        const deltaX = Math.cos(agent.angle) * agent.speed;
        const deltaY = Math.sin(agent.angle) * agent.speed;
        if (!isNaN(deltaX) && !isNaN(deltaY)) { agent.x += deltaX; agent.y += deltaY; }
        agent.headHistory.addFirst({ x: agent.x, y: agent.y, timestamp: Date.now() });
    }

    _updateAgentBody(agent) {
        agent.body.addFirst({ x: agent.x, y: agent.y });
        while (agent.body.length > agent.maxLength) agent.body.removeLast();
        while (agent.bodySegments.length > agent.body.length - 1) this.agentManager.agentSpatialHashing.remove(agent.bodySegments.pop());
        while (agent.bodySegments.length < agent.body.length - 1) {
            const segment = { x: 0, y: 0, radius: Creature_SEGMENT_RADIUS, owner: agent };
            agent.bodySegments.push(segment); this.agentManager.agentSpatialHashing.insert(segment);
        }
        for (let i = 0; i < agent.bodySegments.length; i++) {
            const point = agent.body.get(i + 1), segment = agent.bodySegments[i];
            segment.x = point.x; segment.y = point.y; this.agentManager.agentSpatialHashing.update(segment);
        }
        this.agentManager.agentSpatialHashing.update(agent);
    }

    _applyPowerUps(agent) {
        if (!agent.powerups.foodMagnet?.attractOnce) return;
        const r = FOOD_MAGNET_RADIUS;
        for (const food of this.foodManager.foodSpatialHashing.query({ x: agent.x - r, y: agent.y - r, width: r * 2, height: r * 2 })) {
            const distance = Math.hypot(agent.x - food.x, agent.y - food.y);
            if (distance < r) {
                const angle = Math.atan2(agent.y - food.y, agent.x - food.x);
                const force = FOOD_MAGNET_FORCE * FOOD_MAGNET_FORCE_MULTIPLIER * (r - distance) / r;
                food.x += Math.cos(angle) * force; food.y += Math.sin(angle) * force;
                this.foodManager.foodSpatialHashing.update(food);
            }
        }
        agent.powerups.foodMagnet.attractOnce = false;
    }

    _runAntiCheat(agent) {
        if (!agent.isBot) {
            this.antiCheat.updateAgentHistory(agent);
            if (this.antiCheat.detectSpeedHack(agent) || this.antiCheat.detectTeleport(agent)) this.killAgent(agent);
        }
    }

    runBotManagement() {
        const agents = this.agentManager.getAgents();
        const activeBots = Object.values(agents).filter(a => a.isBot && !a.isDead);
        const target = config.BOT_COUNT || 10;
        if (activeBots.length < target) {
            const names = new Set(Object.values(agents).map(p => p.nickname));
            for (let i = activeBots.length; i < target; i++) this.agentManager.addBot(names);
        }
    }

    simulateOfflineProgression(dt) {
        for (const agent of Object.values(this.agentManager.getAgents())) {
            if (agent.isDead || agent.controller !== 'AI') continue;
            agent.needs.hunger = Math.min(100, agent.needs.hunger + (0.3 + agent.maxLength / 500) * dt);
            agent.needs.energy = Math.max(0, Math.min(100, agent.needs.energy + (agent.isBoosting ? -1.5 : 0.2) * dt));
            if (agent.needs.hunger >= 95) agent.maxLength = Math.max(5, agent.maxLength - 1);
            if (agent.maxLength <= 5) this.killAgent(agent);
            else {
                agent.x += Math.cos(agent.angle) * (agent.speed || 4) * dt;
                agent.y += Math.sin(agent.angle) * (agent.speed || 4) * dt;
            }
        }
        this.persistenceSystem.update(this.agentManager.getAgents());
    }
}

export default Region;
