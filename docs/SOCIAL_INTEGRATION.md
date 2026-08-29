# Social Integration — Fase E

## Princípios

Relações sociais são estado contextual, não invulnerabilidade.

- membros da mesma família não devem ser tratados como presas/predadores por padrão;
- cooperação depende de relação, contexto e comportamento;
- confiança pode subir ou cair;
- alianças são bilaterais;
- ambas as famílias pagam manutenção;
- se uma das partes não puder manter a aliança, ela é dissolvida;
- relações devem influenciar decisões da Utility AI sem substituir percepção e necessidades.

## Estado mínimo

```text
familyA
familyB
trust
reputationA
reputationB
updatedAt
```

A chave canônica é ordenada para que `A:B` e `B:A` representem a mesma relação.

## Próxima integração operacional

O domínio `SocialModel` fornece invariantes determinísticos para serem consumidos por `RelationshipSystem` e `AllianceSystem`. A integração com persistência, percepção e Utility AI deve ocorrer sem duplicar regras de confiança ou manutenção.

## Balanceamento

O custo de manutenção é simétrico. Confiança negativa aumenta o custo, evitando que uma aliança deteriorada permaneça barata indefinidamente.

Nenhuma relação social concede imunidade a fome, colisão, predadores, ambiente ou outras causas de morte.
