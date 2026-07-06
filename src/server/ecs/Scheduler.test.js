import Scheduler from './Scheduler.js';
import Logger from '../../shared/Logger.js';

describe('Scheduler', () => {
    let logger;
    let scheduler;

    beforeEach(() => {
        logger = new Logger('silent');
        scheduler = new Scheduler(logger);
    });

    test('should execute task when interval has elapsed', () => {
        let count = 0;
        // Frequência nominal: 10 Hz (intervalMs = 100ms)
        scheduler.addTask('test-10Hz', 10, () => {
            count++;
        });

        // Primeiro tick inicializa a contagem
        const now1 = 1000;
        const res1 = scheduler.tick(now1);
        expect(count).toBe(1);
        expect(res1['test-10Hz']).toBeDefined();

        // Tick com 50ms não deve rodar
        const now2 = 1050;
        const res2 = scheduler.tick(now2);
        expect(count).toBe(1);
        expect(res2['test-10Hz']).toBeUndefined();

        // Tick com 105ms adicionais deve rodar
        const now3 = 1105;
        const res3 = scheduler.tick(now3);
        expect(count).toBe(2);
        expect(res3['test-10Hz']).toBeDefined();
    });

    test('should execute multiple tasks based on respective nominal frequencies', () => {
        let countFast = 0;
        let countSlow = 0;

        // Frequência nominal: 10 Hz (100ms) e 2 Hz (500ms)
        scheduler.addTask('fast', 10, () => countFast++);
        scheduler.addTask('slow', 2, () => countSlow++);

        const now = 1000;
        scheduler.tick(now);
        expect(countFast).toBe(1);
        expect(countSlow).toBe(1);

        // Tick 200ms depois: só a fast roda
        scheduler.tick(now + 200);
        expect(countFast).toBe(2);
        expect(countSlow).toBe(1);

        // Tick 500ms depois: ambas rodam
        scheduler.tick(now + 500);
        expect(countFast).toBe(3);
        expect(countSlow).toBe(2);
    });
});
