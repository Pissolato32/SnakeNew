import AllianceSystem from './AllianceSystem.js';

describe('AllianceSystem social integration', () => {
    test('creates symmetric alliance and expires when one side cannot pay', () => {
        const system = new AllianceSystem();
        const alliance = system.propose('A', 'B', { maintenance: 10, durationMs: 60000 });
        expect(system.get('B', 'A')).toBe(alliance);
        const balances = system.tick({ A: 20, B: 5 });
        expect(alliance.active).toBe(false);
        expect(balances.A).toBe(20);
        expect(balances.B).toBe(5);
    });

    test('maintenance is charged symmetrically when both sides can pay', () => {
        const system = new AllianceSystem();
        system.propose('A', 'B', { maintenance: 10, durationMs: 60000 });
        const balances = system.tick({ A: 20, B: 20 });
        expect(balances.A).toBe(10);
        expect(balances.B).toBe(10);
        expect(system.get('A', 'B').active).toBe(true);
    });

    test('trust can dissolve an alliance', () => {
        const system = new AllianceSystem();
        system.propose('A', 'B');
        system.adjustTrust('A', 'B', -0.5);
        expect(system.get('A', 'B').trust).toBe(0);
        expect(system.get('A', 'B').active).toBe(false);
    });
});
