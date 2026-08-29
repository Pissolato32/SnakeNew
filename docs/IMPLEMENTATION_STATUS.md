# Implementation Status — Diretriz de Vida Persistente

Data: 2026-08-29

## Implementado

| Área | Estado |
|---|---|
| Vida persistente | `persistentId` separado do socket |
| HUMAN → AI | desconexão transfere o controlador |
| AI → HUMAN | reconexão reassume a mesma entidade |
| Foco 1–5 | `LifeModel.normalizeFocus()` |
| Família | `familyId`, `broodId`, `generation` |
| Genes/traits | estrutura + persistência |
| Skills | árvores individual/familiar |
| Parentesco | familiares classificados como aliados |
| Ranking individual | `rankingScore` |
| Ranking familiar | `familyRankingScore` |
| Persistência | novos campos salvos/restaurados |
| Documentação | README, arquitetura e especificação ALife |

## Ainda não implementado como mecânica completa

1. reprodução e nascimento;
2. herança genética probabilística;
3. mutações;
4. progressão funcional das skill trees;
5. reputação persistente;
6. alianças entre famílias;
7. custo e expiração de alianças;
8. ranking global fora da região;
9. limite de slots Free/Premium aplicado no backend;
10. UI final dos sete focos;
11. schema versionado e migração formal;
12. suíte específica de testes para o novo ciclo de vida.

## Atenção técnica

A revisão foi feita diretamente na branch padrão e priorizou a mudança conceitual solicitada. Antes de produção, é obrigatório validar `npm test`, `npm run lint`, `npm run build` e um smoke test do servidor. `Region.js` foi refatorado de forma ampla para explicitar a posse HUMAN/AI e deve ser validado contra todos os consumidores atuais.

## Critérios de aceite

- vida viva sobrevive ao disconnect;
- mesma `persistentId` no reconnect;
- AI não sobrescreve input HUMAN;
- familiares não são tratados como presa/predador;
- foco 1–5 influencia Utility AI;
- identidade/família/genes/traits/skills/foco sobrevivem a restart;
- morte é terminal, com histórico preservado;
- Premium não aumenta poder individual;
- testes cobrem HUMAN → AI → HUMAN e persistência.
