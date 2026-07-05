import AgentManager from './AgentManager.js';
import FoodManager from './FoodManager.js';
import PowerupManager from './PowerupManager.js';
import CollisionSystem from './CollisionSystem.js';
import AIManager from './AIManager.js';
import PersistenceSystem from './ecs/systems/PersistenceSystem.js';
import AntiCheat from './AntiCheat.js';
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

        this.foodManager = new FoodManager(this.logger);
        this.agentManager = new AgentManager(this.io, this.foodManager, this.logger, this.id);
        this.powerupManager = new PowerupManager(this.agentManager, this.logger);
        this.aiManager = new AIManager(this.agentManager, this.foodManager, this.logger);
        this.collisionSystem = new CollisionSystem(this.agentManager, this.foodManager, this.powerupManager, this, this.logger);
        this.antiCheat = new AntiCheat(this.logger);
        this.persistenceSystem = new PersistenceSystem(this.logger);

        this.tickCount = 0;
        this.dynamicManagementCounter = 0;
        this.initializeWorld();
    }

    initializeWorld() {
        this.logger.info(`Initializing world for Region ${this.id}...`);
        this.agentManager.initBots();
        const initialAgentCount = Object.values(this.agentManager.getAgents()).length;
        const initialFoodCount = DYNAMIC_FOOD_TARGET_BASE + (initialAgentCount * DYNAMIC_FOOD_TARGET_PER_PLAYER);
        this.foodManager.addFoodInBatch(initialFoodCount, this.agentManager.getAgents(), SPAWN_BUFFER);
    }

    addAgent(socket, agentData) {
        const { nickname, skin, color } = agentData;
        this.agentManager.createAgent(socket.id, nickname, false, skin, color);
        socket.emit('game-setup', { worldSize: WORLD_SIZE });
    }

    removeAgent(socketId) {
        this.agentManager.removeAgent(socketId);
    }

    killAgent(agent) {
        this.agentManager.killAgent(agent);
        const socket = this.io.sockets.sockets.get(agent.id);
        if (socket) {
            socket.emit('death', { score: Math.floor(agent.maxLength) });
        }
    }

    tick() {
        const tickStartTime = process.hrtime.bigint();

        this.tickCount++;
        this.updateGameLogic();
        this.dynamicManagementCounter++;
        if (this.dynamicManagementCounter >= (1000 / (1000 / GAME_TICK_RATE_MS)) / 2) { // Roughly every 2 seconds
            this.manageDynamicElements();
            this.dynamicManagementCounter = 0;
        }

        this.persistenceSystem.update(this.agentManager.getAgents());

        const tickEndTime = process.hrtime.bigint();
        const tickDurationMs = Number(tickEndTime - tickStartTime) / 1_000_000; // Convert nanoseconds to milliseconds
        // Log tick duration if it exceeds a certain threshold or periodically
        if (tickDurationMs > (1000 / GAME_TICK_RATE_MS)) {
            this.logger.warn(`Region ${this.id} tick took too long: ${tickDurationMs.toFixed(2)}ms`);
        }
        // Optionally log every tick for detailed performance analysis
        // this.logger.debug(`Region ${this.id} tick duration: ${tickDurationMs.toFixed(2)}ms`);
    }

    updateGameLogic() {
        const agents = this.agentManager.getAgents();

        for (const id in agents) {
            const agent = agents[id];
            if (agent.isDead) continue;

            this._updateAgentAI(agent);
            const targetSpeed = this._handleAgentBoosting(agent);
            this._updateAgentMovement(agent, targetSpeed);
            this._updateAgentBody(agent);
            this._applyPowerUps(agent);
            this._runAntiCheat(agent);
        }

        this.collisionSystem.processCollisions();
        this.foodManager.updateFoodMovement();
    }

    manageDynamicElements() {
        const allAgents = Object.values(this.agentManager.getAgents());
        const humanAgents = allAgents.filter(p => !p.isBot);
        const bots = allAgents.filter(p => p.isBot);

        let scoreBonusBots = 0;
        if (humanAgents.length > 0 && bots.length > 0) {
            const totalBotScore = bots.reduce((sum, bot) => sum + bot.maxLength, 0);
            const averageBotScore = totalBotScore / bots.length;
            const maxHumanScore = Math.max(...humanAgents.map(p => p.maxLength));

            if (maxHumanScore > averageBotScore * BOT_SCORE_DIFFERENCE_FACTOR) {
                scoreBonusBots = BOT_SCORE_DIFFERENCE_BONUS;
            }
        }

        const targetBotCount = Math.max(MIN_BOT_COUNT, (humanAgents.length * BOT_COUNT_HUMAN_MULTIPLIER) + scoreBonusBots);

        if (bots.length < targetBotCount) {
            this.agentManager.addBot();
        } else if (bots.length > targetBotCount) {
            const botToRemove = bots.reduce((lowest, bot) => bot.maxLength < lowest.maxLength ? bot : lowest);
            if (botToRemove) {
                this.agentManager.removeAgent(botToRemove.id);
            }
        }

        const targetFoodCount = DYNAMIC_FOOD_TARGET_BASE + (allAgents.length * DYNAMIC_FOOD_TARGET_PER_PLAYER);
        const currentFoodCount = this.foodManager.getFood().length;
        if (currentFoodCount < targetFoodCount) {
            const foodToAdd = targetFoodCount - currentFoodCount;
            this.foodManager.addFoodInBatch(foodToAdd, this.agentManager.getAgents(), SPAWN_BUFFER);
        } else if (currentFoodCount > targetFoodCount * 1.5) {
            const foodToRemove = currentFoodCount - targetFoodCount;
            const allFood = this.foodManager.getFood();
            allFood.slice(0, foodToRemove).forEach(f => this.foodManager.removeFood(f.id));
        }

        if (this.powerupManager.getPowerups().length < MIN_POWERUPS) {
            this.powerupManager.addPowerup(this.powerupManager.createPowerup());
        }
    }

    getSnapshot() {
        const agents = this.agentManager.getAgents();
        const food = this.foodManager.getFood();
        const powerups = this.powerupManager.getPowerups();

        const agentsState = Object.values(agents).map(p => ({
            id: p.id,
            n: p.nickname,
            skin: p.skin,
            radius: p.radius,
            x: p.x,
            y: p.y,
            angle: p.angle,
            color: p.color,
            s: p.body.toArray().map(segment => ({ x: Math.round(segment.x), y: Math.round(segment.y) })),
            a: !p.isDead,
            sc: p.maxLength,
            seq: p.lastProcessedInputSeq,
            needs: p.needs,
            blackboard: {
                currentGoal: p.blackboard?.currentGoal || 'EXPLORE'
            }
        }));

        const foodState = food.map(f => ({ id: f.id, x: f.x, y: f.y, color: f.color, radius: f.radius }));
        const powerupsState = powerups.map(p => ({ id: p.id, x: p.x, y: p.y, type: p.type, color: p.color, radius: p.radius }));

        return {
            t: this.tickCount,
            players: agentsState,
            food: foodState,
            powerups: powerupsState,
        };
    }

    _updateAgentAI(agent) {
        this.aiManager.update(agent, this.tickCount);
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
            const foodItems = this.foodManager.getFood();
            foodItems.forEach(f => {
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
}

export default Region;
