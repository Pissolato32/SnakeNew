import {
    FOCUS_KEYS,
    normalizeFocus,
    focusToLegacyStrategy,
    createDefaultFocus,
    createLifeIdentity,
    sameFamily,
    canAttack
} from '../LifeModel.js';

describe('LifeModel', () => {
    test('normalizes every focus axis to 1-5', () => {
        const focus = normalizeFocus({ food: 9, safety: 0, combat: 4 });
        expect(Object.keys(focus)).toEqual(FOCUS_KEYS);
        expect(focus.food).toBe(5);
        expect(focus.safety).toBe(3);
        expect(focus.combat).toBe(4);
        expect(focus.exploration).toBe(3);
    });

    test('maps focus 1-5 to legacy 0-100 strategy weights', () => {
        const strategy = focusToLegacyStrategy({ combat: 1, safety: 5, exploration: 3, food: 5, growth: 1, cooperation: 2, energy: 4 });
        expect(strategy.aggression).toBe(0);
        expect(strategy.caution).toBe(100);
        expect(strategy.curiosity).toBe(50);
        expect(strategy.greed).toBe(100);
        expect(strategy.cooperation).toBe(25);
        expect(strategy.energyConservation).toBe(75);
    });

    test('creates a default focus profile', () => {
        expect(createDefaultFocus()).toEqual({
            food: 3,
            safety: 3,
            exploration: 3,
            combat: 3,
            cooperation: 3,
            growth: 3,
            energy: 3
        });
    });

    test('creates distinct persistent identities', () => {
        const a = createLifeIdentity({ isBot: false });
        const b = createLifeIdentity({ isBot: true });
        expect(a.persistentId).not.toBe(b.persistentId);
        expect(a.controller).toBe('HUMAN');
        expect(b.controller).toBe('AI');
        expect(a.generation).toBe(1);
    });

    test('protects members of the same family from attack', () => {
        const a = { familyId: 'family-1' };
        const b = { familyId: 'family-1' };
        const c = { familyId: 'family-2' };
        expect(sameFamily(a, b)).toBe(true);
        expect(canAttack(a, b)).toBe(false);
        expect(canAttack(a, c)).toBe(true);
    });
});
