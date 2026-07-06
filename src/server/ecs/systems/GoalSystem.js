class GoalSystem {
    update(agent) {
        const bb = agent.blackboard;
        if (!bb) return;

        const hunger = agent.needs.hunger || 0;
        const fear = agent.needs.fear || 0;
        const stress = agent.needs.stress || 0;
        const caution = agent.strategy.caution || 50;
        const aggression = agent.strategy.aggression || 50;
        const curiosity = agent.strategy.curiosity || 50;
        const greed = agent.strategy.greed || 50;

        // 1. Avalia os scores para os objetivos
        // FLEE Score: Depende do Medo, Estresse e Cautela
        const fleeScore = (fear * 1.5) + (stress * 0.5) + (caution * 0.3);

        // FEED Score: Depende da Fome e Ganância
        const feedScore = (hunger * 1.2) + (greed * 0.2);

        // HUNT Score: Depende de Agressividade, Fome baixa e presença de presas detectadas
        const hasPrey = Array.isArray(bb.knownPrey) && bb.knownPrey.length > 0;
        const huntScore = hasPrey ? (aggression * 1.0) - (hunger * 0.5) : 0;

        // EXPLORE Score: Pontuação base fixa mais curiosidade
        const exploreScore = 25 + (curiosity * 0.2);

        // 2. Seleciona a melhor diretriz de objetivo
        let bestGoal = 'EXPLORE';
        let maxScore = exploreScore;

        if (fleeScore > maxScore) {
            maxScore = fleeScore;
            bestGoal = 'FLEE';
        }
        if (feedScore > maxScore) {
            maxScore = feedScore;
            bestGoal = 'FEED';
        }
        if (huntScore > maxScore) {
            maxScore = huntScore;
            bestGoal = 'HUNT';
        }

        bb.currentGoal = bestGoal;

        // 3. Define o estado emocional do agente
        if (fear > 50) {
            bb.emotionalState = 'PANIC';
        } else if (fear > 10 || stress > 60) {
            bb.emotionalState = 'ANXIOUS';
        } else if (bestGoal === 'HUNT' && aggression > 60) {
            bb.emotionalState = 'AGGRESSIVE';
        } else {
            bb.emotionalState = 'CALM';
        }
    }
}

export default GoalSystem;
