import { clampRelation, allianceMaintenance } from '../../../shared/SocialModel.js';

class AllianceSystem {
    constructor() {
        this.alliances = new Map();
    }

    key(a, b) { return [a, b].sort().join('::'); }

    propose(familyA, familyB, { maintenance = 1, durationMs = 24 * 60 * 60 * 1000 } = {}) {
        if (!familyA || !familyB || familyA === familyB) throw new Error('two distinct families are required');
        const key = this.key(familyA, familyB);
        const now = Date.now();
        const alliance = { familyA, familyB, trust: 0.5, maintenance, createdAt: now, expiresAt: now + durationMs, active: true };
        this.alliances.set(key, alliance);
        return alliance;
    }

    get(familyA, familyB) { return this.alliances.get(this.key(familyA, familyB)) || null; }

    maintenance(familyA, familyB) {
        const alliance = this.get(familyA, familyB);
        if (!alliance || !alliance.active) return null;
        return allianceMaintenance({ trust: clampRelation((alliance.trust - 0.5) * 200) }, alliance.maintenance);
    }

    tick(familyBalances = {}) {
        const now = Date.now();
        for (const alliance of this.alliances.values()) {
            if (!alliance.active) continue;
            if (now >= alliance.expiresAt) { this.dissolve(alliance.familyA, alliance.familyB, 'expired'); continue; }
            const cost = this.maintenance(alliance.familyA, alliance.familyB);
            if (familyBalances[alliance.familyA] < cost.familyA || familyBalances[alliance.familyB] < cost.familyB) {
                this.dissolve(alliance.familyA, alliance.familyB, 'maintenance-unpaid');
                continue;
            }
            familyBalances[alliance.familyA] -= cost.familyA;
            familyBalances[alliance.familyB] -= cost.familyB;
        }
        return familyBalances;
    }

    adjustTrust(familyA, familyB, delta) {
        const alliance = this.get(familyA, familyB);
        if (!alliance || !alliance.active) return null;
        alliance.trust = Math.max(0, Math.min(1, alliance.trust + delta));
        if (alliance.trust <= 0) this.dissolve(familyA, familyB, 'trust-collapsed');
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
