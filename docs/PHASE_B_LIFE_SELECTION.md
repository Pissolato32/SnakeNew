# Phase B — Life Selection Contract

## Invariants

1. `persistentId` identifies the life and is independent of the socket id.
2. A living offline life remains `controller=AI` until explicitly reassumed.
3. Reassumption requires the life persistent id and the current credential.
4. A life already controlled by another session cannot be controlled concurrently.
5. Dead lives cannot be selected.
6. Bots are never exposed through the player life list.
7. The selected life is returned with family, brood and generation metadata.
8. The current token-based mechanism is transitional; final account ownership belongs to the Account model and persistent authentication layer.

## Acceptance test target

```text
create life A
create life B
A disconnects -> AI
listLives -> A + B
select A -> A HUMAN
B remains unchanged
select A from second session -> rejected
```
