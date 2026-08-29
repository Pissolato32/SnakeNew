import ReproductionSystem from './ReproductionSystem.js';

describe('ReproductionSystem', () => {
    test('creates offspring with new identity and next generation', () => {
        const parentA = { persistentId: 'a', familyId: 'f', generation: 2, maxLength: 50, needs: { energy: 90, hunger: 20 }, genes: ['swift'], traits: ['patient'] };
        const parentB = { persistentId: 'b', familyId: 'f', generation: 3, maxLength: 55, needs: { energy: 90, hunger: 20 }, genes: ['heavy'], traits: ['cooperative'] };
        const child = new ReproductionSystem().createOffspring(parentA, parentB, { mutationRate: 0 });
        expect(child.familyId).toBe('f');
        expect(child.generation).toBe(4);
        expect(child.persistentId).not.toBe(parentA.persistentId);
        expect(child.parents).toEqual(['a', 'b']);
        expect(child.genes.length).toBeGreaterThan(0);
    });

    test('rejects parents from different families', () => {
        const a = { persistentId: 'a', familyId: 'f1', generation: 1, maxLength: 50, needs: { energy: 90, hunger: 20 } };
        const b = { persistentId: 'b', familyId: 'f2', generation: 1, maxLength: 50, needs: { energy: 90, hunger: 20 } };
        expect(() => new ReproductionSystem().createOffspring(a, b)).toThrow('parents must belong to the same family');
    });
});
