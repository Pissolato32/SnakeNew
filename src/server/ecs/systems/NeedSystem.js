class NeedSystem {
    update(agent) {
        // Fome aumenta com o tempo, baseada na massa e fadiga
        // Taxa base mais perceptível: cobra de tamanho 10 ganha ~0.5 hunger/s
        const hungerRate = 0.3 + (agent.maxLength / 100) * 0.2;
        agent.needs.hunger += hungerRate * (1 + (agent.needs.fatigue / 200));
        if (agent.needs.hunger > 100) agent.needs.hunger = 100;

        // Se usar boost, gasta energia e ganha fadiga
        if (agent.isBoosting) {
            agent.needs.energy -= 1.5;
            agent.needs.fatigue += 0.3;
            if (agent.needs.energy <= 0) {
                agent.needs.energy = 0;
                agent.isBoosting = false; // Força parada
            }
            if (agent.needs.fatigue > 100) agent.needs.fatigue = 100;
        } else {
            // Recupera energia lentamente (mais lento se faminto)
            const hungerPenalty = agent.needs.hunger > 50 ? (agent.needs.hunger - 50) / 100 : 0;
            agent.needs.energy += (0.3 - hungerPenalty) - (agent.needs.fatigue * 0.002);
            if (agent.needs.energy > 100) agent.needs.energy = 100;
            if (agent.needs.energy < 0) agent.needs.energy = 0;

            // Fadiga desce mais rápido se energia alta
            agent.needs.fatigue -= 0.08;
            if (agent.needs.fatigue < 0) agent.needs.fatigue = 0;
        }

        // Estresse base cai se não houver medo.
        if (agent.needs.fear === 0) {
            agent.needs.stress -= 0.1;
            if (agent.needs.stress < 0) agent.needs.stress = 0;
        }

        // Atualiza estatísticas de pico
        if (agent.stats) {
            agent.stats.maxHungerReached = Math.max(agent.stats.maxHungerReached || 0, agent.needs.hunger);
            agent.stats.maxStressReached = Math.max(agent.stats.maxStressReached || 0, agent.needs.stress);
            agent.stats.maxFearReached = Math.max(agent.stats.maxFearReached || 0, agent.needs.fear);
            agent.stats.maxFatigueReached = Math.max(agent.stats.maxFatigueReached || 0, agent.needs.fatigue);
        }
    }
}

export default NeedSystem;
