const MIN_TRUST = 0;
const MAX_TRUST = 1;

class AllianceSystem {
    constructor() {
        this.alliances = new Map();
    }

    key(a, b) {
        return [a, b].sort().join('::');
    }

    propose(familyA, familyB, { maintenance = 1, durationMs = 24 * 60 * 60 * 1000 } = {}) {
        if (!familyA || !familyB || familyA === familyB) throw new Error('two distinct families are required');
        const key = this.key(familyA, familyB);
        const alliance = { familyA, familyB, trust: 0.5, maintenance, createdAt: Date.now(), expiresAt: Date.now() + durationMs, active: true };
        this.alliances.set(key, alliance);
        return alliance;
    }

    get(familyA, familyB) { return this.alliances.get(this.key(familyA, familyB)) || null; }

    tick(familyBalances = {}) {
        const now = Date.now();
        for (const [key, alliance] of this.alliances) {
            if (!alliance.active) continue;
            const a = familyBalances[alliance.familyA] || 0;
            const b = familyBalances[alliance.familyB] || 0;
            if (now >= alliance.expiresAt || a < alliance.maintenance || b < alliance.maintenance) {
                alliance.active = false;
                continue;
            }
            familyBalances[alliance.familyA] -= alliance.maintenance;
            familyBalances[alliance.familyB] -= alliance.maintenance;
        }
        return familyBalances;
    }

    adjustTrust(familyA, familyB, delta) {
        const alliance = this.get(familyA, familyB);
        if (!alliance || !alliance.active) return null;
        alliance.trust = Math.max(MIN_TRUST, Math.min(MAX_TRUST, alliance.trust + delta));
        if (alliance.trust <= 0) alliance.active = false;
        return alliance;
    }

    dissolve(familyA, familyB, reason = 'manual') {
        const alliance = this.get(familyA, familyB);
        if (!alliance) return false;
        alliance.active = false;
        alliance.endedAt = Date.now();
        alliance.endReason = reason;
        return true;
    }
}

export default AllianceSystem;
