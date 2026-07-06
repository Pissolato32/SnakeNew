import WorldManager from './WorldManager.js';
import Logger from '../shared/Logger.js';

describe('WorldManager', () => {
    let ioMock;
    let worldManager;
    let mockRegion;
    let mockSocket;
    let mockAgent;
    let agentsMap;
    
    // Manual spy arrays
    let joinCalls;
    let emitCalls;
    let addAgentCalls;
    let tickCalled;
    let simulateCalls;
    let handleStrategyInputCalls;
    let saveStateCalls;
    let onCalls;
    let toCalls;
    let ioEmitCalls;

    beforeEach(() => {
        joinCalls = [];
        emitCalls = [];
        addAgentCalls = [];
        tickCalled = 0;
        simulateCalls = [];
        handleStrategyInputCalls = [];
        saveStateCalls = [];
        onCalls = [];
        toCalls = [];
        ioEmitCalls = [];

        // Mock socket
        mockSocket = {
            id: 'socket-123',
            join: (room) => { joinCalls.push(room); },
            emit: (ev, val) => { emitCalls.push({ ev, val }); }
        };

        mockAgent = {
            id: 'socket-123',
            nickname: 'Test Snake',
            isBot: false,
            isOffline: false,
            handleStrategyInput: (d) => { handleStrategyInputCalls.push(d); }
        };

        agentsMap = { 'socket-123': mockAgent };

        // Mock region
        mockRegion = {
            id: 'A',
            isReady: true,
            addAgent: (s, data) => { addAgentCalls.push({ s, data }); },
            getSnapshot: () => ({ agents: [] }),
            tick: () => { tickCalled++; },
            simulateOfflineProgression: (dt) => { simulateCalls.push(dt); },
            agentManager: {
                getAgents: () => agentsMap
            },
            persistenceSystem: {
                saveState: (agents) => { saveStateCalls.push(agents); }
            }
        };

        // Mock io object
        ioMock = {
            on: (ev, cb) => { onCalls.push({ ev, cb }); },
            to: (room) => { toCalls.push(room); return ioMock; },
            emit: (ev, val) => { ioEmitCalls.push({ ev, val }); },
            sockets: {
                sockets: new Map() // By default, no active sockets
            }
        };

        worldManager = new WorldManager(ioMock);
        // Inject mock region into regions map
        worldManager.regions.set('A', mockRegion);
    });

    test('should start and setup socket listeners and pre-create region A', () => {
        worldManager.start();
        expect(onCalls).toHaveLength(1);
        expect(onCalls[0].ev).toBe('connection');
        expect(worldManager.regions.has('A')).toBe(true);
    });

    test('should findOrCreateRegion, add socket to map and region', () => {
        const strategistData = { nickname: 'Test Snake' };
        worldManager.findOrCreateRegion(mockSocket, strategistData);

        expect(worldManager.socketToRegionMap.get('socket-123')).toBe('A');
        expect(addAgentCalls).toHaveLength(1);
        expect(addAgentCalls[0].s).toBe(mockSocket);
        expect(addAgentCalls[0].data).toBe(strategistData);
        expect(joinCalls).toContain('A');
    });

    test('should findAgentBySocketId in O(1)', () => {
        // Mock that socket is mapped to Region A
        worldManager.socketToRegionMap.set('socket-123', 'A');

        const agent = worldManager.findAgentBySocketId('socket-123');
        expect(agent).toBeDefined();
        expect(agent.nickname).toBe('Test Snake');

        // Not mapped socket should return null
        expect(worldManager.findAgentBySocketId('invalid')).toBeNull();
    });

    test('should handleDisconnect, mark agent offline, save state and clean socket map', () => {
        worldManager.socketToRegionMap.set('socket-123', 'A');
        const agent = mockRegion.agentManager.getAgents()['socket-123'];

        worldManager.handleDisconnect(mockSocket);

        expect(agent.isOffline).toBe(true);
        expect(agent.offlineSince).toBeDefined();
        expect(saveStateCalls).toHaveLength(1);
        expect(worldManager.socketToRegionMap.has('socket-123')).toBe(false);
    });

    test('should handleInput and forward to the agent', () => {
        worldManager.socketToRegionMap.set('socket-123', 'A');

        const inputData = { some: 'strategy' };
        worldManager.handleInput(mockSocket, inputData);

        expect(handleStrategyInputCalls).toHaveLength(1);
        expect(handleStrategyInputCalls[0]).toBe(inputData);
    });

    test('should put world to sleep if no active connections, and trigger offline progression', () => {
        // No active connections: ioMock.sockets.sockets is empty Map (already default)
        worldManager.lastBackgroundTick = Date.now() - 6000; // 6 seconds ago

        worldManager.tick();

        expect(worldManager.isSleeping).toBe(true);
        expect(saveStateCalls).toHaveLength(1);
        expect(simulateCalls).toHaveLength(1);
    });

    test('should wake up simulation when active connections exist, and tick normally', () => {
        // Simulate active connection
        ioMock.sockets.sockets.set('socket-123', mockSocket);
        worldManager.isSleeping = true;

        worldManager.tick();

        expect(worldManager.isSleeping).toBe(false);
        expect(tickCalled).toBe(1);
    });

    test('should send snapshots to active regions', () => {
        ioMock.sockets.sockets.set('socket-123', mockSocket);
        worldManager.isSleeping = false;

        worldManager.sendSnapshots();

        expect(toCalls).toContain('A');
        expect(ioEmitCalls).toHaveLength(1);
        expect(ioEmitCalls[0].ev).toBe('snapshot');
        expect(ioEmitCalls[0].val).toEqual({ agents: [] });
    });
});
