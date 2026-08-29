import { getIndividualModifiers, getFamilyModifiers, getAgentModifiers, EFFECTS } from '../../../shared/SkillEffects.js';
import NeedSystem from './NeedSystem.js';
import PerceptionSystem from './PerceptionSystem.js';
import ReproductionSystem from './ReproductionSystem.js';

describe('Skill Effects ECS Integration & Boundary Invariants', () => {
    describe('SkillEffects Domain Invariants', () => {
        test('nonexistent or empty skills produce neutral (0) modifiers', () => {
            const mods = getIndividualModifiers({});
            for (const key of Object.values(EFFECTS)) {
                expect(mods[key]).toBe(0);
            }
        });

        test('nonexistent family produces neutral (0) modifiers', () => {
            const famMods = getFamilyModifiers(null);
            for (const key of Object.values(EFFECTS)) {
                expect(famMods[key]).toBe(0);
            }
        });

        test('dead agent returns neutral modifiers (no operational effect)', () => {
            const deadAgent = {
                isDead: true,
                skills: { individual: { unlocked: ['escape_artist', 'efficient_metabolism'] } },
                family: { skills: { unlocked: ['genetic_stability'] } }
            };
            const mods = getAgentModifiers(deadAgent);
            for (const key of Object.values(EFFECTS)) {
                expect(mods[key]).toBe(0);
            }
        });

        test('modifiers are strictly clamped even with extreme skill inputs', () => {
            const overflowSkills = {
                individual: {
                    unlocked: [
                        'escape_artist', 'navigation', 'ambush', 'speed', 'swift', 'fast',
                        'danger_sense', 'tracking', 'scouting', 'predator_instinct', 'territory_memory', 'shared_alerts'
                    ]
                }
            };
            const mods = getIndividualModifiers(overflowSkills);
            expect(mods.speed).toBeLessThanOrEqual(0.25);
            expect(mods.sense).toBeLessThanOrEqual(0.5);
            expect(mods.speed).toBeGreaterThanOrEqual(-0.2);
        });

        test('family modifiers are additively combined, not multiplied by member count', () => {
            const agent = {
                isDead: false,
                skills: { individual: { unlocked: ['efficient_metabolism'] } }
            };
            const family = {
                memberPersistentIds: ['w1', 'w2', 'w3', 'w4', 'w5'],
                skills: { unlocked: ['resource_sharing'] }
            };
            const mods = getAgentModifiers(agent, family);
            // 0.05 from individual + 0.04 from family = 0.09
            expect(mods.efficiency).toBeCloseTo(0.09, 2);
        });
    });

    describe('NeedSystem with Skill Efficiency', () => {
        test('reduces hunger increase and boost energy drain within bounds', () => {
            const needSystem = new NeedSystem();
            const baselineAgent = {
                maxLength: 50,
                isDead: false,
                isBoosting: false,
                needs: { hunger: 10, energy: 100, fatigue: 0, stress: 0, fear: 0 },
                skills: { individual: { unlocked: [] } }
            };

            const skilledAgent = {
                maxLength: 50,
                isDead: false,
                isBoosting: false,
                needs: { hunger: 10, energy: 100, fatigue: 0, stress: 0, fear: 0 },
                skills: { individual: { unlocked: ['efficient_metabolism'] } }
            };

            needSystem.update(baselineAgent);
            needSystem.update(skilledAgent);

            expect(skilledAgent.needs.hunger).toBeLessThan(baselineAgent.needs.hunger);
            expect(skilledAgent.needs.hunger).toBeGreaterThan(0);
        });
    });

    describe('PerceptionSystem with Skill Sense', () => {
        test('expands logical vision box without altering spatial hash', () => {
            const perceptionSystem = new PerceptionSystem();
            const queriedRects = [];
            const mockFoodHashing = {
                query: (rect) => {
                    queriedRects.push(rect);
                    return [];
                }
            };
            const mockAgentHashing = { query: () => [] };
            const context = {
                foodManager: { foodSpatialHashing: mockFoodHashing },
                agentManager: { agentSpatialHashing: mockAgentHashing }
            };

            const normalAgent = {
                id: 'a1',
                x: 1000,
                y: 1000,
                maxLength: 20,
                isDead: false,
                controller: 'AI',
                blackboard: {},
                needs: { fear: 0, stress: 0 },
                skills: { individual: { unlocked: [] } }
            };

            const perceptiveAgent = {
                id: 'a2',
                x: 1000,
                y: 1000,
                maxLength: 20,
                isDead: false,
                controller: 'AI',
                blackboard: {},
                needs: { fear: 0, stress: 0 },
                skills: { individual: { unlocked: ['danger_sense', 'tracking'] } }
            };

            perceptionSystem.update(normalAgent, context);
            perceptionSystem.update(perceptiveAgent, context);

            expect(queriedRects[1].width).toBeGreaterThan(queriedRects[0].width);
        });
    });

    describe('ReproductionSystem with Skill Reproduction', () => {
        test('reproduction skills lower eligibility thresholds within bounded limits', () => {
            const repro = new ReproductionSystem();
            const normalAgent = {
                isDead: false,
                maxLength: 38,
                needs: { energy: 68, hunger: 42 },
                skills: { individual: { unlocked: [] } }
            };

            const fertileAgent = {
                isDead: false,
                maxLength: 38,
                needs: { energy: 68, hunger: 42 },
                skills: { individual: { unlocked: ['genetic_stability', 'trait_inheritance'] } }
            };

            expect(repro.canReproduce(normalAgent)).toBe(false);
            expect(repro.canReproduce(fertileAgent)).toBe(true);
        });
    });

    describe('Balancing Simulation: Baseline vs Skills Comparison', () => {
        test('ensures skill modifiers provide marginal, non-game-breaking advantages', () => {
            const needSystem = new NeedSystem();
            const baseline = {
                maxLength: 50,
                isDead: false,
                isBoosting: true,
                needs: { hunger: 0, energy: 100, fatigue: 0 },
                skills: { individual: { unlocked: [] } }
            };

            const maxSkilled = {
                maxLength: 50,
                isDead: false,
                isBoosting: true,
                needs: { hunger: 0, energy: 100, fatigue: 0 },
                skills: { individual: { unlocked: ['efficient_metabolism', 'resource_sharing', 'alliance_discount'] } }
            };

            for (let tick = 0; tick < 60; tick++) {
                needSystem.update(baseline);
                needSystem.update(maxSkilled);
            }

            // Advantage in hunger must be bounded (e.g. difference is less than 35% of total)
            const diffRatio = (baseline.needs.hunger - maxSkilled.needs.hunger) / baseline.needs.hunger;
            expect(diffRatio).toBeLessThan(0.35);
            expect(diffRatio).toBeGreaterThan(0.05);
        });
    });
});
