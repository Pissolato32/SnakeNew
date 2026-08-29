export const FOCUS_LEVELS = Object.freeze({ MIN: 1, MAX: 5, DEFAULT: 3 });

export const FOCUS_KEYS = Object.freeze(['food', 'safety', 'exploration', 'combat', 'cooperation', 'growth', 'energy']);

const clampFocus = (value) => {
    const numericValue = Number(value);
    const normalized = Number.isFinite(numericValue) ? Math.round(numericValue) : FOCUS_LEVELS.DEFAULT;
    return Math.max(FOCUS_LEVELS.MIN, Math.min(FOCUS_LEVELS.MAX, normalized));
};

export function normalizeFocus(input = {}) {
    const focus = {};
    for (const key of FOCUS_KEYS) focus[key] = clampFocus(input[key]);
    return focus;
}

export function focusToLegacyStrategy(focusInput = {}) {
    const focus = normalizeFocus(focusInput);
    return {
        aggression: (focus.combat - 1) * 25,
        caution: (focus.safety - 1) * 25,
        curiosity: (focus.exploration - 1) * 25,
        greed: Math.max((focus.food - 1) * 25, (focus.growth - 1) * 25),
        cooperation: (focus.cooperation - 1) * 25,
        energyConservation: (focus.energy - 1) * 25
    };
}

export function createDefaultFocus() { return normalizeFocus(); }

export const DEFAULT_GENES = Object.freeze(['metabolism_efficient']);
export const DEFAULT_TRAITS = Object.freeze(['adaptable']);
export const DEFAULT_SKILLS = Object.freeze({ individual: { points: 0, unlocked: [] }, family: { points: 0, unlocked: [] } });

export function createLifeIdentity({ isBot = false, familyId = null, broodId = null, generation = 1 } = {}) {
    const now = Date.now();
    const persistentId = `worm_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    return {
        persistentId,
        familyId: familyId || `family_${persistentId}`,
        broodId: broodId || `brood_${persistentId}`,
        generation,
        controller: isBot ? 'AI' : 'HUMAN',
        isOnline: !isBot,
        isOffline: false,
        bornAt: now,
        genes: [...DEFAULT_GENES],
        traits: [...DEFAULT_TRAITS],
        skills: JSON.parse(JSON.stringify(DEFAULT_SKILLS))
    };
}

export function sameFamily(a, b) { return Boolean(a?.familyId && b?.familyId && a.familyId === b.familyId); }
export function canAttack(a, b) { if (!a || !b || a === b) return false; return !sameFamily(a, b); }

export function applyFocus(agent, focusInput) {
    const focus = normalizeFocus(focusInput);
    agent.strategy = { ...agent.strategy, ...focusToLegacyStrategy(focus) };
    agent.focus = focus;
    return focus;
}
