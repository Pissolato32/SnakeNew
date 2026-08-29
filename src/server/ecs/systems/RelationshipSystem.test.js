import RelationshipSystem from './RelationshipSystem.js';

describe('RelationshipSystem', () => {
    test('scores brood members above non-brood family members', () => {
        const system = new RelationshipSystem();
        const base = { familyId: 'f', broodId: 'b', persistentId: 'a', focus: { cooperation: 5 }, traitWeights: { cooperation: 0.2 }, genes: ['swift'], blackboard: { familyReputation: {} } };
        const brood = { familyId: 'f', broodId: 'b', persistentId: 'b', genes: ['swift'] };
        const family = { familyId: 'f', broodId: 'other', persistentId: 'c', genes: [] };
        expect(system.score(base, brood)).toBeGreaterThan(system.score(base, family));
    });
});
