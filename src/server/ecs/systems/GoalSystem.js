class GoalSystem {
    update(agent) {
        const bb = agent.blackboard;
        if (!bb || agent.isDead || agent.controller !== 'AI') return;

        const hunger = agent.needs.hunger || 0;
        const fear = agent.needs.fear || 0;
        const stress = agent.needs.stress || 0;
        const caution = agent.strategy.caution || 50;
        const aggression = agent.strategy.aggression || 50;
        const curiosity = agent.strategy.curiosity || 50;
        const greed = agent.strategy.greed || 50;
        const focus = agent.focus || {};
        const focusSafety = 0.5 + ((focus.safety ?? 3) / 5);
        const focusFood = 0.5 + ((focus.food ?? 3) / 5);
        const focusCombat = 0.5 + ((focus.combat ?? 3) / 5);
        const focusExploration = 0.5 + ((focus.exploration ?? 3) / 5);

        const fleeScore = ((fear * 1.5) + (stress * 0.5) + (caution * 0.3)) * focusSafety;
        const feedScore = ((hunger * 1.2) + (greed * 0.2)) * focusFood;
        const hasPrey = Array.isArray(bb.knownPrey) && bb.knownPrey.length > 0;
        const huntScore = hasPrey ? ((aggression * 1.0) - (hunger * 0.5)) * focusCombat : 0;
        const exploreScore = (25 + (curiosity * 0.2)) * focusExploration;

        let bestGoal = 'EXPLORE';
        let maxScore = exploreScore;
        if (fleeScore > maxScore) { maxScore = fleeScore; bestGoal = 'FLEE'; }
        if (feedScore > maxScore) { maxScore = feedScore; bestGoal = 'FEED'; }
        if (huntScore > maxScore) { maxScore = huntScore; bestGoal = 'HUNT'; }

        bb.currentGoal = bestGoal;
        if (bestGoal !== 'FEED') bb.targetFoodId = null;
        if (bestGoal !== 'HUNT') bb.targetPreyId = null;

        if (fear > 50) bb.emotionalState = 'PANIC';
        else if (fear > 10 || stress > 60) bb.emotionalState = 'ANXIOUS';
        else if (bestGoal === 'HUNT' && aggression > 60) bb.emotionalState = 'AGGRESSIVE';
        else bb.emotionalState = 'CALM';
    }
}

export default GoalSystem;
