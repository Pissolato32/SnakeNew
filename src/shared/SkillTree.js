export const INDIVIDUAL_SKILL_TREE = Object.freeze({
    survival: {
        label: 'Sobrevivência',
        children: ['efficient_metabolism', 'danger_sense', 'escape_artist']
    },
    hunting: {
        label: 'Caça',
        children: ['tracking', 'ambush', 'predator_instinct']
    },
    exploration: {
        label: 'Exploração',
        children: ['navigation', 'scouting', 'territory_memory']
    },
    social: {
        label: 'Cooperação',
        children: ['kinship_signal', 'ally_support', 'group_coordination']
    }
});

export const FAMILY_SKILL_TREE = Object.freeze({
    lineage: {
        label: 'Linhagem',
        children: ['genetic_stability', 'trait_inheritance', 'gene_pool']
    },
    cooperation: {
        label: 'Cooperação Familiar',
        children: ['kin_recognition', 'shared_alerts', 'resource_sharing']
    },
    diplomacy: {
        label: 'Diplomacia',
        children: ['trust', 'alliance_discount', 'reputation']
    }
});

export const SKILL_RULES = Object.freeze({
    individualMaxRank: 5,
    familyMaxRank: 5,
    prerequisiteRequired: true,
    payToWin: false
});
