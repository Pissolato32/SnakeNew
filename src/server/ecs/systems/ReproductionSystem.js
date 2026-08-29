import { createWormIdentity } from '../../../shared/FamilyModel.js';
import { getAgentModifiers } from '../../../shared/SkillEffects.js';

const TRAITS = ['cooperative', 'patient', 'attentive', 'coward', 'greedy', 'impulsive', 'territorial', 'aggressive'];
const GENES = ['metabolism_efficient', 'metabolism_fast', 'danger_sense', 'resilient', 'swift', 'heavy'];

const choose = (items, fallback) => items.length ? items[Math.floor(Math.random() * items.length)] : fallback;

class ReproductionSystem {
    canReproduce(parent) {
        if (!parent || parent.isDead) return false;
        const mod = getAgentModifiers(parent);
        const reproMod = Math.max(0, Math.min(0.3, mod.reproduction || 0));
        const minLength = Math.max(35, 40 - Math.round(reproMod * 15));
        const minEnergy = Math.max(60, 70 - Math.round(reproMod * 20));
        const maxHunger = Math.min(50, 40 + Math.round(reproMod * 20));
        return Boolean(parent.maxLength >= minLength && (parent.needs?.energy ?? 0) >= minEnergy && (parent.needs?.hunger ?? 100) <= maxHunger);
    }

    inherit(parentA, parentB, mutationRate = 0.05) {
        if (!parentA || !parentB) throw new Error('two parents are required');
        if (parentA.familyId !== parentB.familyId) throw new Error('parents must belong to the same family');
        const genes = this.inheritValues(parentA.genes || [], parentB.genes || [], GENES, mutationRate);
        const traits = this.inheritValues(parentA.traits || [], parentB.traits || [], TRAITS, mutationRate);
        return { genes, traits };
    }

    createOffspring(parentA, parentB, { broodId = null, mutationRate = 0.05, isBot = true } = {}) {
        if (!this.canReproduce(parentA) || !this.canReproduce(parentB)) throw new Error('parents are not eligible to reproduce');
        const identity = createWormIdentity({ familyId: parentA.familyId, isBot, broodId, generation: Math.max(parentA.generation || 1, parentB.generation || 1) + 1 });
        const inherited = this.inherit(parentA, parentB, mutationRate);
        return { ...identity, parents: [parentA.persistentId, parentB.persistentId], genes: inherited.genes, traits: inherited.traits };
    }

    inheritValues(valuesA, valuesB, universe, mutationRate) {
        const pool = [...new Set([...valuesA, ...valuesB])];
        const selected = [];
        const count = Math.max(1, Math.min(3, pool.length || 1));
        for (let i = 0; i < count; i++) {
            const candidate = choose(pool, choose(universe, null));
            if (candidate && !selected.includes(candidate)) selected.push(candidate);
        }
        if (Math.random() < mutationRate) {
            const mutation = choose(universe, null);
            if (mutation && !selected.includes(mutation)) selected[Math.floor(Math.random() * selected.length)] = mutation;
        }
        return selected;
    }
}

export default ReproductionSystem;
