import { jest } from '@jest/globals';
import NeedSystem from './NeedSystem.js';

describe('NeedSystem', () => {
    let system;
    let mockAgents;

    beforeEach(() => {
        system = new NeedSystem();
        mockAgents = [
            {
                maxLength: 50,
                isBoosting: false,
                needs: {
                    hunger: 50,
                    energy: 50,
                    fatigue: 50,
                    fear: 0,
                    stress: 50
                }
            },
            {
                maxLength: 100,
                isBoosting: true,
                needs: {
                    hunger: 20,
                    energy: 10,
                    fatigue: 90,
                    fear: 10,
                    stress: 80
                }
            }
        ];
    });

    describe('Hunger', () => {
        it('should increase hunger based on mass, fatigue, and deltaTime', () => {
            const initialHunger0 = mockAgents[0].needs.hunger;
            const initialHunger1 = mockAgents[1].needs.hunger;

            const deltaTime = 2;
            system.update(mockAgents, deltaTime);

            // Agent 0: 0.05 * (50 / 50) * (1 + (50 / 100)) * 2 = 0.05 * 1 * 1.5 * 2 = 0.15
            expect(mockAgents[0].needs.hunger).toBeCloseTo(initialHunger0 + 0.15);

            // Agent 1: 0.05 * (100 / 50) * (1 + (90 / 100)) * 2 = 0.05 * 2 * 1.9 * 2 = 0.38
            expect(mockAgents[1].needs.hunger).toBeCloseTo(initialHunger1 + 0.38);
        });

        it('should cap hunger at 100', () => {
            mockAgents[0].needs.hunger = 99.95;
            system.update(mockAgents, 2);
            expect(mockAgents[0].needs.hunger).toBe(100);

            mockAgents[0].needs.hunger = 150;
            system.update(mockAgents, 1);
            expect(mockAgents[0].needs.hunger).toBe(100);
        });
    });

    describe('Energy and Fatigue (Boosting)', () => {
        it('should decrease energy and increase fatigue when boosting with deltaTime', () => {
            const initialEnergy = mockAgents[1].needs.energy;
            const initialFatigue = mockAgents[1].needs.fatigue;

            const deltaTime = 3;
            system.update(mockAgents, deltaTime);

            expect(mockAgents[1].needs.energy).toBeCloseTo(initialEnergy - 3);
            expect(mockAgents[1].needs.fatigue).toBeCloseTo(initialFatigue + 0.3);
        });

        it('should stop boosting and floor energy at 0 when energy runs out', () => {
            mockAgents[1].needs.energy = 0.5;

            system.update(mockAgents, 1);

            expect(mockAgents[1].needs.energy).toBe(0);
            expect(mockAgents[1].isBoosting).toBe(false);
        });

        it('should cap fatigue at 100 when boosting', () => {
            mockAgents[1].needs.fatigue = 99.95;

            system.update(mockAgents, 1);

            expect(mockAgents[1].needs.fatigue).toBe(100);
        });
    });

    describe('Energy and Fatigue (Not Boosting)', () => {
        it('should recover energy slowly when not boosting with deltaTime', () => {
            const initialEnergy = mockAgents[0].needs.energy;

            const deltaTime = 2.5;
            system.update(mockAgents, deltaTime);

            // 0.5 - (50 * 0.002) = 0.5 - 0.1 = 0.4 * 2.5 = 1.0
            expect(mockAgents[0].needs.energy).toBeCloseTo(initialEnergy + 1.0);
        });

        it('should cap energy at 100 when recovering', () => {
            mockAgents[0].needs.energy = 99.8;

            system.update(mockAgents, 1);

            expect(mockAgents[0].needs.energy).toBe(100);
        });

        it('should decrease fatigue slowly when not boosting with deltaTime', () => {
            const initialFatigue = mockAgents[0].needs.fatigue;

            const deltaTime = 4;
            system.update(mockAgents, deltaTime);

            expect(mockAgents[0].needs.fatigue).toBeCloseTo(initialFatigue - 0.2);
        });

        it('should floor fatigue at 0', () => {
            mockAgents[0].needs.fatigue = 0.02;

            system.update(mockAgents, 1);

            expect(mockAgents[0].needs.fatigue).toBe(0);
        });
    });

    describe('Stress', () => {
        it('should decrease stress when fear is 0 with deltaTime', () => {
            const initialStress = mockAgents[0].needs.stress;

            const deltaTime = 5;
            system.update(mockAgents, deltaTime);

            expect(mockAgents[0].needs.stress).toBeCloseTo(initialStress - 0.5);
        });

        it('should floor stress at 0', () => {
            mockAgents[0].needs.stress = 0.05;

            system.update(mockAgents, 1);

            expect(mockAgents[0].needs.stress).toBe(0);
        });

        it('should not decrease stress when fear is greater than 0', () => {
            mockAgents[0].needs.fear = 10;
            const initialStress = mockAgents[0].needs.stress;

            system.update(mockAgents, 2);

            expect(mockAgents[0].needs.stress).toBe(initialStress);
        });
    });

    describe('Single agent parameter', () => {
        it('should work when passing a single agent instead of an array', () => {
            const initialHunger = mockAgents[0].needs.hunger;
            system.update(mockAgents[0], 2);
            expect(mockAgents[0].needs.hunger).toBeCloseTo(initialHunger + 0.15);
        });
    });
});
