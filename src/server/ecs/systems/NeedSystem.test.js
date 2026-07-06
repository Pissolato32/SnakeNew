import NeedSystem from './NeedSystem.js';

describe('NeedSystem', () => {
    let needSystem;
    let agent;

    beforeEach(() => {
        needSystem = new NeedSystem();
        agent = {
            maxLength: 50,
            isBoosting: false,
            needs: {
                hunger: 20,
                energy: 80,
                fatigue: 10,
                stress: 30,
                fear: 0
            }
        };
    });

    test('should increase hunger based on maxLength and fatigue', () => {
        // base rate = 0.3 + (50 / 100) * 0.2 = 0.4
        // fatigue factor = 1 + (10 / 200) = 1.05
        // expected hunger increase = 0.4 * 1.05 = 0.42
        // new hunger = 20 + 0.42 = 20.42
        needSystem.update(agent);
        expect(agent.needs.hunger).toBeCloseTo(20.42);
        expect(agent.needs.hunger).toBeLessThanOrEqual(100);
    });

    test('should cap hunger at 100', () => {
        agent.needs.hunger = 99.9;
        needSystem.update(agent);
        expect(agent.needs.hunger).toBe(100);
    });

    test('should consume energy and gain fatigue when boosting', () => {
        agent.isBoosting = true;
        needSystem.update(agent);

        expect(agent.needs.energy).toBe(78.5); // 80 - 1.5
        expect(agent.needs.fatigue).toBe(10.3); // 10 + 0.3
    });

    test('should stop boosting when energy reaches 0', () => {
        agent.isBoosting = true;
        agent.needs.energy = 1.0; // Less than 1.5
        needSystem.update(agent);

        expect(agent.needs.energy).toBe(0);
        expect(agent.isBoosting).toBe(false);
    });

    test('should recover energy and decrease fatigue when not boosting', () => {
        // hunger <= 50, so hungerPenalty is 0
        // expected energy increase = 0.3 - (10 * 0.002) = 0.28
        // expected fatigue decrease = 10 - 0.08 = 9.92
        needSystem.update(agent);

        expect(agent.needs.energy).toBeCloseTo(80.28);
        expect(agent.needs.fatigue).toBeCloseTo(9.92);
    });

    test('should apply hunger penalty to energy recovery when hunger is above 50', () => {
        agent.needs.hunger = 70;
        // hungerPenalty = (70 - 50) / 100 = 0.2
        // expected energy increase = (0.3 - 0.2) - (10 * 0.002) = 0.1 - 0.02 = 0.08
        needSystem.update(agent);

        expect(agent.needs.energy).toBeCloseTo(80.08);
    });

    test('should decrease stress when fear is 0', () => {
        agent.needs.fear = 0;
        needSystem.update(agent);
        expect(agent.needs.stress).toBeCloseTo(29.9); // 30 - 0.1
    });

    test('should not decrease stress below 0', () => {
        agent.needs.fear = 0;
        agent.needs.stress = 0.05;
        needSystem.update(agent);
        expect(agent.needs.stress).toBe(0);
    });

    test('should not decrease stress if fear is greater than 0', () => {
        agent.needs.fear = 10;
        needSystem.update(agent);
        expect(agent.needs.stress).toBe(30);
    });
});
