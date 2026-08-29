import { sameFamily } from '../../../shared/LifeModel.js';
import { clampRelation, canCooperate } from '../../../shared/SocialModel.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

class RelationshipSystem {
    score(agent, other) {
        if (!agent || !other || agent === other) return 0;
        if (!sameFamily(agent, other)) return 0;

        const kinship = agent.broodId && other.broodId && agent.broodId === other.broodId ? 1 : 0.75;
        const focus = ((agent.focus?.cooperation ?? 3) - 1) / 4;
        const trait = clamp((agent.traitWeights?.cooperation ?? 0) + 0.5);
        const genetic = this.geneticCompatibility(agent, other);
        const reputation = clamp(agent.blackboard?.familyReputation?.[other.persistentId] ?? 0.5);
        return clamp(kinship * 0.30 + focus * 0.25 + trait * 0.20 + genetic * 0.15 + reputation * 0.10);
    }

    familyRelation(agent, other, socialState = {}) {
        if (!sameFamily(agent, other)) return null;
        const trust = clampRelation(socialState.trust ?? 0);
        return { type: 'family', cooperation: this.score(agent, other), trust, canCooperate: canCooperate({ trust }) };
    }

    geneticCompatibility(a, b) {
        const genesA = new Set(a.genes || []);
        const genesB = new Set(b.genes || []);
        const union = new Set([...genesA, ...genesB]);
        if (!union.size) return 0.5;
        let shared = 0;
        for (const gene of genesA) if (genesB.has(gene)) shared++;
        return shared / union.size;
    }

    update(agent, context = {}) {
        if (!agent || agent.isDead) return;
        const allies = agent.blackboard?.knownAllies || [];
        agent.relationships = agent.relationships || {};
        for (const other of allies) {
            const socialState = context.relations?.[other.familyId] || {};
            agent.relationships[other.persistentId || other.id] = this.familyRelation(agent, other, socialState) || {
                type: 'other', cooperation: 0, trust: clampRelation(socialState.trust ?? 0), canCooperate: false
            };
        }
        return agent.relationships;
    }
}

export default RelationshipSystem;
