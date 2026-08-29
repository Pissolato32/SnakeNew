# SnakeNew — Fases de Desenvolvimento

## Fase A — Infraestrutura de execução

Objetivo: transformar a branch de desenvolvimento em uma unidade verificável.

### Entregas

- GitHub Actions para `npm ci`, testes, lint e build;
- execução determinística dos testes em Node 20;
- smoke test de inicialização a ser adicionado quando o ambiente CI puder iniciar o servidor sem recursos externos;
- validação de persistência SQLite;
- testes de recuperação após restart.

### Critério de saída

CI verde para instalação, testes, lint e build; testes específicos de persistência e restart cobrindo a continuidade da vida.

## Fase B — Conta, família, brood e worm

Modelo-alvo:

```text
Account
  └── Family
       └── Brood
            ├── Worm
            ├── Worm
            └── Worm
```

`persistentId` identifica uma vida. `familyId` identifica sua linhagem. `broodId` identifica o grupo de nascimento. `generation` identifica a geração.

A família deve ser separada da identidade da vida: duas vidas da mesma família precisam compartilhar `familyId` sem compartilhar `persistentId`.

### Critério de saída

É possível criar várias vidas pertencentes à mesma família, reconectar uma vida específica e manter outras vidas sob IA.

## Fase C — Ecossistema

- percepção de ameaças, presas, comida e aliados;
- necessidades fisiológicas e emocionais;
- Utility AI;
- memória e exploração;
- cooperação condicionada por foco, personalidade e contexto;
- morte sem garantia artificial de sobrevivência.

### Critério de saída

Comportamentos diferentes emergem de estado e configuração, e não de scripts exclusivos para cada resultado.

## Fase D — Reprodução

Fluxo:

```text
parents -> brood -> offspring -> inheritance + mutation -> new worm
```

A reprodução deve preservar a identidade dos pais e criar uma nova identidade persistente para cada descendente.

### Critério de saída

Descendentes possuem geração, brood, família e herança genética rastreáveis.

## Fase E — Sociedade

- reputação;
- confiança;
- alianças;
- rivalidades;
- diplomacia;
- custo de manutenção;
- relações entre famílias.

### Critério de saída

Relações sociais afetam decisões sem transformar famílias em entidades invulneráveis.

## Fase F — Produto

- seleção de vidas;
- painel de família;
- focos 1–5;
- skills;
- ranking;
- slots Free/Premium;
- onboarding.

Premium deve ampliar coleção/gestão de vidas, e não fornecer atributos diretamente superiores.

## Fase G — Lançamento

- simulações de larga escala;
- balanceamento;
- teste de carga;
- restart/failure testing;
- revisão de segurança;
- CI/CD;
- observabilidade;
- deployment.

## Regra de engenharia

Não avançar uma fase apenas porque o código compila. Cada fase precisa de testes automatizados que demonstrem suas invariantes principais.
