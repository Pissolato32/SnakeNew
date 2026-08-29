import GeneticsSystem from './GeneticsSystem.js';

describe('GeneticsSystem', () => {
    test('keeps gene modifiers bounded', () => {
        const agent = { genes: ['swift', 'swift', 'swift', 'heavy'], traits: ['aggressive', 'cooperative'] };
        const result = new GeneticsSystem().apply(agent);
        expect(result.geneticModifiers.speed).toBeLessThanOrEqual(0.1);
        expect(result.geneticModifiers.speed).toBeGreaterThanOrEqual(-0.1);
        expect(result.traitWeights.aggression).toBeGreaterThan(0);
        expect(result.traitWeights.cooperation).toBeGreaterThan(0);
    });
});
