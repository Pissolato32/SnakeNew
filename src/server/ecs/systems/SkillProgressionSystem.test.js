import SkillProgressionSystem from './SkillProgressionSystem.js';
import { resolveSkillEffects, EFFECTS } from '../../../shared/SkillEffects.js';

describe('SkillProgressionSystem', () => {
    test('requires points and prerequisites', () => {
        const agent = { isDead: false, skills: { individual: { points: 3, unlocked: [] }, family: { points: 0, unlocked: [] } } };
        const system = new SkillProgressionSystem();
        expect(system.unlock(agent, 'individual', 'danger_sense')).toBe(false);
        expect(system.unlock(agent, 'individual', 'efficient_metabolism')).toBe(true);
        expect(system.unlock(agent, 'individual', 'danger_sense')).toBe(true);
    });

    test('unlocked skills resolve into bounded modifiers', () => {
        const effects = resolveSkillEffects({ individual: { unlocked: ['speed', 'sense'] } });
        expect(effects[EFFECTS.SPEED]).toBe(0.05);
        expect(effects[EFFECTS.SENSE]).toBe(0.05);
        expect(effects[EFFECTS.DEFENSE]).toBe(0);
    });

    test('progression remains compatible with effect resolution', () => {
        const system = new SkillProgressionSystem();
        const agent = { isDead: false, skills: { individual: { points: 10, unlocked: [] }, family: { points: 0, unlocked: [] } } };
        system.award(agent, 1);
        expect(agent.skills.individual.points).toBe(11);
    });
});
