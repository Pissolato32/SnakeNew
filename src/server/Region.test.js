import Region from './Region.js';
import Logger from '../shared/Logger.js';

describe('Region', () => {
    let ioMock;
    let logger;

    beforeEach(() => {
        logger = new Logger('silent');
        ioMock = {
            to: () => ioMock,
            emit: () => {},
            sockets: {
                sockets: new Map()
            }
        };
    });

    test('should initialize region and mock bots successfully', async () => {
        const region = new Region('A', ioMock, logger);
        // Wait a tiny bit for the async initializeWorld to finish
        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(region.id).toBe('A');
        expect(region.isReady).toBe(true);
        expect(Object.keys(region.agentManager.getAgents()).length).toBeGreaterThan(0);
    });

    test('should run simulateOfflineProgression correctly', async () => {
        const region = new Region('A', ioMock, logger);
        await new Promise(resolve => setTimeout(resolve, 50));

        const initialAgents = Object.values(region.agentManager.getAgents());
        const targetAgent = initialAgents[0];
        const oldX = targetAgent.x;
        const oldY = targetAgent.y;

        // Mock Math.random to ensure deterministic behavior (skip random feeding)
        const originalRandom = Math.random;
        Math.random = () => 1.0;

        try {
            region.simulateOfflineProgression(5);
        } finally {
            Math.random = originalRandom;
        }

        expect(targetAgent.x).not.toBe(oldX);
        expect(targetAgent.y).not.toBe(oldY);
        expect(targetAgent.needs.hunger).toBeGreaterThan(0);
    });
});
