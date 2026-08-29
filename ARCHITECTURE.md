# Arquitetura do Projeto

## Visão Geral

O SnakeNew é um mundo multiplayer persistente inspirado no Slither.io, construído com Node.js no backend e JavaScript vanilla no frontend. A arquitetura combina ECS, simulação server-authoritative, Utility AI, persistência e simulação de fundo.

A diretriz central é:

> **A minhoca é uma vida persistente. O jogador assume o controle dela quando entra e a engine assume novamente quando ele sai.**

Socket.IO representa a presença do jogador. Não representa a existência da minhoca.

## Estrutura de Diretórios

```text
SnakeNew/
├── src/
│   ├── server/
│   │   ├── ecs/
│   │   │   ├── systems/
│   │   │   ├── providers/
│   │   │   └── types/
│   │   ├── services/
│   │   └── *.js
│   ├── client/
│   └── shared/
│       ├── Constants.js
│       ├── LifeModel.js
│       ├── SkillTree.js
│       └── ...
├── public/
├── config/
├── docs/
│   └── ALIFE_ECOSYSTEM.md
└── scripts/
```

## Ciclo de Vida

```text
              ┌──────────────┐
              │   PERSISTED  │
              │     WORM     │
              └──────┬───────┘
                     │ connect
                     ▼
              ┌──────────────┐
              │    HUMAN     │
              │  possession  │
              └──────┬───────┘
                     │ disconnect
                     ▼
              ┌──────────────┐
              │      AI      │
              │ autonomous   │
              └──────┬───────┘
                     │
             ┌───────┴────────┐
             │                │
          reconnect       neutralized
             │                │
             ▼                ▼
          HUMAN             NONE
```

A desconexão não chama `removeAgent()` para uma minhoca viva. `WorldManager.handleDisconnect()` marca a entidade como offline e muda o controlador para `AI`.

## Identidade Persistente

O objeto de agente agora possui uma identidade de vida independente do socket:

```text
persistentId
familyId
broodId
generation
genes
traits
skills
focus
controller
isOnline
```

`id` ainda existe para manter compatibilidade com partes do código atual que usam o socket como chave. `persistentId` é a identidade conceitual que deve prevalecer na evolução do sistema.

## Controle HUMAN ↔ AI

### HUMAN

Quando o jogador está conectado:

- `controller = HUMAN`;
- `isOnline = true`;
- `socketId = socket.id`;
- input humano é aceito;
- `UtilityAI` não toma decisões de movimento;
- `NavigationSystem` não altera direção/boost.

### AI

Quando o jogador desconecta:

- `controller = AI`;
- `isOnline = false`;
- `socketId = null`;
- Utility AI assume decisões;
- estratégia configurada continua sendo usada;
- a vida permanece no mundo.

### NONE

Quando neutralizada:

- `controller = NONE`;
- `isOnline = false`;
- o agente deixa de participar da tomada de decisão;
- histórico e ranking permanecem.

## Estratégia 1–5

`src/shared/LifeModel.js` introduz o contrato de estratégia discreta:

```text
food          1..5
safety        1..5
exploration   1..5
combat        1..5
cooperation   1..5
growth        1..5
energy        1..5
```

Os níveis são convertidos para os pesos 0–100 usados pelos avaliadores existentes. Isso permite mudar a UX sem reescrever imediatamente toda a Utility AI.

A estratégia é preferência, não ordem absoluta:

```text
Focus + personality + traits + genes + needs + memory + context
                              ↓
                         Utility AI
                              ↓
                            Goal
```

## Genética, Traits e Skills

`LifeModel.js` fornece a estrutura inicial de genes e traits.

`SkillTree.js` define duas árvores:

```text
Individual
├── Survival
├── Hunting
├── Exploration
└── Social

Family
├── Lineage
├── Family Cooperation
└── Diplomacy
```

A árvore está separada da monetização e preparada para progressão posterior.

## Família

`familyId` identifica a linhagem. `broodId` identifica uma ninhada/lançamento simultâneo.

`PerceptionSystem` reconhece membros da mesma família em `knownAllies` e não os classifica como presa ou predador.

A intenção é evoluir para cooperação real baseada em:

- parentesco;
- foco de cooperação;
- genes;
- traits;
- personalidade;
- memória/reputação.

## Ranking

`StatsSystem` calcula periodicamente:

- `stats.rankingScore`: score individual;
- `stats.familyRankingScore`: score médio da família.

O score atual é uma primeira aproximação baseada em sobrevivência, kills, comida e tamanho. O algoritmo deverá ser recalibrado antes de ser tratado como ranking competitivo definitivo.

## Persistência

`PersistenceSystem` salva a cada 30 segundos e também é acionado em eventos de desconexão/hibernação.

Além do estado físico, a persistência agora inclui:

- identidade persistente;
- família/ninhada/geração;
- genes;
- traits;
- skills;
- foco;
- controlador/online state;
- necessidades;
- estatísticas.

### Observação de migração

Estados antigos podem não possuir os novos campos. O carregamento deve continuar tolerante a ausência de dados, usando defaults. A próxima etapa de persistência deve introduzir uma versão explícita de schema e migração de identidade/família para evitar perda de linhagem em instalações existentes.

## Simulação de Fundo

Quando não há sockets conectados, `WorldManager` entra em background simulation. A região continua executando progressão macro:

- necessidades;
- alimentação;
- crescimento;
- movimentação;
- conflitos;
- persistência.

Quando uma conexão volta, a simulação normal é restaurada.

Essa camada é diferente da AI de alta fidelidade. O objetivo é manter vidas persistentes sem gastar o orçamento de CPU de um loop completo quando nenhum jogador está observando.

## Componentes Principais

### Server

- **WorldManager.js**: ciclo de vida das regiões e handoff HUMAN/AI.
- **Region.js**: simulação física, ECS e coordenação regional.
- **AgentManager.js**: criação e armazenamento das vidas persistentes.
- **AIManager.js**: scheduler cognitivo.
- **UtilityAI.js**: seleção de metas.
- **NavigationSystem.js**: steering autônomo somente para AI.
- **PerceptionSystem.js**: percepção e reconhecimento de família.
- **PersistenceSystem.js**: salvamento/restauração.
- **StatsSystem.js**: métricas e ranking inicial.

### Shared

- **LifeModel.js**: identidade, foco, compatibilidade familiar e conversão de estratégia.
- **SkillTree.js**: definição das árvores de habilidades.
- **Constants.js**: constantes físicas e de IA.

## Regras Arquiteturais

1. Socket desconectado não significa vida removida.
2. HUMAN tem prioridade sobre Utility AI e Navigation.
3. A identidade da vida não deve depender do `socket.id`.
4. Família é diferente de aliança.
5. Foco 1–5 é preferência, não comando absoluto.
6. Genes/traits devem alterar decisões sem substituir a Utility AI.
7. Premium deve aumentar coleção, não poder individual.
8. Sistemas interpretam componentes; o agente não deve conter regras de negócio complexas.
9. Ranking deve ser calculável sem transformar tamanho bruto em único critério.
10. Simulação de fundo deve ser mais barata que simulação interativa, mas nunca equivaler a pausar o mundo.

## Execução e Testes

```bash
npm install
npm run build
npm start
npm test
npm run lint
```

A arquitetura mantém a separação entre simulação, rede e apresentação e continua compatível com a evolução para um ecossistema ALife persistente.
