import AllianceSystem from './AllianceSystem.js';

describe('AllianceSystem', () => {
    test('creates symmetric alliance and expires when one side cannot pay', () => {
        const system = new AllianceSystem();
        const alliance = system.propose('A', 'B', { maintenance: 10, durationMs: 60000 });
        expect(system.get('B', 'A')).toBe(alliance);
        const balances = system.tick({ A: 20, B: 5 });
        expect(alliance.active).toBe(false);
        expect(balances.A).toBe(20);
        expect(balances.B).toBe(5);
    });

    test('trust can dissolve an alliance', () => {
        const system = new AllianceSystem();
        system.propose('A', 'B');
        system.adjustTrust('A', 'B', -0.5);
        expect(system.get('A', 'B').trust).toBe(0);
        expect(system.get('A', 'B').active).toBe(false);
    });
});
