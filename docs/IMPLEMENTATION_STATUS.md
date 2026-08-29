# Implementation Status — Diretriz de Vida Persistente

Data: 2026-08-29

## Implementado no código

| Área | Estado | Evidência |
|---|---|---|
| Vida persistente | Implementado | `persistentId` separado do socket |
| HUMAN → AI | Implementado | disconnect muda `controller` para `AI` |
| AI → HUMAN | Implementado | reconnect reassume a entidade persistida |
| Movimento humano | Implementado | input autorizado atualiza `targetAngle`/`isBoosting` |
| Foco 1–5 | Implementado | `LifeModel` + canal `strategy-update` validado |
| Utility AI + foco | Implementado | food/combat/safety/exploration ponderados pelo foco |
| Família | Estrutura implementada | `familyId`, `broodId`, `generation` |
| Genes/traits | Estrutura implementada | defaults + persistência |
| Skills | Estrutura implementada | árvores individual/familiar |
| Parentesco | Implementado | percepção classifica familiares como `knownAllies` |
| Identidade no snapshot | Implementado | `persistentId`, `familyId`, `controller`, `online` |
| Ranking individual | Base implementada | `rankingScore` |
| Ranking familiar | Base implementada | `familyRankingScore` |
| Persistência | Atualizada | novos campos salvos/restaurados |
| Testes do LifeModel | Implementados | cobertura unitária dos contratos básicos |
| Documentação | Atualizada | README, arquitetura, ALife e status |

## Ainda não implementado como mecânica completa

1. reprodução e nascimento;
2. herança genética probabilística;
3. mutações;
4. progressão funcional das skill trees;
5. famílias controladas por uma conta/coleção real;
6. agrupamento de minhocas lançadas simultaneamente em uma família real;
7. cooperação contextual entre familiares;
8. reputação persistente;
9. alianças entre famílias;
10. custo e expiração de alianças;
11. ranking global fora da região;
12. limite de slots Free/Premium aplicado no backend;
13. UI final dos sete focos;
14. schema versionado e migração formal do banco;
15. testes de integração HUMAN → AI → HUMAN;
16. smoke test e validação operacional completa.

## Atenção técnica

A alteração foi feita diretamente na branch padrão. A arquitetura agora representa a nova diretriz, mas a integração completa ainda requer execução real do projeto.

O repositório não apresentou workflow de GitHub Actions associado ao último commit durante a revisão, portanto não há resultado remoto de CI que permita declarar os testes verdes.

Antes de produção, executar:

```bash
npm install
npm test
npm run lint
npm run build
npm start
```

E realizar smoke test com:

1. criar uma minhoca;
2. entrar e verificar `controller=HUMAN`;
3. movimentar e usar boost;
4. desconectar;
5. verificar que a mesma vida continua com `controller=AI`;
6. reconectar usando a mesma credencial/token;
7. verificar a mesma `persistentId`;
8. alterar foco 1–5;
9. verificar mudança de decisão da Utility AI;
10. neutralizar a minhoca e confirmar que a vida não retorna.

## Critérios de aceite da próxima etapa

- uma minhoca viva nunca é removida apenas porque o socket desconectou;
- a mesma identidade é reassumida no reconnect;
- AI nunca sobrescreve input HUMAN;
- familiares não são tratados como presa/predador;
- foco 1–5 altera as prioridades sem virar comando absoluto;
- identidade, família, genes, traits, skills e foco sobrevivem a restart;
- morte é terminal para aquela vida, preservando histórico;
- Premium não aumenta poder individual;
- testes automatizados cobrem os contratos fundamentais antes da implementação de reprodução/alianças.
