class DiffEngine {
    constructor() {
        // Guarda os IDs das entidades enviadas no ciclo anterior por socketId
        this.clientStates = new Map();
    }

    /**
     * Limpa o estado armazenado para um cliente desconectado.
     * @param {string} socketId 
     */
    clearClient(socketId) {
        this.clientStates.delete(socketId);
    }

    /**
     * Computa os diferenciais (deltas) de entidades visíveis em relação ao último tick enviado.
     * @param {string} socketId - ID do socket de comunicação.
     * @param {Object} visibleEntities - Objeto contendo comidas, powerups e jogadores visíveis no FOV.
     * @returns {Object} Snapshot delta contendo spawns, updates e removes.
     */
    computeDelta(socketId, visibleEntities) {
        if (!this.clientStates.has(socketId)) {
            this.clientStates.set(socketId, {
                players: new Set(),
                food: new Set(),
                powerups: new Set()
            });
        }

        const prevState = this.clientStates.get(socketId);
        const delta = {
            players: { spawns: [], updates: [], removes: [] },
            food: { spawns: [], removes: [] },
            powerups: { spawns: [], removes: [] }
        };

        // 1. Processamento diferencial de Players (agentes)
        const currentPlayers = new Set();
        for (const p of visibleEntities.players) {
            currentPlayers.add(p.id);
            if (!prevState.players.has(p.id)) {
                delta.players.spawns.push(this.serializePlayer(p));
            } else {
                delta.players.updates.push(this.serializePlayerUpdate(p));
            }
        }
        for (const id of prevState.players) {
            if (!currentPlayers.has(id)) {
                delta.players.removes.push(id);
            }
        }
        prevState.players = currentPlayers;

        // 2. Processamento diferencial de Comida
        const currentFood = new Set();
        for (const f of visibleEntities.food) {
            currentFood.add(f.id);
            if (!prevState.food.has(f.id)) {
                delta.food.spawns.push({ id: f.id, x: Math.round(f.x), y: Math.round(f.y), color: f.color, radius: f.radius });
            }
        }
        for (const id of prevState.food) {
            if (!currentFood.has(id)) {
                delta.food.removes.push(id);
            }
        }
        prevState.food = currentFood;

        // 3. Processamento diferencial de Powerups
        const currentPowerups = new Set();
        for (const p of visibleEntities.powerups) {
            currentPowerups.add(p.id);
            if (!prevState.powerups.has(p.id)) {
                delta.powerups.spawns.push({ id: p.id, x: Math.round(p.x), y: Math.round(p.y), type: p.type, color: p.color, radius: p.radius });
            }
        }
        for (const id of prevState.powerups) {
            if (!currentPowerups.has(id)) {
                delta.powerups.removes.push(id);
            }
        }
        prevState.powerups = currentPowerups;

        return delta;
    }

    serializePlayer(p) {
        return {
            id: p.id,
            n: p.nickname,
            skin: p.skin,
            radius: p.radius,
            x: Math.round(p.x),
            y: Math.round(p.y),
            angle: p.angle,
            targetAngle: p.targetAngle,
            color: p.color,
            s: p.body.toArray().map(segment => ({ x: Math.round(segment.x), y: Math.round(segment.y) })),
            a: !p.isDead,
            sc: p.maxLength,
            needs: p.needs,
            strategy: p.strategy,
            blackboard: {
                currentGoal: p.blackboard?.currentGoal || 'EXPLORE',
                emotionalState: p.blackboard?.emotionalState || 'CALM',
                dangerMap: p.blackboard?.dangerMap || []
            }
        };
    }

    serializePlayerUpdate(p) {
        return {
            id: p.id,
            x: Math.round(p.x),
            y: Math.round(p.y),
            angle: p.angle,
            targetAngle: p.targetAngle,
            radius: p.radius,
            sc: p.maxLength,
            s: p.body.toArray().map(segment => ({ x: Math.round(segment.x), y: Math.round(segment.y) })),
            needs: p.needs,
            blackboard: {
                currentGoal: p.blackboard?.currentGoal || 'EXPLORE',
                emotionalState: p.blackboard?.emotionalState || 'CALM',
                dangerMap: p.blackboard?.dangerMap || []
            }
        };
    }
}

export default DiffEngine;
