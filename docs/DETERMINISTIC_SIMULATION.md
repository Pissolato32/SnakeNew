# Deterministic Simulation Core

## Objetivo

Estabelecer a fundação do modelo **Same Rules, Different Resolution** antes da integração do mundo offline.

## Contratos

- `SIMULATION_VERSION` identifica o conjunto de regras usado para interpretar checkpoints e auditoria.
- `WorldClock` fornece `worldTime` e `simulationTick` independentes do relógio local do cliente.
- `seededRandom(seed, tick, entityId, eventType)` produz um resultado reproduzível e contextual.
- `Checkpoint` captura relógio, seed e estado sem compartilhar referências mutáveis.
- `AuditEvent` registra versão, tempo, entidade, evento, seed derivada, entradas e resultado.
- `SimulationLOD` explicita resolução HIGH (online), MEDIUM (mundo ativo econômico) e LOW (população distante).

## Isonomia

A identidade da conta não participa do sorteio ou cálculo de progressão. Premium pode alterar capacidade de gerenciamento, mas não recebe uma semente, taxa ou regra de sobrevivência privilegiada.

Reconexão deve restaurar o estado persistido; não deve recalcular arbitrariamente o intervalo offline. Replay é permitido para reconstrução/verificação e deve reproduzir os mesmos eventos com a mesma versão, seed, relógio e entradas.

## Regra de integração

LOD altera a resolução temporal, não as regras de negócio. Para equações não lineares, a implementação deverá usar substeps determinísticos ou uma integração equivalente explicitamente testada.

## Próxima etapa

Integrar `WorldClock` ao scheduler/ECS e introduzir checkpoints periódicos antes de implementar a simulação MEDIUM/LOW em produção.
