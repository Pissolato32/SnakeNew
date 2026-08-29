import { createAccount, registerLife, selectLife, getLifeSlotLimit } from './AccountModel.js';

describe('AccountModel', () => {
    test('free accounts have three life slots', () => {
        const account = createAccount({ accountId: 'a', familyId: 'f' });
        expect(getLifeSlotLimit(account.plan)).toBe(3);
        registerLife(account, 'w1');
        registerLife(account, 'w2');
        registerLife(account, 'w3');
        expect(() => registerLife(account, 'w4')).toThrow('life slot limit reached');
    });

    test('premium accounts have ten life slots and can select one', () => {
        const account = createAccount({ accountId: 'a', familyId: 'f', plan: 'premium' });
        for (let i = 1; i <= 10; i++) registerLife(account, `w${i}`);
        expect(account.lifePersistentIds).toHaveLength(10);
        selectLife(account, 'w7');
        expect(account.selectedPersistentId).toBe('w7');
    });
});
