import SkillProgressionSystem from './SkillProgressionSystem.js';

describe('SkillProgressionSystem', () => {
    test('requires points and prerequisites', () => {
        const agent = { isDead: false, skills: { individual: { points: 3, unlocked: [] }, family: { points: 0, unlocked: [] } } };
        const system = new SkillProgressionSystem();
        expect(system.unlock(agent, 'individual', 'danger_sense')).toBe(false);
        expect(system.unlock(agent, 'individual', 'efficient_metabolism')).toBe(true);
        expect(system.unlock(agent, 'individual', 'danger_sense')).toBe(true);
    });
});
