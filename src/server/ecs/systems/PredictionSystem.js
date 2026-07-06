import { WORLD_SIZE } from '../../../shared/Constants.js';

class PredictionSystem {
    /**
     * Previsão linear de posição de um agente após um determinado tempo (em segundos).
     * Garante que o ponto previsto não ultrapasse as bordas da arena.
     */
    predictPosition(target, durationSec) {
        if (!target || isNaN(target.x) || isNaN(target.y)) {
            return { x: 0, y: 0 };
        }

        const speed = target.speed || 0;
        const angle = target.angle || 0;

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        let predX = target.x + vx * durationSec;
        let predY = target.y + vy * durationSec;

        // Limita ao tamanho circular do mapa
        const distance = Math.hypot(predX, predY);
        const radiusLimit = WORLD_SIZE / 2 - 100;
        if (distance > radiusLimit) {
            const angleToCenter = Math.atan2(predY, predX);
            predX = Math.cos(angleToCenter) * radiusLimit;
            predY = Math.sin(angleToCenter) * radiusLimit;
        }

        return { x: predX, y: predY };
    }

    /**
     * Calcula o ponto ótimo de interceptação geométrica (Lead Pursuit) entre um agente perseguidor e uma presa.
     */
    calculateIntercept(agent, target) {
        if (!agent || !target) {
            return { x: target?.x || 0, y: target?.y || 0, timeToIntercept: 0 };
        }

        const dx = target.x - agent.x;
        const dy = target.y - agent.y;
        const distance = Math.hypot(dx, dy);

        const agentSpeed = agent.speed || 4;
        
        // Estima o tempo para alcançar baseado na distância atual e velocidade
        const timeToIntercept = distance / Math.max(1, agentSpeed);

        // Prepara a posição futura baseando-se nessa estimativa temporal
        const predictedPoint = this.predictPosition(target, timeToIntercept);

        return {
            x: predictedPoint.x,
            y: predictedPoint.y,
            timeToIntercept
        };
    }
}

export default PredictionSystem;
