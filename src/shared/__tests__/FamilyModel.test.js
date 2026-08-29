import { createFamily, createWormIdentity, addFamilyMember } from '../FamilyModel.js';

describe('FamilyModel', () => {
    test('creates distinct worms in the same family', () => {
        const family = createFamily({ familyId: 'family-test' });
        const a = createWormIdentity({ familyId: family.familyId });
        const b = createWormIdentity({ familyId: family.familyId });

        expect(a.persistentId).not.toBe(b.persistentId);
        expect(a.familyId).toBe(family.familyId);
        expect(b.familyId).toBe(family.familyId);
        expect(a.broodId).not.toBe(b.broodId);
    });

    test('tracks persistent worm membership', () => {
        const family = createFamily({ familyId: 'family-test' });
        const worm = createWormIdentity({ familyId: family.familyId });

        addFamilyMember(family, worm);
        addFamilyMember(family, worm);

        expect(family.memberPersistentIds).toEqual([worm.persistentId]);
    });

    test('rejects a worm from another family', () => {
        const family = createFamily({ familyId: 'family-a' });
        const worm = createWormIdentity({ familyId: 'family-b' });

        expect(() => addFamilyMember(family, worm)).toThrow('worm belongs to another family');
    });
});
