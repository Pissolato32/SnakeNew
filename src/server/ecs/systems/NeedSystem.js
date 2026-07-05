class NeedSystem {
    update(agents, deltaTime = 1) {
        const agentList = Array.isArray(agents) ? agents : [agents];

        for (const agent of agentList) {
            // Fome aumenta com o tempo, baseada na massa e fadiga
            agent.needs.hunger += (0.05 * (agent.maxLength / 50) * (1 + (agent.needs.fatigue / 100))) * deltaTime;
            if (agent.needs.hunger > 100) agent.needs.hunger = 100;

            // Se usar boost, gasta energia e ganha fadiga
            if (agent.isBoosting) {
                agent.needs.energy -= 1 * deltaTime;
                agent.needs.fatigue += 0.1 * deltaTime;
                if (agent.needs.energy <= 0) {
                    agent.needs.energy = 0;
                    agent.isBoosting = false; // Força parada
                }
                if (agent.needs.fatigue > 100) agent.needs.fatigue = 100;
            } else {
                // Recupera energia lentamente
                agent.needs.energy += (0.5 - (agent.needs.fatigue * 0.002)) * deltaTime;
                if (agent.needs.energy > 100) agent.needs.energy = 100;

                // Fadiga desce muito devagar se parado
                agent.needs.fatigue -= 0.05 * deltaTime;
                if (agent.needs.fatigue < 0) agent.needs.fatigue = 0;
            }

            // Estresse base cai se não houver medo.
            if (agent.needs.fear === 0) {
                agent.needs.stress -= 0.1 * deltaTime;
                if (agent.needs.stress < 0) agent.needs.stress = 0;
            }
        }
    }
}

export default NeedSystem;
