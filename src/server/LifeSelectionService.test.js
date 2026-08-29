import LifeSelectionService from './LifeSelectionService.js';

describe('LifeSelectionService', () => {
    const agents = {
        a: { id: 'a', persistentId: 'life-aaa111', nickname: 'Alpha', token: 'token-123', isBot: false, isDead: false, isOnline: false, isOffline: true, controller: 'AI', familyId: 'family-a', broodId: 'brood-a', generation: 1 },
        b: { id: 'b', persistentId: 'life-bbb222', nickname: 'Beta', token: 'token-123', isBot: false, isDead: false, isOnline: true, isOffline: false, controller: 'HUMAN', familyId: 'family-a', broodId: 'brood-a', generation: 1 },
        c: { id: 'c', persistentId: 'life-ccc333', nickname: 'Bot', token: 'token-other', isBot: true, isDead: false, isOnline: false, isOffline: false, controller: 'AI', familyId: 'family-b', broodId: 'brood-b', generation: 1 }
    };

    test('lists only living player-owned lives for a valid credential', () => {
        const lives = LifeSelectionService.listLives(agents, { token: 'token-123' });
        expect(lives.map((life) => life.persistentId)).toEqual(['life-aaa111', 'life-bbb222']);
        expect(lives.find((life) => life.persistentId === 'life-aaa111').isOffline).toBe(true);
    });

    test('never lists lives without a credential', () => {
        expect(LifeSelectionService.listLives(agents, {})).toEqual([]);
    });

    test('finds a specific life only when persistent id and credential match', () => {
        expect(LifeSelectionService.findOwnedLife(agents, 'life-aaa111', 'token-123')).toBe(agents.a);
        expect(LifeSelectionService.findOwnedLife(agents, 'life-aaa111', 'wrong')).toBeNull();
        expect(LifeSelectionService.findOwnedLife(agents, 'life-ccc333', 'token-other')).toBeNull();
    });
});
