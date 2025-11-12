import { NodeState, Sequence, Selector, Action, Condition } from './BehaviorTree.js';
import config from '../../config/index.js';

class AIManager {
    constructor(playerManager, foodManager, logger) {
        this.playerManager = playerManager;
        this.foodManager = foodManager;
        this.logger = logger;
        this._isThreatNearby = this._isThreatNearby.bind(this);
        this._isPreyNearby = this._isPreyNearby.bind(this);
        this._flee = this._flee.bind(this);
        this._attack = this._attack.bind(this);
        this._farm = this._farm.bind(this);
        this.behaviorTree = this._createBehaviorTree();
    }

    // Public method to be called for each bot on each tick
    update(bot) {
        // The context passed to the tree is the bot itself, plus any other relevant info.
        const context = {
            bot,
            playerManager: this.playerManager,
            foodManager: this.foodManager
        };
        this.behaviorTree.tick(context);
    }

    // Private method to build the bot's behavior tree
    _createBehaviorTree() {
        return new Selector([
            // --- Emergency/Survival Branch ---
            new Sequence([
                new Condition(this._isThreatNearby),
                new Action(this._flee)
            ]),

            // --- Attacking Branch ---
            new Sequence([
                new Condition(this._isPreyNearby),
                new Action(this._attack)
            ]),

            // --- Farming Branch (Default Behavior) ---
            new Action(this._farm)
        ]);
    }

    // --- Condition Functions ---

    _isThreatNearby(context) {
        const { bot, playerManager } = context;
        const visionRange = { x: bot.x - config.game.AI_VISION_RANGE_DIMENSION, y: bot.y - config.game.AI_VISION_RANGE_DIMENSION, width: config.game.AI_VISION_RANGE_WIDTH, height: config.game.AI_VISION_RANGE_WIDTH };
        const nearbyPlayers = playerManager.playerSpatialHashing.query(visionRange);

        let nearestThreat = null;
        let distToThreat = Infinity;

        for (const otherPlayer of nearbyPlayers) {
            if (!otherPlayer || bot.id === otherPlayer.id) continue;
            const dist = Math.hypot(bot.x - otherPlayer.x, bot.y - otherPlayer.y);
            if (otherPlayer.maxLength > bot.maxLength * config.game.AI_THREAT_SIZE_RATIO && dist < distToThreat) {
                distToThreat = dist;
                nearestThreat = otherPlayer;
            }
        }

        let fleeThreshold = config.game.AI_FLEE_THRESHOLD_BASE + bot.radius;
        if (nearestThreat) {
            const sizeRatio = nearestThreat.maxLength / bot.maxLength;
            if (sizeRatio > config.game.AI_FLEE_THRESHOLD_SIZE_RATIO) fleeThreshold = config.game.AI_FLEE_THRESHOLD_INCREASED + bot.radius;
        }

        if (nearestThreat && distToThreat < fleeThreshold) {
            context.target = nearestThreat; // Store target in context for the action node
            return true;
        }
        return false;
    }

    _isPreyNearby(context) {
        const { bot, playerManager } = context;
        const visionRange = { x: bot.x - config.game.AI_VISION_RANGE_DIMENSION, y: bot.y - config.game.AI_VISION_RANGE_DIMENSION, width: config.game.AI_VISION_RANGE_WIDTH, height: config.game.AI_VISION_RANGE_WIDTH };
        const nearbyPlayers = playerManager.playerSpatialHashing.query(visionRange);

        let nearestPrey = null;
        let distToPrey = Infinity;

        for (const otherPlayer of nearbyPlayers) {
            if (!otherPlayer || bot.id === otherPlayer.id) continue;
            const dist = Math.hypot(bot.x - otherPlayer.x, bot.y - otherPlayer.y);
            if (otherPlayer.maxLength < bot.maxLength && dist < distToPrey) {
                distToPrey = dist;
                nearestPrey = otherPlayer;
            }
        }

        const attackThreshold = config.game.AI_ATTACK_THRESHOLD;
        const attackSizeAdvantage = config.game.AI_ATTACK_SIZE_ADVANTAGE;

        if (nearestPrey && distToPrey < attackThreshold && bot.maxLength > nearestPrey.maxLength * attackSizeAdvantage) {
            context.target = nearestPrey;
            context.distToTarget = distToPrey;
            return true;
        }
        return false;
    }

    // --- Action Functions ---

    _flee(context) {
        const { bot, target } = context;
        const goalVector = { x: bot.x - target.x, y: bot.y - target.y };
        this._applySteering(context, goalVector);
        bot.isBoosting = true;
        return NodeState.SUCCESS;
    }

    _attack(context) {
        const { bot, target, distToTarget } = context;
        const predictionFactor = distToTarget / bot.speed;
        const predictX = target.x + Math.cos(target.angle) * target.speed * predictionFactor;
        const predictY = target.y + Math.sin(target.angle) * target.speed * predictionFactor;
        const goalVector = { x: predictX - bot.x, y: predictY - bot.y };
        this._applySteering(context, goalVector);
        bot.isBoosting = true;
        return NodeState.SUCCESS;
    }

