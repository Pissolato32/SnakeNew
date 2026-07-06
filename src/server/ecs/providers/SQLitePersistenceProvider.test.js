import SQLitePersistenceProvider from './SQLitePersistenceProvider.js';
import Logger from '../../../shared/Logger.js';

describe('SQLitePersistenceProvider', () => {
    let provider;
    let logger;

    beforeEach(() => {
        logger = new Logger('silent');
        // Usar banco em memória para evitar alterar arquivos locais no ambiente de teste
        provider = new SQLitePersistenceProvider(logger, ':memory:');
    });

    afterEach(() => {
        if (provider) {
            provider.close();
        }
    });

    test('should save and load empty state successfully', async () => {
        const state = {
            timestamp: 123456789,
            agents: []
        };

        await provider.saveState(state);
        const loaded = await provider.loadState();

        expect(loaded).not.toBeNull();
        expect(loaded.timestamp).toBe(123456789);
        expect(loaded.agents.length).toBe(0);
    });

    test('should save and restore agent state with nested objects', async () => {
        const agent = {
            id: 'socket-123',
            nickname: 'SnakeTest',
            isBot: false,
            token: 'secure_token_abc',
            isOffline: true,
            offlineSince: 999999,
            x: 100.5,
            y: 200.75,
            angle: 1.5,
            color: '#ff0000',
            skin: 'neon',
            maxLength: 60,
            radius: 12,
            strategy: { aggression: 70, caution: 30, greed: 90, curiosity: 50 },
            needs: { hunger: 20, energy: 80, stress: 10, fear: 0, fatigue: 5 },
            blackboard: { currentGoal: 'FEED' },
            stats: { age: 100, kills: 2 }
        };

        const state = {
            timestamp: 123456789,
            agents: [agent]
        };

        await provider.saveState(state);
        const loaded = await provider.loadState();

        expect(loaded).not.toBeNull();
        expect(loaded.timestamp).toBe(123456789);
        expect(loaded.agents.length).toBe(1);

        const restored = loaded.agents[0];
        expect(restored.id).toBe(agent.id);
        expect(restored.nickname).toBe(agent.nickname);
        expect(restored.isBot).toBe(false);
        expect(restored.isOffline).toBe(true);
        expect(restored.offlineSince).toBe(agent.offlineSince);
        expect(restored.x).toBe(agent.x);
        expect(restored.y).toBe(agent.y);
        expect(restored.angle).toBe(agent.angle);
        expect(restored.maxLength).toBe(agent.maxLength);
        expect(restored.radius).toBe(agent.radius);
        
        expect(restored.strategy).toEqual(agent.strategy);
        expect(restored.needs).toEqual(agent.needs);
        expect(restored.blackboard).toEqual(agent.blackboard);
        expect(restored.stats).toEqual(agent.stats);
    });

    test('should prune agents no longer present in saved state', async () => {
        const agentA = { id: 'agent-A', nickname: 'A', isBot: true, strategy: {}, needs: {}, blackboard: {}, stats: {} };
        const agentB = { id: 'agent-B', nickname: 'B', isBot: true, strategy: {}, needs: {}, blackboard: {}, stats: {} };

        await provider.saveState({
            timestamp: 100,
            agents: [agentA, agentB]
        });

        // Save state again with only agentA
        await provider.saveState({
            timestamp: 200,
            agents: [agentA]
        });

        const loaded = await provider.loadState();
        expect(loaded.agents.length).toBe(1);
        expect(loaded.agents[0].id).toBe('agent-A');
    });
});
