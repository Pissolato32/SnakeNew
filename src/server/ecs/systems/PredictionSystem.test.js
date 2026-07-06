import PredictionSystem from './PredictionSystem.js';

describe('PredictionSystem', () => {
    let predictionSystem;

    beforeEach(() => {
        predictionSystem = new PredictionSystem();
    });

    test('should predict correct linear trajectory', () => {
        const target = { x: 100, y: 100, speed: 10, angle: 0 };
        const pred = predictionSystem.predictPosition(target, 2); // 2 seconds
        expect(pred.x).toBe(120); // 100 + 10 * 2
        expect(pred.y).toBe(100);
    });

    test('should limit trajectory prediction to circular map limits', () => {
        const target = { x: 14500, y: 0, speed: 1000, angle: 0 }; // World boundary limit is 14900
        const pred = predictionSystem.predictPosition(target, 10);
        expect(Math.hypot(pred.x, pred.y)).toBeLessThanOrEqual(14900);
    });

    test('should estimate correct intercept position', () => {
        const agent = { x: 0, y: 0, speed: 10 };
        const target = { x: 100, y: 0, speed: 5, angle: 0 }; // Moving away
        const intercept = predictionSystem.calculateIntercept(agent, target);
        
        // Estimativa inicial: timeToIntercept = 100 / 10 = 10s.
        // Posição prevista da presa em 10s: 100 + 5 * 10 = 150.
        expect(intercept.x).toBeCloseTo(150, 0);
        expect(intercept.y).toBe(0);
        expect(intercept.timeToIntercept).toBe(10);
    });
});
