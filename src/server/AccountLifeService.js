import { createAccount, registerLife, selectLife, getLifeSlotLimit } from '../shared/AccountModel.js';
import { createFamily } from '../shared/FamilyModel.js';

class AccountLifeService {
    constructor() {
        this.accountsByToken = new Map();
        this.familyById = new Map();
    }

    getOrCreateAccount(token, familyId = null) {
        if (!token) return null;
        let account = this.accountsByToken.get(token);
        if (!account) {
            const family = createFamily({ familyId: familyId || null });
            this.familyById.set(family.familyId, family);
            account = createAccount({ accountId: `account_${token.slice(0, 12)}`, plan: 'FREE', familyId: family.familyId });
            this.accountsByToken.set(token, account);
        }
        return account;
    }

    registerLife(token, persistentId, familyId = null) {
        const account = this.getOrCreateAccount(token, familyId);
        registerLife(account, persistentId);
        return account;
    }

    selectLife(token, persistentId) {
        const account = this.getOrCreateAccount(token);
        selectLife(account, persistentId);
        return account;
    }

    canCreateLife(token) {
        const account = this.getOrCreateAccount(token);
        return account.lifePersistentIds.length < getLifeSlotLimit(account.plan);
    }

    getAccount(token) {
        return token ? this.accountsByToken.get(token) || null : null;
    }

    getFamily(familyId) {
        return this.familyById.get(familyId) || null;
    }

    serialize(account) {
        if (!account) return null;
        return {
            accountId: account.accountId,
            plan: account.plan,
            familyId: account.familyId,
            selectedPersistentId: account.selectedPersistentId,
            lifePersistentIds: [...account.lifePersistentIds],
            lifeSlotLimit: getLifeSlotLimit(account.plan)
        };
    }
}

export default AccountLifeService;
