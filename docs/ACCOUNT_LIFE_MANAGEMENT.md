# Account, Slots e Life Management

## Objetivo

A conta é uma camada de gestão. A simulação continua pertencendo ao mundo persistente.

```text
Account
  └── Family
       ├── Worm A  ← HUMAN ou AI
       ├── Worm B  ← AI
       └── Worm C  ← AI
```

Ao assumir uma vida, o jogador controla somente aquela identidade. Ao desconectar, a mesma vida permanece no mundo e passa para `controller = AI`.

## Slots

- Free: 3 vidas registradas.
- Premium: 10 vidas registradas.
- Premium não altera atributos de combate, velocidade, sobrevivência ou imunidade.

## Protocolo Socket.IO

### `life-list`

Request:

```json
{ "token": "..." }
```

Response `life-list` contém vidas não mortas pertencentes à conta e o limite atual de slots.

### `life-create`

Request:

```json
{
  "token": "...",
  "nickname": "WormTwo"
}
```

A nova vida nasce na mesma família da conta, inicia offline e fica imediatamente sob AI.

### `life-select`

Request:

```json
{
  "token": "...",
  "persistentId": "worm_..."
}
```

A vida selecionada passa a `HUMAN`, recebe a sessão atual e continua usando seu `persistentId` original.

## Invariantes

1. `persistentId` é identidade da vida, não da sessão.
2. Duas vidas da mesma família possuem `familyId` igual e `persistentId` diferente.
3. Uma vida online não pode ser assumida por outra sessão simultaneamente.
4. Desconexão não mata a vida.
5. Vida offline é controlada pela AI.
6. Uma conta não ultrapassa seu limite de slots.
7. O cliente não recebe a credencial de conta no payload serializado da conta.

## Limitação atual

O `AccountLifeService` desta fase mantém o catálogo de contas em memória. A persistência durável de `Account`, plano e vínculo de slots deve ser integrada à camada SQLite antes do lançamento. As vidas continuam sendo persistidas pelo mecanismo de vida do mundo.
