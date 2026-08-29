# SnakeNew — Diretriz de Ecossistema Persistente

## 1. Premissa de produto

SnakeNew deve ser tratado como um **mundo persistente de vidas**, e não como uma coleção de partidas independentes.

A vida da minhoca pertence ao mundo. O jogador apenas alterna entre dois modos de controle:

```text
HUMAN  <------->  AI
  |                 |
  | conectado       | desconectado
  |                 |
  +------ mesma vida
```

A desconexão nunca deve equivaler a `removeAgent` ou `pauseAgent` para uma minhoca viva.

## 2. Máquina de estados de controle

```text
             connect
    AI --------------------> HUMAN
    ^                         |
    |                         | disconnect
    |                         v
    +----------------------- AI

    HUMAN/AI -- neutralização --> NONE
```

### HUMAN

- recebe input do jogador;
- Navigation/Utility AI não pode alterar `targetAngle` ou `isBoosting` por decisão autônoma;
- necessidades, física, colisão e persistência continuam funcionando.

### AI

- Utility AI avalia metas;
- Navigation calcula steering;
- necessidades e memória continuam sendo atualizadas;
- a estratégia do jogador permanece como peso decisório.

### NONE

- vida encerrada;
- não participa de decisões;
- histórico permanece para ranking e genealogia.

## 3. Identidade e linhagem

```text
Account
  |
  +-- Worm
       +-- persistentId
       +-- familyId
       +-- broodId
       +-- generation
       +-- genes
       +-- traits
       +-- skills
       +-- focus
       +-- personality/needs/memory
```

### Família

Família é uma linhagem persistente. O `familyId` não deve ser confundido com uma aliança.

### Brood

`broodId` identifica minhocas da mesma família lançadas simultaneamente. Ele permite que futuras regras de reconhecimento inicial, coesão e eventos de nascimento sejam mais fortes sem transformar todo parentesco em uma regra binária.

## 4. Genes, traits e skills

### Genes

Genes representam predisposições biológicas. Devem produzir modificadores pequenos e cumulativos, evitando transformar genética em uma fonte de poder absoluto.

Diretriz inicial de balanceamento:

- comum: aproximadamente ±2–4%;
- raro: aproximadamente ±5–7%;
- excepcional: aproximadamente ±8–10%.

Esses valores são metas de balanceamento, não contratos de implementação.

### Traits

Traits representam comportamento e podem ser positivos, negativos ou ambivalentes.

Exemplos:

- positiva: `cooperative`, `patient`, `attentive`;
- negativa: `coward`, `greedy`, `impulsive`, `territorial`;
- ambivalente: `aggressive`.

Trait deve alterar Utility AI e percepção de risco, não simplesmente entregar multiplicadores universais.

### Skills

Há duas árvores:

```text
INDIVIDUAL
├── Survival
├── Hunting
├── Exploration
└── Social

FAMILY
├── Lineage
├── Family Cooperation
└── Diplomacy
```

A progressão real deve ser implementada somente depois de estabilizar o ciclo de vida persistente.

## 5. Estratégia de foco

A interface deve preferir níveis discretos de 1 a 5.

```text
1 = baixa prioridade
2 = reduzida
3 = normal
4 = alta
5 = máxima
```

Eixos:

- `food`;
- `safety`;
- `exploration`;
- `combat`;
- `cooperation`;
- `growth`;
- `energy`.

O backend usa `LifeModel.applyFocus()` para converter o foco em pesos compatíveis com os avaliadores existentes.

### Princípio

O foco não é uma ordem absoluta.

```text
foco
  + personalidade
  + traits
  + genes
  + necessidades
  + memória
  + contexto
       ↓
   Utility AI
       ↓
      ação
```

Assim, `combate = 5` significa maior prioridade para oportunidades de combate, não "atacar qualquer coisa".

## 6. Família e relações

A percepção já separa membros da mesma família em `knownAllies`.

Regra base:

```text
same family -> não é presa nem predador
```

A próxima camada deve introduzir uma pontuação de cooperação baseada em:

```text
kinship
×
cooperation focus
×
cooperative traits
×
compatibilidade genética
×
histórico/reputação
```

Isso evita que família seja apenas um `if` de imunidade.

## 7. Alianças

Alianças pertencem a famílias, não a minhocas individuais.

Modelo planejado:

```text
Family A <---- Alliance ----> Family B
             |
             +-- trust
             +-- maintenance
             +-- duration
             +-- shared benefits
```

Ambas as famílias pagam manutenção.

O custo deve aumentar com o tamanho da aliança e benefícios concedidos. A aliança deve poder terminar por expiração, inadimplência ou quebra de confiança.

## 8. Ranking

O ranking deve reconhecer vidas e linhagens sem favorecer simplesmente o maior corpo.

### Individual

O primeiro score implementado combina:

- tempo de sobrevivência;
- kills;
- comida consumida;
- tamanho máximo atual.

### Família

O primeiro score é a média dos scores individuais dos membros vivos.

É propositalmente simples. Futuramente pode incorporar:

- gerações;
- sobrevivência média;
- membros no ranking;
- diversidade genética;
- reputação;
- conquistas.

## 9. Monetização

Diretriz:

```text
FREE    = 3 vidas persistentes
PREMIUM = 10 vidas persistentes
```

Premium não deve alterar os atributos de uma minhoca individual.

A vantagem comprada é capacidade de manter uma coleção maior de vidas e linhagens.

## 10. Ordem de implementação

### Fase 1 — Vida persistente

- identidade;
- HUMAN ↔ AI handoff;
- persistência;
- reconexão;
- morte definitiva.

### Fase 2 — Comportamento

- foco 1–5;
- traits;
- genes;
- cooperação familiar.

### Fase 3 — Progressão

- skills individuais;
- skills familiares;
- herança;
- gerações.

### Fase 4 — Sociedade

- reputação;
- alianças;
- confiança;
- custos de manutenção.

### Fase 5 — Meta-game

- ranking global;
- genealogia;
- conquistas;
- slots Free/Premium.

## 11. Regra arquitetural

Nenhuma dessas mecânicas deve ser implementada como lógica dentro do objeto agente.

O agente armazena estado/componentes. Sistemas interpretam esse estado:

```text
Agent state
   |
   +-- Genetics System
   +-- Trait System
   +-- Relationship System
   +-- Strategy System
   +-- Utility AI
   +-- Navigation
   +-- Physics
   +-- Persistence
   +-- Ranking
```

Isso mantém a direção ECS da arquitetura existente e permite que o mundo continue simulando vidas mesmo sem sockets conectados.
