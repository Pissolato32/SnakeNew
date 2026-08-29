import {
    SIMULATION_VERSION,
    SIMULATION_LODS,
    seededRandom,
    createWorldClock,
    advanceWorldClock,
    createCheckpoint,
    restoreCheckpoint,
    createAuditEvent,
    getSimulationStepMs,
    integrateLinear
} from '../SimulationCore.js';

describe('SimulationCore', () => {
    test('seeded RNG is stable and entity/event scoped', () => {
        const a = seededRandom(1234, 42, 'worm-1', 'FOOD');
        const b = seededRandom(1234, 42, 'worm-1', 'FOOD');
        const c = seededRandom(1234, 42, 'worm-2', 'FOOD');
        expect(a).toBe(b);
        expect(c).not.toBe(a);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(1);
    });

    test('clock advances only by elapsed simulation time', () => {
        const clock = createWorldClock({ worldTime: 0, simulationTick: 0 });
        const next = advanceWorldClock(clock, 125000, 60000);
        expect(next.worldTime).toBe(125000);
        expect(next.simulationTick).toBe(2);
        expect(next.version).toBe(SIMULATION_VERSION);
    });

    test('checkpoint restores an equivalent state without aliasing', () => {
        const clock = createWorldClock({ worldTime: 1000, simulationTick: 3 });
        const state = { worm: { energy: 80, size: 12 } };
        const checkpoint = createCheckpoint({ clock, worldSeed: 'world-a', state });
        state.worm.energy = 0;
        const restored = restoreCheckpoint(checkpoint);
        expect(restored.state.worm.energy).toBe(80);
        expect(restored.clock).toEqual(clock);
        expect(restored.worldSeed).toBe(checkpoint.worldSeed);
    });

    test('audit events are reproducible for identical inputs', () => {
        const clock = createWorldClock({ worldTime: 60000, simulationTick: 1 });
        const args = { clock, entityId: 'worm-1', eventType: 'FOOD_FOUND', inputs: { energy: 50 }, result: { amount: 5 }, worldSeed: 99 };
        expect(createAuditEvent(args)).toEqual(createAuditEvent(args));
    });

    test('LOD has explicit simulation resolution', () => {
        expect(getSimulationStepMs(SIMULATION_LODS.HIGH)).toBeCloseTo(1000 / 60);
        expect(getSimulationStepMs(SIMULATION_LODS.MEDIUM)).toBe(60000);
        expect(getSimulationStepMs(SIMULATION_LODS.LOW)).toBe(900000);
    });

    test('linear progression is timestep-independent within floating point tolerance', () => {
        const rate = -0.00001;
        const oneHour = integrateLinear(100, rate, 3600000);
        let sixtySteps = 100;
        for (let i = 0; i < 60; i += 1) sixtySteps = integrateLinear(sixtySteps, rate, 60000);
        expect(sixtySteps).toBeCloseTo(oneHour, 10);
    });
});