    _farm(context) {
        const { bot, foodManager } = context;
        const visionRange = { x: bot.x - config.game.AI_VISION_RANGE_DIMENSION, y: bot.y - config.game.AI_VISION_RANGE_DIMENSION, width: config.game.AI_VISION_RANGE_WIDTH, height: config.game.AI_VISION_RANGE_WIDTH };
        const nearbyFood = foodManager.foodSpatialHashing.query(visionRange);

        let mostValuableFood = null;
        let highestFoodScore = -1;

        for (const f of nearbyFood) {
            const dist = Math.hypot(bot.x - f.x, bot.y - f.y);
            const scoreHeuristic = f.score / (dist + 1);
            if (scoreHeuristic > highestFoodScore) {
                highestFoodScore = scoreHeuristic;
                mostValuableFood = f;
            }
        }

        let goalVector;
        if (mostValuableFood) {
            goalVector = { x: mostValuableFood.x - bot.x, y: mostValuableFood.y - bot.y };
        } else {
            goalVector = { x: Math.cos(bot.angle), y: Math.sin(bot.angle) }; // Wander
        }
        this._applySteering(context, goalVector);
        bot.isBoosting = false;
        return NodeState.SUCCESS;
    }

    // --- Steering & Avoidance Helper ---
    // This combines the goal with avoidance logic and sets the bot's final targetAngle
    _getAvoidanceVector(bot, playerManager) {
        let avoidanceVector = { x: 0, y: 0 };
        const SENSOR_LENGTH = bot.radius * config.game.AI_SENSOR_LENGTH_MULTIPLIER;

        // Boundary avoidance
        if (bot.x < config.game.BOT_BOUNDARY_BUFFER) avoidanceVector.x = 1;
        else if (bot.x > config.WORLD_SIZE - config.game.BOT_BOUNDARY_BUFFER) avoidanceVector.x = -1;
        if (bot.y < config.game.BOT_BOUNDARY_BUFFER) avoidanceVector.y = 1;
        else if (bot.y > config.WORLD_SIZE - config.game.BOT_BOUNDARY_BUFFER) avoidanceVector.y = -1;

        // Obstacle avoidance (other snakes)
        const visionRange = { x: bot.x - SENSOR_LENGTH, y: bot.y - SENSOR_LENGTH, width: SENSOR_LENGTH * 2, height: SENSOR_LENGTH * 2 };
        const nearbyPlayers = playerManager.playerSpatialHashing.query(visionRange);
        const sensors = [
            { angle: 0, weight: 1.0 },
            { angle: Math.PI / 4, weight: 0.5 },
            { angle: -Math.PI / 4, weight: 0.5 }
        ];

        for (const sensor of sensors) {
            const sensorAngle = bot.angle + sensor.angle;
            const sensorEndX = bot.x + Math.cos(sensorAngle) * SENSOR_LENGTH;
            const sensorEndY = bot.y + Math.sin(sensorAngle) * SENSOR_LENGTH;

            for (const otherPlayer of nearbyPlayers) {
                if (!otherPlayer || otherPlayer.id === bot.id) continue;
                if (otherPlayer.body && otherPlayer.body.length > 0) {
                    for (let i = 0; i < otherPlayer.body.length; i++) {
                        const segment = otherPlayer.body.get ? otherPlayer.body.get(i) : otherPlayer.body[i];
                        if (segment && Math.hypot(sensorEndX - segment.x, sensorEndY - segment.y) < otherPlayer.radius) {
                            avoidanceVector.x -= Math.cos(sensorAngle) * sensor.weight;
                            avoidanceVector.y -= Math.sin(sensorAngle) * sensor.weight;
                        }
                    }
                }
            }
        }
        return avoidanceVector;
    }

    _combineVectors(goalVector, avoidanceVector) {
        const goalMag = Math.hypot(goalVector.x, goalVector.y);
        if (goalMag > 0) {
            goalVector.x /= goalMag;
            goalVector.y /= goalMag;
        }

        const avoidanceMag = Math.hypot(avoidanceVector.x, avoidanceVector.y);
        if (avoidanceMag > 0) {
            avoidanceVector.x /= avoidanceMag;
            avoidanceVector.y /= avoidanceMag;
        }

        const finalVector = {
            x: goalVector.x * config.game.AI_GOAL_VECTOR_WEIGHT + avoidanceVector.x * config.game.AI_AVOIDANCE_VECTOR_WEIGHT,
            y: goalVector.y * config.game.AI_GOAL_VECTOR_WEIGHT + avoidanceVector.y * config.game.AI_AVOIDANCE_VECTOR_WEIGHT
        };

        return finalVector;
    }

    _applySteering(context, goalVector) {
        const { bot, playerManager } = context;

        const avoidanceVector = this._getAvoidanceVector(bot, playerManager);
        const finalVector = this._combineVectors(goalVector, avoidanceVector);

        const finalMag = Math.hypot(finalVector.x, finalVector.y);
        if (finalMag > config.game.AI_STEERING_MAGNITUDE_THRESHOLD) {
            bot.targetAngle = Math.atan2(finalVector.y, finalVector.x);
        }

        const avoidanceMag = Math.hypot(avoidanceVector.x, avoidanceVector.y);
        if (avoidanceMag > config.game.AI_STEERING_MAGNITUDE_THRESHOLD) {
            bot.isBoosting = true;
        }
    }
}

export default AIManager;
