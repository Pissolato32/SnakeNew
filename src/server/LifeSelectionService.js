class LifeSelectionService {
    static listLives(agents, { token } = {}) {
        if (!token) return [];
        return Object.values(agents)
            .filter((agent) => !agent.isBot && !agent.isDead && agent.token === token)
            .map((agent) => ({
                persistentId: agent.persistentId,
                nickname: agent.nickname,
                familyId: agent.familyId,
                broodId: agent.broodId,
                generation: agent.generation,
                controller: agent.controller,
                isOnline: Boolean(agent.isOnline),
                isOffline: Boolean(agent.isOffline)
            }));
    }

    static findOwnedLife(agents, persistentId, token) {
        if (!persistentId || !token) return null;
        return Object.values(agents).find((agent) =>
            !agent.isBot && !agent.isDead && agent.persistentId === persistentId && agent.token === token
        ) || null;
    }
}

export default LifeSelectionService;
