import AccountLifeService from './AccountLifeService.js';

describe('AccountLifeService', () => {
    test('creates a free account and enforces three life slots', () => {
        const service = new AccountLifeService();
        const token = 'free-account-token';
        const account = service.getOrCreateAccount(token);
        expect(account.plan).toBe('FREE');
        expect(service.canCreateLife(token)).toBe(true);
        service.registerLife(token, 'worm-1');
        service.registerLife(token, 'worm-2');
        service.registerLife(token, 'worm-3');
        expect(service.canCreateLife(token)).toBe(false);
        expect(() => service.registerLife(token, 'worm-4')).toThrow('life slot limit reached');
    });

    test('selects only a life owned by the account', () => {
        const service = new AccountLifeService();
        const token = 'account-token';
        service.registerLife(token, 'worm-1');
        expect(service.selectLife(token, 'worm-1').selectedPersistentId).toBe('worm-1');
        expect(() => service.selectLife(token, 'worm-2')).toThrow('life does not belong to account');
    });

    test('serializes slot capacity without exposing the credential', () => {
        const service = new AccountLifeService();
        const account = service.getOrCreateAccount('secret-token');
        const serialized = service.serialize(account);
        expect(serialized.lifeSlotLimit).toBe(3);
        expect(serialized).not.toHaveProperty('token');
    });
});
