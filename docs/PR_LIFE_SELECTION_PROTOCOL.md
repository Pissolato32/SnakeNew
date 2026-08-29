# PR — Persistent Life Selection Protocol

## Objetivo

Adicionar a primeira integração operacional do modelo de múltiplas vidas: uma credencial existente pode listar vidas vivas e selecionar uma vida específica por `persistentId` para reassunção HUMAN.

## Protocolo

### Listagem

```text
join-game {
  nickname,
  token,
  listLives: true
}
        ↓
life-list { lives[] }
```

### Seleção

```text
join-game {
  nickname,
  token,
  persistentId
}
        ↓
vida encontrada + credencial válida
        ↓
controller = HUMAN
```

A vida anteriormente selecionada pode permanecer no mundo sob IA. Uma vida já controlada por outra sessão não pode ser assumida simultaneamente.

## Segurança atual

A implementação usa o `token` legado como credencial temporária. Ela **não** representa autenticação final nem substitui o `AccountModel` persistente. Nenhuma vida é listada sem credencial.

## Compatibilidade

O fluxo anterior de `join-game` continua disponível quando `persistentId` não é enviado.

## Próxima etapa

Substituir a associação `token → vidas` pela associação persistente `Account → Life`, mantendo `persistentId` como identidade da vida e permitindo Free=3/Premium=10.
