import { INDIVIDUAL_SKILL_TREE, FAMILY_SKILL_TREE, SKILL_RULES } from '../../../shared/SkillTree.js';

class SkillProgressionSystem {
    award(agent, points = 1) {
        if (!agent || agent.isDead || points <= 0) return;
        agent.skills = agent.skills || { individual: { points: 0, unlocked: [] }, family: { points: 0, unlocked: [] } };
        agent.skills.individual.points = (agent.skills.individual.points || 0) + points;
    }

    awardFamily(family, points = 1) {
        if (!family || points <= 0) return;
        family.skills = family.skills || { points: 0, unlocked: [] };
        family.skills.points = (family.skills.points || 0) + points;
    }

    unlock(agent, tree, skillId) {
        if (!agent?.skills) return false;
        const isFamily = tree === 'family';
        const branch = isFamily ? FAMILY_SKILL_TREE : INDIVIDUAL_SKILL_TREE;
        const target = Object.values(branch).find(node => node.children.includes(skillId));
        if (!target) return false;
        const bucket = isFamily ? agent.skills.family : agent.skills.individual;
        if (!bucket || bucket.unlocked.includes(skillId)) return false;
        const maxRank = isFamily ? SKILL_RULES.familyMaxRank : SKILL_RULES.individualMaxRank;
        if (bucket.unlocked.length >= maxRank) return false;
        if (SKILL_RULES.prerequisiteRequired && target.children.indexOf(skillId) > 0) {
            const previous = target.children[target.children.indexOf(skillId) - 1];
            if (!bucket.unlocked.includes(previous)) return false;
        }
        const cost = bucket.unlocked.length + 1;
        if ((bucket.points || 0) < cost) return false;
        bucket.points -= cost;
        bucket.unlocked.push(skillId);
        return true;
    }
}

export default SkillProgressionSystem;
