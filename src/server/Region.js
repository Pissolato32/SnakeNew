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
import {
    DYNAMIC_FOOD_TARGET_BASE,
    DYNAMIC_FOOD_TARGET_PER_PLAYER,
    SPAWN_BUFFER,
    BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP,
    BOOST_SPEED_MULTIPLIER,
    BOOST_FOOD_DROP_INTERVAL,
    BOOST_LENGTH_CONSUMED_PER_DROP,
    DEATH_FOOD_DROP_OFFSET,
    DEATH_FOOD_TYPE_INDEX,
    DEATH_FOOD_COLOR,
    DEATH_FOOD_RGB,
    Creature_SEGMENT_RADIUS,
    FOOD_MAGNET_RADIUS,
    FOOD_MAGNET_FORCE,
    FOOD_MAGNET_FORCE_MULTIPLIER,
    WORLD_SIZE,
    AI_TICK_RATE_DIVISOR,
    TURN_RATE_MIN,
    TURN_RATE_MAX_INITIAL,
    LENGTH_DIVISOR_TURN_RATE,
    BASE_SPEED_MIN,
    BASE_SPEED_MAX_INITIAL,
    LENGTH_DIVISOR_SPEED,
    MIN_POWERUPS,
    BOT_COUNT_HUMAN_MULTIPLIER,
    BOT_SCORE_DIFFERENCE_FACTOR,
    BOT_SCORE_DIFFERENCE_BONUS,
    MIN_BOT_COUNT,
    GAME_TICK_RATE_MS
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

        // Instanciação de sistemas específicos de Phase 0
        this.scheduler = new Scheduler(this.logger);
        this.resourceManager = new ResourceManager(this.foodManager, this.powerupManager, this.agentManager, this.logger);
        this.interestManager = new InterestManager();
        this.diffEngine = new DiffEngine();
        this.snapshotBuilder = new SnapshotBuilder();
        this.predictionSystem = new PredictionSystem();
        this.worldModelSystem = new WorldModelSystem();
        this.navigationSystem = new NavigationSystem(this.predictionSystem);

        // Registrar tarefas de ECS desacoplados na ordem especificada com frequências nominais
        this.scheduler.addTask('Physics', 10, (now) => {
            this.runPhysicsTick();
        });

        this.scheduler.addTask('Collision', 10, (now) => {
            this.collisionSystem.processCollisions();
        });

        this.scheduler.addTask('Perception', 5, (now) => {
            this.runPerceptionTick();
        });

        this.scheduler.addTask('AI', 10, (now) => {
            this.runAITick();
        });

        this.scheduler.addTask('Needs', 1, (now) => {
            this.runNeedsTick();
        });

        this.scheduler.addTask('Goals', 1, (now) => {
            this.runGoalsTick();
        });

        this.scheduler.addTask('ResourceManager', 0.5, (now) => {
            this.resourceManager.update(now);
        });

        this.scheduler.addTask('Persistence', 1 / 30, (now) => {
            this.persistenceSystem.update(this.agentManager.getAgents());
        });

        // Inicializa o StatsSystem
        this.statsSystem = new StatsSystem();

        // Agenda atualização periódica das estatísticas regionais (1 Hz)
        this.scheduler.addTask('Stats', 1, (now) => {
            this.statsSystem.updateRegionStats(this);
        });

        this.scheduler.addTask('BotManager', 0.2, (now) => {
            this.runBotManagement();
        });

        // Inscreve observadores estatísticos no Event Bus para escutar eventos biológicos
        if (this.eventBus) {
            this.eventBus.subscribe('AGENT_BORN', (agent) => {
                this.statsSystem.recordAgentSpawn(agent);
            });
            this.eventBus.subscribe('AGENT_DIED', (data) => {
                this.statsSystem.recordAgentDeath(data);
            });
            this.eventBus.subscribe('FOOD_SPAWNED', (data) => {
                this.statsSystem.recordFoodSpawned(data.count || 1);
            });
            this.eventBus.subscribe('FOOD_EATEN', () => {
                this.statsSystem.recordFoodEaten();
            });
        }

        this.tickCount = 0;
        this.isReady = false;
        this.initializeWorld();
    }

    async initializeWorld() {
        this.logger.info(`Initializing world for Region ${this.id}...`);

        try {
            const savedState = await this.persistenceSystem.loadState();
            if (savedState && savedState.agents && savedState.agents.length > 0) {
                this.logger.info(`Loading ${savedState.agents.length} agents from persistent state...`);
                for (const savedAgent of savedState.agents) {
                    const agent = this.agentManager.createAgent(
                        savedAgent.id,
                        savedAgent.nickname,
                        savedAgent.isBot !== undefined ? savedAgent.isBot : true,
                        savedAgent.skin || 'default',
                        savedAgent.color
                    );

                    // Valida se o agente carregado está fora dos limites para evitar morte instantânea por boundary
                    const distFromCenter = Math.hypot(savedAgent.x, savedAgent.y);
                    if (distFromCenter > WORLD_SIZE / 2 - 200) {
                        const angle = Math.random() * 2 * Math.PI;
                        const r = Math.random() * (WORLD_SIZE / 4);
                        agent.x = Math.cos(angle) * r;
                        agent.y = Math.sin(angle) * r;
                    } else {
                        agent.x = savedAgent.x;
                        agent.y = savedAgent.y;
                    }
                    // Restore direction so the snake keeps heading the same way
                    if (savedAgent.angle !== undefined) {
                        agent.angle = savedAgent.angle;
                        agent.targetAngle = savedAgent.angle;
                    }
                    agent.maxLength = savedAgent.maxLength || agent.maxLength;
                    agent.radius = savedAgent.radius || agent.radius;
                    agent.token = savedAgent.token;
                    agent.isOffline = savedAgent.isOffline || false;
                    agent.offlineSince = savedAgent.offlineSince || null;
                    if (savedAgent.strategy) agent.strategy = { ...agent.strategy, ...savedAgent.strategy };
                    if (savedAgent.needs) agent.needs = { ...agent.needs, ...savedAgent.needs };
                    if (savedAgent.blackboard) agent.blackboard = { ...agent.blackboard, ...savedAgent.blackboard };

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
        const initialFoodCount = DYNAMIC_FOOD_TARGET_BASE + (initialAgentCount * DYNAMIC_FOOD_TARGET_PER_PLAYER);
        this.foodManager.addFoodInBatch(initialFoodCount, this.agentManager.getAgents(), SPAWN_BUFFER);

        this.isReady = true;
        this.logger.info(`Region ${this.id} initialization complete.`);
    }

    addAgent(socket, agentData) {
        const { nickname, skin, color, token } = agentData;

        const existingAgent = Object.values(this.agentManager.getAgents()).find(
            a => a.nickname === nickname && !a.isBot
        );

        if (existingAgent) {
            if (existingAgent.token && existingAgent.token !== token) {
                this.logger.warn(`Security alert: Attempted hijack of agent '${nickname}' with invalid token.`);
                socket.emit('login-failed', { error: 'Este nickname já está em uso por outra cobra ativa!' });
                return;
            }

            this.logger.info(`Reconnecting strategist to existing agent: ${nickname}`);
            const oldId = existingAgent.id;
            delete this.agentManager.agents[oldId];
            existingAgent.id = socket.id;
            existingAgent.isOffline = false;

            // Log how long the snake was autonomously AI-controlled
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
        this.agentManager.removeAgent(socketId);
        this.diffEngine.clearClient(socketId);
    }

    killAgent(agent) {
        this.agentManager.killAgent(agent);
        const socket = this.io.sockets.sockets.get(agent.id);
        if (socket) {
            socket.emit('death', { 
                score: Math.floor(agent.maxLength),
                stats: agent.stats
            });
        }
    }

    simulateOfflineProgression(dt) {
        const agents = this.agentManager.getAgents();
        const bots = Object.values(agents).filter(a => a.isBot);
        const humans = Object.values(agents).filter(a => !a.isBot);
        const allAgents = [...bots, ...humans];

        if (allAgents.length === 0) return;

        allAgents.forEach(agent => {
            if (agent.isDead) return;

            // 1. Simular as Necessidades (needs) baseadas na estratégia (Mais próximo da lógica de NeedSystem)
            const hungerRateBase = 0.3 + (agent.maxLength / 100) * 0.2;
            const fatigueFactor = 1 + ((agent.needs.fatigue || 0) / 200);
            agent.needs.hunger = Math.min(100, (agent.needs.hunger || 0) + hungerRateBase * fatigueFactor * dt);

            // Gasta energia/fadiga se estiver em alta velocidade/boost
            if (agent.isBoosting) {
                agent.needs.energy = Math.max(0, (agent.needs.energy || 100) - 1.5 * dt);
                agent.needs.fatigue = Math.min(100, (agent.needs.fatigue || 0) + 0.3 * dt);
                if (agent.needs.energy <= 0) agent.isBoosting = false;
            } else {
                const hungerPenalty = agent.needs.hunger > 50 ? (agent.needs.hunger - 50) / 100 : 0;
                agent.needs.energy = Math.min(100, Math.max(0, (agent.needs.energy || 100) + (0.3 - hungerPenalty) * dt));
                agent.needs.fatigue = Math.max(0, (agent.needs.fatigue || 0) - 0.08 * dt);
            }

            // 2. Simular Crescimento (alimentação) com base na estratégia e ganância
            const greedNorm = (agent.strategy.greed || 50) / 100;
            const hungerNorm = agent.needs.hunger / 100;
            const feedSuccessProbability = 0.15 + (greedNorm * 0.2) + (hungerNorm * 0.3);
            if (Math.random() < feedSuccessProbability * (dt / 5)) {
                const foodGained = Math.floor(Math.random() * 3) + 1;
                agent.maxLength += foodGained;
                agent.needs.hunger = Math.max(0, agent.needs.hunger - foodGained * 15);
                agent.needs.energy = Math.min(100, agent.needs.energy + foodGained * 8);
            }

            // 3. Simular Fadiga e Envelhecimento (morte por inanição)
            if (agent.needs.hunger >= 95) {
                agent.maxLength = Math.max(5, agent.maxLength - 1);
                if (agent.maxLength <= 5) {
                    this.logger.info(`Agent ${agent.nickname} died of starvation during offline progression.`);
                    this.killAgent(agent);
                    if (this.eventBus) {
                        this.eventBus.publish('AGENT_DIED', {
                            id: agent.id,
                            nickname: agent.nickname,
                            x: agent.x,
                            y: agent.y,
                            maxLength: agent.maxLength
                        });
                    }
                    return;
                }
            }

            // 4. Simular Movimentação estratégica simples
            const speed = agent.speed || 4.0;
            agent.angle += (Math.random() - 0.5) * 0.4;
            agent.x += Math.cos(agent.angle) * speed * dt;
            agent.y += Math.sin(agent.angle) * speed * dt;

            // Limitar coordenadas ao tamanho do mapa (borda circular)
            const distFromCenter = Math.hypot(agent.x, agent.y);
            if (distFromCenter > WORLD_SIZE / 2 - 100) {
                agent.angle = Math.atan2(-agent.y, -agent.x);
                agent.x = Math.cos(agent.angle) * (WORLD_SIZE / 2 - 200);
                agent.y = Math.sin(agent.angle) * (WORLD_SIZE / 2 - 200);
            }

            // Atualizar histórico de cabeça e corpo de forma simplificada
            agent.headHistory.addFirst({ x: agent.x, y: agent.y, timestamp: Date.now() });
            agent.body.addFirst({ x: agent.x, y: agent.y });
            while (agent.body.length > agent.maxLength) {
                agent.body.removeLast();
            }
        });

        // 5. Simular Conflitos/Combate simples por proximidade
        for (let i = 0; i < allAgents.length; i++) {
            const agentA = allAgents[i];
            if (agentA.isDead) continue;

            for (let j = i + 1; j < allAgents.length; j++) {
                const agentB = allAgents[j];
                if (agentB.isDead) continue;

                const dist = Math.hypot(agentA.x - agentB.x, agentA.y - agentB.y);
                if (dist < 150) {
                    const scoreA = agentA.maxLength * (0.5 + (agentA.strategy.aggression || 0.5));
                    const scoreB = agentB.maxLength * (0.5 + (agentB.strategy.aggression || 0.5));

                    if (Math.abs(scoreA - scoreB) > 5) {
                        if (scoreA > scoreB) {
                            this.logger.info(`Agent ${agentA.nickname} defeated ${agentB.nickname} in offline combat.`);
                            this.killAgent(agentB);
                            if (this.eventBus) {
                                this.eventBus.publish('AGENT_DIED', {
                                    id: agentB.id,
                                    nickname: agentB.nickname,
                                    x: agentB.x,
                                    y: agentB.y,
                                    maxLength: agentB.maxLength
                                });
                            }
                        } else {
                            this.logger.info(`Agent ${agentB.nickname} defeated ${agentA.nickname} in offline combat.`);
                            this.killAgent(agentA);
                            if (this.eventBus) {
                                this.eventBus.publish('AGENT_DIED', {
                                    id: agentA.id,
                                    nickname: agentA.nickname,
                                    x: agentA.x,
                                    y: agentA.y,
                                    maxLength: agentA.maxLength
                                });
                            }
                        }
                    }
                }
            }
        }

        // 6. Atualizar persistência
        this.persistenceSystem.update(this.agentManager.getAgents());
    }

    tick() {
        if (!this.isReady) return;
        const tickStartTime = process.hrtime.bigint();

        const now = Date.now();
        // O scheduler executa cada sistema dependendo da sua frequência nominal
        const metrics = this.scheduler.tick(now);

        const tickEndTime = process.hrtime.bigint();
        const tickDurationMs = Number(tickEndTime - tickStartTime) / 1_000_000;
        if (tickDurationMs > 100) {
            this.logger.warn(`Region ${this.id} tick took too long: ${tickDurationMs.toFixed(2)}ms`);
        }
    }

    runPhysicsTick() {
        const agents = this.agentManager.getAgents();
        const context = {
            agentManager: this.agentManager,
            foodManager: this.foodManager
        };
        for (const id in agents) {
            const agent = agents[id];
            if (agent.isDead) continue;

            this.navigationSystem.update(agent, context);

            const targetSpeed = this._handleAgentBoosting(agent);
            this._updateAgentMovement(agent, targetSpeed);
            this._updateAgentBody(agent);
            this._applyPowerUps(agent);
            this._runAntiCheat(agent);
        }
    }

    runPerceptionTick() {
        const agents = this.agentManager.getAgents();
        const context = {
            agentManager: this.agentManager,
            foodManager: this.foodManager
        };
        for (const id in agents) {
            const agent = agents[id];
            if (agent.isDead) continue;
            this.aiManager.perceptionSystem.update(agent, context);
        }
    }

    runAITick() {
        const agents = this.agentManager.getAgents();
        const context = {
            agentManager: this.agentManager,
            foodManager: this.foodManager
        };
        const now = Date.now();
        const allAgents = Object.values(agents);
        const humanPlayers = allAgents.filter(p => !p.isBot && !p.isDead && !p.isOffline);

        for (const agent of allAgents) {
            if (agent.isDead) continue;

            // AI grace period para estrategista desconectado
            const AI_GRACE_PERIOD_MS = 5000;
            const isInGracePeriod = agent.isOffline && !agent.isBot && agent.offlineSince
                && (now - agent.offlineSince) < AI_GRACE_PERIOD_MS;

            if (isInGracePeriod) continue;

            // 1. Determina o Intervalo nominal adaptativo de LOD Cognitivo
            let intervalMs = 1000; // Default: Ocioso (1 Hz)

            if (agent.isOffline) {
                intervalMs = 5000; // Dormindo (0.2 Hz)
            } else if (agent.blackboard.currentGoal === 'FLEE' || agent.blackboard.currentGoal === 'HUNT') {
                intervalMs = 100; // Combate / Fuga ativo (10 Hz)
            } else {
                // Encontra a distância para o jogador humano ativo mais próximo
                let minHumanDist = Infinity;
                for (const hp of humanPlayers) {
                    if (hp.id === agent.id) continue;
                    const d = Math.hypot(agent.x - hp.x, agent.y - hp.y);
                    if (d < minHumanDist) {
                        minHumanDist = d;
                    }
                }

                if (minHumanDist < 1500) {
                    intervalMs = 200; // Jogador próximo (5 Hz)
                } else if (minHumanDist > 3000 && minHumanDist !== Infinity) {
                    intervalMs = 2000; // Muito distante (0.5 Hz)
                } else if (agent.blackboard.currentGoal === 'EXPLORE') {
                    intervalMs = 500; // Explorando (2 Hz)
                }
            }

            // 2. Executa a IA se o tempo de intervalo correspondente expirou
            const lastTick = agent.blackboard.lastAITickTime || 0;
            if (now - lastTick >= intervalMs) {
                this.worldModelSystem.update(agent, context);
                this.aiManager.utilityAI.update(agent, context);
                agent.blackboard.lastAITickTime = now;
            }
        }
    }

    runNeedsTick() {
        const agents = this.agentManager.getAgents();
        for (const id in agents) {
            const agent = agents[id];
            if (agent.isDead) continue;
            this.aiManager.needSystem.update(agent);
        }
    }

    runGoalsTick() {
        const agents = this.agentManager.getAgents();
        for (const id in agents) {
            const agent = agents[id];
            if (agent.isDead) continue;
            this.aiManager.goalSystem.update(agent);
            this.aiManager.memorySystem.update(agent);
        }
    }

    sendSnapshots() {
        const agents = this.agentManager.getAgents();
        const activeSockets = this.io.sockets.sockets;

        for (const [socketId, socket] of activeSockets.entries()) {
            const playerAgent = agents[socketId];
            
            if (playerAgent && !playerAgent.isDead) {
                // Filtro de Interest Management espacial
                const visibleEntities = this.interestManager.getVisibleEntities(playerAgent, this);
                
                // Diff Engine: calcula diferenciais
                const delta = this.diffEngine.computeDelta(socketId, visibleEntities);
                
                // Snapshot Builder: empacota no formato Protocolo V1
                const snapshot = this.snapshotBuilder.buildSnapshot(this.tickCount, delta);
                
                socket.emit('snapshot', snapshot);
            } else {
                // Espectador/Login screen: envia as entidades mais importantes do mapa
                const spectatorEntities = {
                    players: Object.values(agents).filter(p => !p.isDead).slice(0, 10),
                    food: this.foodManager.getFood().slice(0, 50),
                    powerups: this.powerupManager.getPowerups()
                };
                const delta = this.diffEngine.computeDelta(socketId, spectatorEntities);
                const snapshot = this.snapshotBuilder.buildSnapshot(this.tickCount, delta);
                socket.emit('snapshot', snapshot);
            }
        }
        this.tickCount++;
    }

    getSnapshot() {
        const agents = this.agentManager.getAgents();
        const food = this.foodManager.getFood();
        const powerups = this.powerupManager.getPowerups();
        
        // Serialização compatível para fallback
        const delta = {
            players: { spawns: Object.values(agents).map(p => this.diffEngine.serializePlayer(p)), updates: [], removes: [] },
            food: { spawns: food.slice(0, 100).map(f => ({ id: f.id, x: Math.round(f.x), y: Math.round(f.y), color: f.color, radius: f.radius })), removes: [] },
            powerups: { spawns: powerups.map(p => ({ id: p.id, x: Math.round(p.x), y: Math.round(p.y), type: p.type, color: p.color, radius: p.radius })), removes: [] }
        };

        return this.snapshotBuilder.buildSnapshot(this.tickCount, delta);
    }

    _handleAgentBoosting(agent) {
        let targetSpeed = agent.baseSpeed;
        if (agent.isBoosting && agent.maxLength > BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
            targetSpeed = agent.baseSpeed * BOOST_SPEED_MULTIPLIER;
            agent.boostDropCounter++;

            if (agent.boostDropCounter >= BOOST_FOOD_DROP_INTERVAL) {
                agent.maxLength -= BOOST_LENGTH_CONSUMED_PER_DROP;
                agent.boostDropCounter = 0;

                const dropDistance = agent.radius + DEATH_FOOD_DROP_OFFSET;
                const dropX = agent.x - Math.cos(agent.angle) * dropDistance;
                const dropY = agent.y - Math.sin(agent.angle) * dropDistance;

                if (Math.hypot(dropX, dropY) < WORLD_SIZE / 2 - 10) {
                    const food = this.foodManager.createFood(dropX, dropY, DEATH_FOOD_TYPE_INDEX, this.agentManager.getAgents(), SPAWN_BUFFER);
                    food.glow = true;
                    food.color = DEATH_FOOD_COLOR;
                    food.rgb = DEATH_FOOD_RGB;
                    this.foodManager.addFood(food);
                }
            }

            if (agent.maxLength <= BOOST_MIN_BODY_LENGTH_FOR_FOOD_DROP) {
                agent.isBoosting = false;
            }
        } else {
            targetSpeed = agent.baseSpeed;
        }
        return targetSpeed;
    }

    _updateAgentMovement(agent, targetSpeed) {
        const angleDiff = agent.targetAngle - agent.angle;
        const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

        agent.turnRate = Math.max(TURN_RATE_MIN, TURN_RATE_MAX_INITIAL - (agent.maxLength / LENGTH_DIVISOR_TURN_RATE));
        agent.angle += normalizedDiff * Math.min(agent.turnRate * 2, Math.abs(normalizedDiff));

        agent.baseSpeed = Math.max(BASE_SPEED_MIN, BASE_SPEED_MAX_INITIAL - (agent.maxLength / LENGTH_DIVISOR_SPEED));
        agent.speed = targetSpeed;

        const deltaX = Math.cos(agent.angle) * agent.speed;
        const deltaY = Math.sin(agent.angle) * agent.speed;

        if (!isNaN(deltaX) && !isNaN(deltaY)) {
            agent.x += deltaX;
            agent.y += deltaY;
        }

        agent.headHistory.addFirst({ x: agent.x, y: agent.y, timestamp: Date.now() });
    }

    _updateAgentBody(agent) {
        agent.body.addFirst({ x: agent.x, y: agent.y });
        while (agent.body.length > agent.maxLength) {
            agent.body.removeLast();
        }

        while (agent.bodySegments.length > agent.body.length - 1) {
            const segmentToRemove = agent.bodySegments.pop();
            this.agentManager.agentSpatialHashing.remove(segmentToRemove);
        }
        while (agent.bodySegments.length < agent.body.length - 1) {
            const newSegment = {
                x: 0, y: 0,
                radius: Creature_SEGMENT_RADIUS,
                owner: agent
            };
            agent.bodySegments.push(newSegment);
            this.agentManager.agentSpatialHashing.insert(newSegment);
        }

        for (let i = 0; i < agent.bodySegments.length; i++) {
            const point = agent.body.get(i + 1);
            const segment = agent.bodySegments[i];
            segment.x = point.x;
            segment.y = point.y;
            this.agentManager.agentSpatialHashing.update(segment);
        }

        this.agentManager.agentSpatialHashing.update(agent);
    }

    _applyPowerUps(agent) {
        if (agent.powerups.foodMagnet && agent.powerups.foodMagnet.attractOnce) {
            const queryBox = {
                x: agent.x - FOOD_MAGNET_RADIUS,
                y: agent.y - FOOD_MAGNET_RADIUS,
                width: FOOD_MAGNET_RADIUS * 2,
                height: FOOD_MAGNET_RADIUS * 2
            };
            const nearbyFood = this.foodManager.foodSpatialHashing.query(queryBox);
            nearbyFood.forEach(f => {
                const distance = Math.hypot(agent.x - f.x, agent.y - f.y);
                if (distance < FOOD_MAGNET_RADIUS) {
                    const angle = Math.atan2(agent.y - f.y, agent.x - f.x);
                    const force = FOOD_MAGNET_FORCE * FOOD_MAGNET_FORCE_MULTIPLIER * (FOOD_MAGNET_RADIUS - distance) / FOOD_MAGNET_RADIUS;
                    f.x += Math.cos(angle) * force;
                    f.y += Math.sin(angle) * force;
                    
                    const distFromCenter = Math.hypot(f.x, f.y);
                    if (distFromCenter > WORLD_SIZE / 2 - 10) {
                        const angleToCenter = Math.atan2(f.y, f.x);
                        f.x = Math.cos(angleToCenter) * (WORLD_SIZE / 2 - 10);
                        f.y = Math.sin(angleToCenter) * (WORLD_SIZE / 2 - 10);
                    }
                    this.foodManager.foodSpatialHashing.update(f);
                }
            });
            agent.powerups.foodMagnet.attractOnce = false;
        }
    }

    _runAntiCheat(agent) {
        if (!agent.isBot) {
            this.antiCheat.updateAgentHistory(agent);
            if (this.antiCheat.detectSpeedHack(agent) || this.antiCheat.detectTeleport(agent)) {
                this.logger.warn(`Cheating detected for agent ${agent.id}, removing from game`);
                this.killAgent(agent);
            }
        }
    }

    runBotManagement() {
        const agents = this.agentManager.getAgents();
        const activeBots = Object.values(agents).filter(a => a.isBot && !a.isDead);
        const targetBotCount = config.BOT_COUNT || 10;

        if (activeBots.length < targetBotCount) {
            const botsToSpawn = targetBotCount - activeBots.length;
            this.logger.info(`[BotManager] Active bots: ${activeBots.length}/${targetBotCount}. Spawning ${botsToSpawn} new bots.`);
            const activeNames = new Set(Object.values(agents).map(p => p.nickname));
            for (let i = 0; i < botsToSpawn; i++) {
                this.agentManager.addBot(activeNames);
            }
        }
    }
}

export default Region;
