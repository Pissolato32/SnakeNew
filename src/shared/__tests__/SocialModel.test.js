import { createFamilyRelation, updateTrust, canCooperate, allianceMaintenance, applyMaintenance } from '../SocialModel.js';

describe('SocialModel', () => {
  test('normalizes a bilateral family relation', () => {
    const relation = createFamilyRelation('family-b', 'family-a');
    expect(relation.key).toBe('family-a:family-b');
    expect(relation.trust).toBe(0);
  });

  test('trust is bounded and controls cooperation eligibility', () => {
    let relation = createFamilyRelation('a', 'b');
    relation = updateTrust(relation, 150);
    expect(relation.trust).toBe(100);
    expect(canCooperate(relation)).toBe(true);
    relation = updateTrust(relation, -250);
    expect(relation.trust).toBe(-100);
    expect(canCooperate(relation)).toBe(false);
  });

  test('maintenance is symmetric', () => {
    const relation = createFamilyRelation('a', 'b');
    const cost = allianceMaintenance(relation, 10);
    expect(cost.familyA).toBe(cost.familyB);
  });

  test('alliance dissolves when either side cannot pay', () => {
    const relation = createFamilyRelation('a', 'b');
    const result = applyMaintenance(relation, 10, 0, 1);
    expect(result.dissolved).toBe(true);
    expect(result.relation).toBeNull();
  });
});
