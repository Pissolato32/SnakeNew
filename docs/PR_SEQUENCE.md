# SnakeNew — PR Sequence

PRs are intentionally chained to avoid overlapping edits:

1. `feat/launch-readiness` — persistent life foundation.
2. `feat/life-selection-protocol` — multiple-life selection/reassumption protocol.
3. `feat/reproduction-ecs-integration` — reproduction integration contract; implementation follows after the life-selection PR is merged.

Each subsequent branch is based on the immediately preceding branch. Do not merge later PRs before their parent PR to preserve a linear integration sequence.
