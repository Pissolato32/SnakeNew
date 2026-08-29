const EFFECTS = Object.freeze({
    SPEED: 'speed',
    SENSE: 'sense',
    EFFICIENCY: 'efficiency',
    DEFENSE: 'defense',
    COOPERATION: 'cooperation',
    REPRODUCTION: 'reproduction'
});

export { EFFECTS };

export function resolveSkillEffects(skills = {}) {
    const unlocked = new Set(skills.individual?.unlocked || []);
    const familyUnlocked = new Set(skills.family?.unlocked || []);
    const effect = (ids, value) => ids.some(id => unlocked.has(id) || familyUnlocked.has(id)) ? value : 0;

    return {
        [EFFECTS.SPEED]: effect(['speed', 'swift', 'mobility'], 0.05),
        [EFFECTS.SENSE]: effect(['sense', 'awareness', 'vision'], 0.05),
        [EFFECTS.EFFICIENCY]: effect(['efficiency', 'metabolism', 'foraging'], 0.05),
        [EFFECTS.DEFENSE]: effect(['defense', 'armor', 'resilience'], 0.05),
        [EFFECTS.COOPERATION]: effect(['cooperation', 'pack', 'coordination'], 0.05),
        [EFFECTS.REPRODUCTION]: effect(['reproduction', 'fertility', 'brood'], 0.05)
    };
}
