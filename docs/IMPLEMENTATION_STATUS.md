# Implementation Status — Diretriz de Vida Persistente

Data: 2026-08-29

## Implementado no código

| Área | Estado | Evidência |
|---|---|---|
| Vida persistente | Implementado | `persistentId` separado do socket |
| HUMAN → AI | Implementado | disconnect muda `controller` para `AI` |
| AI → HUMAN | Implementado | reconnect reassume a entidade persistida |
| Movimento humano | Implementado | input autorizado atualiza `targetAngle`/`isBoosting` |
| Foco 1–5 | Implementado | `LifeModel` + `strategy-update` validado |
| Utility AI + foco | Implementado | avaliadores usam pesos legados derivados do foco |
| Família | Base implementada | `familyId`, `broodId`, `generation` + `FamilyModel` |
| Genes | Sistema implementado | `GeneticsSystem` com modificadores limitados |
| Traits | Sistema implementado | `GeneticsSystem` converte traits em predisposições |
| Relações familiares | Sistema implementado | `RelationshipSystem` calcula cooperação contextual |
| Parentesco | Implementado | percepção classifica familiares como `knownAllies` |
| Skills | Progressão implementada | `SkillProgressionSystem` com pontos, ranks e pré-requisitos |
| Reprodução | Modelo implementado | `ReproductionSystem` gera identidade, geração, herança e mutação |
| Alianças | Ciclo de vida implementado | `AllianceSystem` cria, cobra manutenção, expira, ajusta confiança e dissolve |
| Slots | Regras implementadas | `AccountModel`: Free=3, Premium=10 |
| Ranking individual | Base implementada | `rankingScore` |
| Ranking familiar | Base implementada | `familyRankingScore` |
| Persistência | Schema atualizado | SQLite v2 com identidade, família, genes, traits, skills e foco |
| CI | Workflow criado | `.github/workflows/ci.yml` executa install/test/lint/build |
| Testes | Novos contratos unitários | Account, Family, Genetics, Relationship, Reproduction, Alliance, Skills e LifeSelection |
| Seleção de vida | Protocolo inicial implementado | `persistentId` + credencial no `join-game`, `life-list` e reassunção HUMAN |

## Ainda requer integração operacional

1. `AccountModel` ainda precisa ser ligado à autenticação/credencial real;
2. o catálogo de vidas ainda usa a credencial legada e precisa ser substituído pela conta persistente;
3. criação automática de múltiplas vidas/broods ainda não está ligada ao `AgentManager`;
4. reprodução ainda é um sistema de domínio; o disparo por condições do mundo precisa ser conectado ao ciclo ECS;
5. skills precisam gerar efeitos concretos em sistemas específicos além do registro de progressão;
6. alianças precisam de armazenamento persistente e integração com decisões de percepção/Utility AI;
7. ranking global precisa de armazenamento fora da região;
8. UI final dos sete focos e gestão de vidas ainda não está concluída;
9. replay/caixa-preta e relatório noturno ainda não estão concluídos;
10. autenticação, autorização e proteção contra abuso precisam ser finalizadas antes do lançamento;
11. testes de integração HUMAN → AI → HUMAN e restart ainda precisam ser executados;
12. smoke test, carga, simulações longas e validação operacional ainda precisam ser executados.

## CI e execução

O workflow de GitHub Actions foi criado na branch de desenvolvimento. No momento da revisão, a API do GitHub ainda retorna zero workflow runs associados aos commits desta branch; portanto não há resultado remoto para declarar `test/lint/build` como verdes.

Os comandos previstos são:

```bash
npm ci
npm test -- --runInBand
npm run lint
npm run build
```

## Critério de engenharia

Nenhuma mecânica deve ser considerada pronta para produção apenas por possuir uma classe ou teste unitário. A promoção para lançamento exige integração com o loop real, persistência, testes automatizados e smoke/load testing.

## Critérios de aceite do produto

- uma minhoca viva nunca é removida apenas porque o socket desconectou;
- a mesma identidade é reassumida no reconnect;
- AI nunca sobrescreve input HUMAN;
- membros da mesma família não são tratados como presa/predador;
- foco 1–5 altera prioridades sem virar comando absoluto;
- genes e traits produzem predisposições limitadas e contextuais;
- descendentes possuem identidade, família, brood, geração e pais rastreáveis;
- relações e alianças não concedem invulnerabilidade;
- Premium aumenta capacidade de coleção, não poder individual;
- morte é terminal para aquela vida, preservando histórico;
- CI verde e smoke test real são obrigatórios antes de release.
