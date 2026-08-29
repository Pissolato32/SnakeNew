const GENE_MODIFIERS = Object.freeze({
    metabolism_efficient: { energyDrain: -0.03 },
    metabolism_fast: { energyDrain: 0.03 },
    danger_sense: { fearGain: -0.04 },
    resilient: { stressGain: -0.03 },
    swift: { speed: 0.04 },
    heavy: { speed: -0.03 }
});

const TRAIT_EFFECTS = Object.freeze({
    cooperative: { cooperation: 0.15 },
    patient: { caution: 0.10 },
    attentive: { curiosity: 0.05 },
    coward: { caution: 0.20, aggression: -0.10 },
    greedy: { greed: 0.15 },
    impulsive: { aggression: 0.15, caution: -0.10 },
    territorial: { aggression: 0.10 },
    aggressive: { aggression: 0.20 }
});

class GeneticsSystem {
    apply(agent) {
        if (!agent || agent.isDead) return;
        const modifiers = { energyDrain: 0, fearGain: 0, stressGain: 0, speed: 0 };
        for (const gene of agent.genes || []) {
            const effect = GENE_MODIFIERS[gene];
            if (!effect) continue;
            for (const key of Object.keys(modifiers)) modifiers[key] += effect[key] || 0;
        }
        agent.geneticModifiers = Object.fromEntries(Object.entries(modifiers).map(([k, v]) => [k, Math.max(-0.10, Math.min(0.10, v))]));

        const traitWeights = { aggression: 0, caution: 0, curiosity: 0, greed: 0, cooperation: 0 };
        for (const trait of agent.traits || []) {
            const effect = TRAIT_EFFECTS[trait];
            if (!effect) continue;
            for (const key of Object.keys(traitWeights)) traitWeights[key] += effect[key] || 0;
        }
        agent.traitWeights = traitWeights;
        return { geneticModifiers: agent.geneticModifiers, traitWeights };
    }
}

export { GENE_MODIFIERS, TRAIT_EFFECTS };
export default GeneticsSystem;
