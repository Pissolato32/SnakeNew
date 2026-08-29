import { createLifeIdentity } from './LifeModel.js';

export function createFamily({ familyId = null, name = null } = {}) {
    const id = familyId || `family_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    return {
        familyId: id,
        name: name || id,
        createdAt: Date.now(),
        skills: { points: 0, unlocked: [] },
        memberPersistentIds: []
    };
}

export function createWormIdentity({ familyId, isBot = false, broodId = null, generation = 1 } = {}) {
    if (!familyId) throw new Error('familyId is required');
    const identity = createLifeIdentity({ isBot });
    return {
        ...identity,
        familyId,
        broodId: broodId || `brood_${identity.persistentId}`,
        generation
    };
}

export function addFamilyMember(family, worm) {
    if (!family || !worm) throw new Error('family and worm are required');
    if (worm.familyId !== family.familyId) throw new Error('worm belongs to another family');
    if (!family.memberPersistentIds.includes(worm.persistentId)) {
        family.memberPersistentIds.push(worm.persistentId);
    }
    return family;
}
