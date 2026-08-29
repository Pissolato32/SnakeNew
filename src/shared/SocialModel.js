export const RELATION_MIN = -100;
export const RELATION_MAX = 100;

export function clampRelation(value) {
  return Math.max(RELATION_MIN, Math.min(RELATION_MAX, Number(value) || 0));
}

export function createFamilyRelation(familyA, familyB, now = Date.now()) {
  if (!familyA || !familyB || familyA === familyB) throw new Error('two distinct families are required');
  const [a, b] = [familyA, familyB].sort();
  return {
    key: `${a}:${b}`,
    familyA: a,
    familyB: b,
    trust: 0,
    reputationA: 0,
    reputationB: 0,
    updatedAt: now
  };
}

export function updateTrust(relation, delta, now = Date.now()) {
  return { ...relation, trust: clampRelation(relation.trust + delta), updatedAt: now };
}

export function canCooperate(relation, threshold = 0) {
  return Boolean(relation) && relation.trust >= threshold;
}

export function allianceMaintenance(relation, baseCost = 1) {
  const trustFactor = 1 + Math.max(0, -relation.trust) / 100;
  return { familyA: baseCost * trustFactor, familyB: baseCost * trustFactor };
}

export function applyMaintenance(relation, balanceA, balanceB, baseCost = 1, now = Date.now()) {
  const cost = allianceMaintenance(relation, baseCost);
  const paidA = balanceA >= cost.familyA;
  const paidB = balanceB >= cost.familyB;
  if (!paidA || !paidB) {
    return { relation: null, dissolved: true, cost, paidA, paidB };
  }
  return { relation: { ...relation, updatedAt: now }, dissolved: false, cost, paidA, paidB };
}
