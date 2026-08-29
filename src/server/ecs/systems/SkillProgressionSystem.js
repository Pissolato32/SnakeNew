import { INDIVIDUAL_SKILL_TREE, FAMILY_SKILL_TREE, SKILL_RULES } from '../../../shared/SkillTree.js';

class SkillProgressionSystem {
    award(agent, points = 1) {
        if (!agent || agent.isDead || points <= 0) return;
        agent.skills = agent.skills || { individual: { points: 0, unlocked: [] }, family: { points: 0, unlocked: [] } };
        agent.skills.individual.points = (agent.skills.individual.points || 0) + points;
    }

    unlock(agent, tree, skillId) {
        const branch = tree === 'family' ? FAMILY_SKILL_TREE : INDIVIDUAL_SKILL_TREE;
        const target = Object.values(branch).find(node => node.children.includes(skillId));
        if (!target) return false;
        const bucket = tree === 'family' ? agent.skills.family : agent.skills.individual;
        if (bucket.unlocked.includes(skillId)) return false;
        const rank = bucket.unlocked.length + 1;
        if (rank > SKILL_RULES.individualMaxRank) return false;
        const cost = rank;
        if ((bucket.points || 0) < cost) return false;
        bucket.points -= cost;
        bucket.unlocked.push(skillId);
        return true;
    }
}

export default SkillProgressionSystem;
