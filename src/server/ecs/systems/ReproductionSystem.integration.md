# Reproduction ECS Integration Contract

The next implementation phase must connect the existing `ReproductionSystem` domain model to the real ECS lifecycle.

Required flow:

```text
world conditions
  -> reproduction eligibility
  -> ReproductionSystem
  -> offspring identity
  -> Family/Brood metadata
  -> genetics + mutation
  -> AgentManager.addAgent
  -> world simulation
```

The offspring must receive a new `persistentId`; parents remain unchanged. Generation increments from the parent generation, and family/brood lineage remains traceable.

Reproduction must be probabilistic and contextual. It must not guarantee survival or create deterministic population growth independent of resource pressure.
