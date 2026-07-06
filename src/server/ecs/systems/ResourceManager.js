import config from '../../../../config/index.js';

class ResourceManager {
    constructor(foodManager, powerupManager, agentManager, logger) {
        this.foodManager = foodManager;
        this.powerupManager = powerupManager;
        this.agentManager = agentManager;
        this.logger = logger;
    }

    /**
     * Executa a regulação dinâmica de recursos do mapa.
     * @param {number} now - Tempo atual em ms.
     */
    update(now) {
        const allAgents = Object.values(this.agentManager.getAgents());
        
        // 1. Respawn dinâmico de comida baseado na contagem de agentes
        const targetFoodCount = config.game.DYNAMIC_FOOD_TARGET_BASE + (allAgents.length * config.game.DYNAMIC_FOOD_TARGET_PER_AGENT);
        const currentFoodCount = this.foodManager.getFood().length;

        if (currentFoodCount < targetFoodCount) {
            const foodToAdd = targetFoodCount - currentFoodCount;
            this.foodManager.addFoodInBatch(foodToAdd, this.agentManager.getAgents(), config.game.SPAWN_BUFFER);
        } else if (currentFoodCount > targetFoodCount * 1.5) {
            const foodToRemove = currentFoodCount - targetFoodCount;
            const allFood = this.foodManager.getFood();
            // Remove o excedente de comida para poupar memória e processamento
            allFood.slice(0, foodToRemove).forEach(f => this.foodManager.removeFood(f));
        }

        // 2. Garante o suprimento mínimo de powerups no mapa
        if (this.powerupManager.getPowerups().length < config.game.MIN_POWERUPS) {
            this.powerupManager.addPowerup(this.powerupManager.createPowerup());
        }

        // 3. Processa a expiração natural da comida (decay)
        this.foodManager.removeExpiredFood(config.game.FOOD_EXPIRATION_TIME_MS);

        // 4. Executa a movimentação periódica de itens de comida dinâmicos (como borboletas)
        this.foodManager.updateFoodMovement();
    }
}

export default ResourceManager;
