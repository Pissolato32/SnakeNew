import RelationshipSystem from './RelationshipSystem.js';

describe('RelationshipSystem integration', () => {
    const system = new RelationshipSystem();
    const a = { persistentId: 'a', familyId: 'f', broodId: 'b', focus: { cooperation: 5 }, traitWeights: { cooperation: 0.5 }, genes: ['g1'] };
    const b = { persistentId: 'b', familyId: 'f', broodId: 'b', genes: ['g1'] };

    test('scores brood members above non-brood family members', () => {
        const family = { ...b, broodId: 'other', persistentId: 'c', genes: [] };
        expect(system.score(a, b)).toBeGreaterThan(system.score(a, family));
    });

    test('same-family relationship exposes cooperation and social trust', () => {
        const relation = system.familyRelation(a, b, { trust: 50 });
        expect(relation.type).toBe('family');
        expect(relation.trust).toBe(50);
        expect(relation.canCooperate).toBe(true);
        expect(relation.cooperation).toBeGreaterThan(0);
    });

    test('different families cannot become family relation', () => {
        expect(system.familyRelation(a, { ...b, familyId: 'other' }, { trust: 100 })).toBeNull();
    });
});
