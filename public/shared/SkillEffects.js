export const EFFECTS = Object.freeze({
    SPEED: 'speed',
    SENSE: 'sense',
    EFFICIENCY: 'efficiency',
    DEFENSE: 'defense',
    COOPERATION: 'cooperation',
    REPRODUCTION: 'reproduction'
});

const SKILL_MAP = Object.freeze({
    [EFFECTS.SPEED]: ['speed', 'swift', 'mobility', 'escape_artist', 'navigation', 'ambush'],
    [EFFECTS.SENSE]: ['sense', 'awareness', 'vision', 'danger_sense', 'tracking', 'scouting', 'predator_instinct', 'territory_memory', 'shared_alerts'],
    [EFFECTS.EFFICIENCY]: ['efficiency', 'metabolism', 'foraging', 'efficient_metabolism', 'resource_sharing', 'alliance_discount'],
    [EFFECTS.DEFENSE]: ['defense', 'armor', 'resilience', 'danger_sense', 'escape_artist', 'ally_support'],
    [EFFECTS.COOPERATION]: ['cooperation', 'pack', 'coordination', 'kinship_signal', 'ally_support', 'group_coordination', 'kin_recognition', 'shared_alerts', 'resource_sharing', 'trust', 'reputation'],
    [EFFECTS.REPRODUCTION]: ['reproduction', 'fertility', 'brood', 'genetic_stability', 'trait_inheritance', 'gene_pool']
});

const CLAMPS = Object.freeze({
    [EFFECTS.SPEED]: { min: -0.2, max: 0.25 },
    [EFFECTS.SENSE]: { min: -0.2, max: 0.5 },
    [EFFECTS.EFFICIENCY]: { min: -0.2, max: 0.25 },
    [EFFECTS.DEFENSE]: { min: -0.2, max: 0.25 },
    [EFFECTS.COOPERATION]: { min: -0.2, max: 0.3 },
    [EFFECTS.REPRODUCTION]: { min: 0.0, max: 0.3 }
});

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export function getIndividualModifiers(skills = {}) {
    const unlocked = new Set(skills?.individual?.unlocked || []);
    const res = {};
    for (const key of Object.values(EFFECTS)) {
        const matches = SKILL_MAP[key].filter(id => unlocked.has(id)).length;
        const raw = matches * 0.05;
        res[key] = clamp(raw, CLAMPS[key].min, CLAMPS[key].max);
    }
    return res;
}

export function getFamilyModifiers(family = null) {
    if (!family) {
        return Object.fromEntries(Object.values(EFFECTS).map(k => [k, 0]));
    }
    const unlocked = new Set(family.skills?.unlocked || family.unlocked || []);
    const res = {};
    for (const key of Object.values(EFFECTS)) {
        const matches = SKILL_MAP[key].filter(id => unlocked.has(id)).length;
        const raw = matches * 0.04;
        res[key] = clamp(raw, CLAMPS[key].min, CLAMPS[key].max);
    }
    return res;
}

export function getAgentModifiers(agent, family = null) {
    if (!agent || agent.isDead) {
        return Object.fromEntries(Object.values(EFFECTS).map(k => [k, 0]));
    }
    const ind = getIndividualModifiers(agent.skills);
    const fam = getFamilyModifiers(family || agent.family || (agent.skills?.family ? { skills: agent.skills.family } : null));
    const combined = {};
    for (const key of Object.values(EFFECTS)) {
        const total = (ind[key] || 0) + (fam[key] || 0);
        combined[key] = clamp(total, CLAMPS[key].min, CLAMPS[key].max);
    }
    return combined;
}

export function resolveSkillEffects(skills = {}) {
    return getIndividualModifiers(skills);
}

