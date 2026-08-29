# Skill Effects ECS Integration Contract

## Overview

The `SkillEffects` layer acts as a strictly bounded contract between progression (individual skills and family skills) and the runtime ECS simulation loop.

```text
skills (individual / family)
  -> SkillEffects (getIndividualModifiers / getFamilyModifiers / getAgentModifiers)
  -> bounded, clamped modifiers:
       - speed
       - sense
       - efficiency
       - defense
       - cooperation
       - reproduction
  -> ECS Consumers:
       - Region physics movement (speed) & boost length drop (defense)
       - PerceptionSystem logical vision box (sense)
       - NeedSystem hunger/energy decay (efficiency)
       - ReproductionSystem eligibility & cooldown (reproduction)
```

## Invariants & Design Principles

1. **Marginal Advantage**: Modifiers are strictly clamped (e.g. `[-0.2, 0.25]` for speed/efficiency, `[0.0, 0.3]` for reproduction). Progression never produces infinite energy or game-breaking invulnerability.
2. **Family vs Individual Separation**: An agent receives `individual modifiers + family modifiers`. Family bonuses are not multiplied per family member count.
3. **No Spatial Hash Mutation**: Perception `sense` alters the logical query box dimensions (`visionRect`) without changing the underlying spatial hash cell grid structure.
4. **Collision Physics Preservation**: `defense` slightly mitigates boost drop length loss rather than altering fundamental physical head-on collision rules.
5. **Deterministic Reproduction**: Skills reduce reproduction cooldown within deterministic bounds and slightly adjust eligibility without bypassing minimum energy/length/environmental requirements.
