# SnakeNew

SnakeNew é um mundo persistente de minhocas inspirado em Slither.io, com simulação server-authoritative, ECS, Utility AI e persistência de estado.

## Princípio central

**A unidade principal do jogo é a vida da minhoca, não uma partida.**

Ao entrar, o jogador assume uma minhoca sua. Enquanto estiver conectado, o jogador controla essa minhoca. Ao desconectar, a minhoca não é removida nem pausada: a engine assume o controle com `controller = AI` e continua sua vida de acordo com a estratégia configurada, até que ela seja neutralizada.

O Socket.IO representa a presença/interação do jogador; a existência da minhoca pertence ao mundo persistente.

## Modelo de controle

```text
CONEXÃO
  -> HUMAN controla a minhoca

DESCONEXÃO
  -> AI assume a mesma minhoca
  -> vida continua

RECONEXÃO
  -> HUMAN reassume a mesma vida

NEUTRALIZAÇÃO
  -> vida termina
  -> histórico permanece para estatísticas/ranking
```

Uma conta controla uma minhoca por vez. Outras minhocas pertencentes à coleção continuam vivendo sob IA.

## Identidade de uma minhoca

Cada agente agora possui, além dos atributos físicos existentes:

- `persistentId`: identidade da vida;
- `familyId`: linhagem/família;
- `broodId`: grupo de nascimento simultâneo;
- `generation`: geração da linhagem;
- `genes`: características biológicas;
- `traits`: características comportamentais;
- `skills.individual`: árvore de habilidades individual;
- `skills.family`: habilidades derivadas da linhagem;
- `focus`: estratégia configurável em níveis discretos de 1 a 5;
- `controller`: `HUMAN`, `AI` ou `NONE`;
- `isOnline`: presença do jogador;
- `stats.rankingScore`: ranking individual;
- `stats.familyRankingScore`: ranking da família.

## Foco estratégico 1–5

O jogador não configura percentuais contínuos. Cada eixo usa cinco níveis:

| Foco | Significado |
|---|---|
| 1 | baixa prioridade |
| 2 | prioridade reduzida |
| 3 | normal |
| 4 | alta prioridade |
| 5 | prioridade máxima |

Eixos atuais:

- alimentação;
- segurança;
- exploração;
- combate;
- cooperação;
- crescimento;
- conservação de energia.

O servidor converte esses níveis para os pesos 0–100 usados pelos avaliadores atuais, mantendo compatibilidade com a Utility AI existente.

## Família e cooperação

Membros da mesma família são reconhecidos pela IA e não entram como presa/predador durante a percepção. Eles são classificados como `knownAllies`.

O modelo foi preparado para evoluir para:

- genes compartilhados e herança;
- traits positivos e negativos;
- habilidades de família;
- cooperação condicionada por personalidade, genes e foco;
- alianças entre famílias com custo de manutenção;
- reputação e confiança.

A regra de parentesco não deve ser tratada como um bônus universal de poder: ela altera relações e decisões, não torna a família invulnerável.

## Skills

`src/shared/SkillTree.js` define duas árvores independentes:

- **Individual**: sobrevivência, caça, exploração e cooperação;
- **Família**: linhagem, cooperação familiar e diplomacia.

As árvores são deliberadamente não pay-to-win. Monetização não deve fornecer atributos superiores; o plano Premium amplia a coleção de vidas persistentes.

## Slots

Diretriz de produto:

- Free: até 3 minhocas persistentes;
- Premium: até 10 minhocas persistentes.

O limite representa quantidade de vidas mantidas no ecossistema, não quantidade de jogadores simultâneos controlados.

## Ranking

O servidor calcula dois indicadores básicos:

- **Worm Rating**: desempenho, sobrevivência, kills, alimentação e tamanho;
- **Family Rating**: média do desempenho dos membros vivos da família.

O algoritmo é intencionalmente simples nesta fase para permitir balanceamento posterior sem acoplar o ranking à monetização.

## Arquitetura

Consulte [`ARCHITECTURE.md`](./ARCHITECTURE.md) e [`docs/ALIFE_ECOSYSTEM.md`](./docs/ALIFE_ECOSYSTEM.md).

## Execução

```bash
npm install
npm run build
npm start
```

Testes:

```bash
npm test
npm run lint
```

## Estado atual da implementação

Implementado nesta revisão:

- handoff explícito HUMAN ↔ AI;
- continuidade da vida após desconexão;
- foco estratégico 1–5 com compatibilidade com os pesos antigos;
- identidade persistente, família, geração, genes, traits e skills no modelo de agente;
- reconhecimento de parentes durante percepção;
- persistência dos novos campos;
- ranking individual e familiar básico;
- árvore de skills individual/familiar;
- proteção para que Utility AI e Navigation AI não sobrescrevam controle humano.

Ainda dependem de iteração de produto/balanceamento:

- criação de descendentes e reprodução;
- herança genética probabilística;
- árvore de skills com progressão real;
- alianças e custo de manutenção;
- economia de slots Free/Premium;
- ranking global persistido fora da região;
- UI definitiva dos sete focos 1–5.
