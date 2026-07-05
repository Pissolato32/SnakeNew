import PersistenceSystem from './PersistenceSystem.js';
import Logger from '../../../shared/Logger.js';

describe('PersistenceSystem', () => {
    let logger;
    let mockProvider;

    beforeEach(() => {
        logger = new Logger('silent');
        mockProvider = {
            saveState: async (data) => {
                mockProvider.saveState.calls.push(data);
            },
            loadState: async () => {
                mockProvider.loadState.calledTimes++;
                return { agents: [] };
            }
        };
        mockProvider.saveState.calls = [];
        mockProvider.loadState.calledTimes = 0;
    });

    test('should save agent state successfully without circular reference issues', async () => {
        const system = new PersistenceSystem(logger, mockProvider);
        const agents = {
            'player-1': {
                id: 'player-1',
                nickname: 'Test Snake',
                isBot: false,
                x: 100,
                y: 200,
                maxLength: 35,
                strategy: { aggression: 0.8 },
                needs: { hunger: 10 },
                blackboard: { currentGoal: 'HUNT' }
            }
        };

        await system.saveState(agents);

        expect(mockProvider.saveState.calls).toHaveLength(1);
        const savedData = mockProvider.saveState.calls[0];
        expect(savedData.agents).toHaveLength(1);
        expect(savedData.agents[0].id).toBe('player-1');
        expect(savedData.agents[0].isBot).toBe(false);
        expect(savedData.agents[0].blackboard.currentGoal).toBe('HUNT');
    });

    test('should load agent state successfully', async () => {
        const system = new PersistenceSystem(logger, mockProvider);
        const result = await system.loadState();

        expect(mockProvider.loadState.calledTimes).toBe(1);
        expect(result).toEqual({ agents: [] });
    });
});
