export const FREE_LIFE_SLOTS = 3;
export const PREMIUM_LIFE_SLOTS = 10;

export function getLifeSlotLimit(plan = 'FREE') {
    return String(plan).toUpperCase() === 'PREMIUM' ? PREMIUM_LIFE_SLOTS : FREE_LIFE_SLOTS;
}

export function createAccount({ accountId, plan = 'FREE', familyId } = {}) {
    if (!accountId) throw new Error('accountId is required');
    if (!familyId) throw new Error('familyId is required');
    return {
        accountId,
        plan: String(plan).toUpperCase() === 'PREMIUM' ? 'PREMIUM' : 'FREE',
        familyId,
        selectedPersistentId: null,
        lifePersistentIds: [],
        createdAt: Date.now()
    };
}

export function canCreateLife(account) {
    return Boolean(account) && account.lifePersistentIds.length < getLifeSlotLimit(account.plan);
}

export function registerLife(account, persistentId) {
    if (!account || !persistentId) throw new Error('account and persistentId are required');
    if (account.lifePersistentIds.includes(persistentId)) return account;
    if (!canCreateLife(account)) throw new Error('life slot limit reached');
    account.lifePersistentIds.push(persistentId);
    if (!account.selectedPersistentId) account.selectedPersistentId = persistentId;
    return account;
}

export function selectLife(account, persistentId) {
    if (!account.lifePersistentIds.includes(persistentId)) throw new Error('life does not belong to account');
    account.selectedPersistentId = persistentId;
    return account;
}
