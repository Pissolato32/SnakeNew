# Game Design Document (GDD) - Persistent AI Ecosystem (Snake ALife)

## Visão Geral
O projeto é um Simulador Persistente de Vida Artificial (ALife) multiplayer onde os jogadores atuam como estrategistas. Os jogadores configuram o DNA, a Personalidade e a Estratégia de seus agentes (cobras), enquanto o mundo persiste e evolui independentemente de os jogadores estarem online.

---

## 1. Core Gameplay Loop (A Jornada do Estrategista)
A experiência do jogador é de observação, análise e ajuste, não de ação frenética.
1. **Conta criada**
2. **Cria sua primeira cobra** (Agente Base).
3. **Configura personalidade/estratégia** (Ajusta sliders de Agressividade, Cautela, etc.).
4. **Entra no mundo** (A cobra spawna no mapa).
5. **Observa** (Modo espectador seguindo a cobra).
6. **Analisa estatísticas** (Verifica níveis de fome, energia, histórico de encontros no Blackboard).
7. **Ajusta estratégia em tempo real** (Altera prioridades caso a cobra esteja correndo muitos riscos, o comando é enviado ao servidor).
8. **A cobra evolui** (Cresce, sobrevive, adquire novas memórias).
9. **Desbloqueia novas opções** (Ao atingir marcos de idade/tamanho, ganha pontos para alterar o DNA estrutural).
10. **Compete no ranking** (Maior tempo vivo, maior acúmulo de massa, mais eliminações).
11. **Morre** (A morte é permanente para aquela geração).
12. **Nova geração (Renascimento)** (O jogador avalia o relatório post-mortem, ajusta os genes com base nos aprendizados e spawna a próxima geração).
13. **Repete.**

---

## 2. Loop Principal da Entidade (Ciclo de Vida da Cobra)
- **Nascimento:** Spawna no mundo em uma zona periférica ou aleatória. Inicialmente possui baixa massa, pouca memória e visão limitada (conforme DNA).
- **Crescimento:** Ingerir comida converte nutrição em massa (raio/comprimento). Metabolismo dita a eficiência dessa conversão.
- **Aprendizado:** A cada encontro com comida ou ameaças, a memória espacial é atualizada. Locais com muitas mortes tornam-se "Hotzones".
- **Evolução:** Ao sobreviver longos períodos, o agente refina seus pesos internos da Utility AI baseado no sucesso (aprendizado por reforço primitivo - pós MVP).
- **Morte:** Ocorre ao colidir a cabeça com o corpo de outra entidade ou mapa, ou por Fome extrema (energia = 0 continuada).
- **Pós-Morte:** A cobra "quebra" em nutrientes (comida morta). O servidor gera um relatório Post-Mortem. A conta do jogador mantém os pontos de evolução para gerar o sucessor.

---

## 3. Modelo do Agente (Entity Components)
O Agente não tem lógica própria atrelada; possui apenas dados que os `Systems` processam.

- **Transform / Physics:** `position`, `velocity`, `radius`, `length`, `history (body segments)`.
- **Sensors / Vision:** Raio de visão, ângulo de FOV, taxa de atualização visual.
- **Needs:** `hunger` (0-100), `energy` (0-100), `stress` (0-100), `boredom` (0-100).
- **Traits (Personalidade):** Sliders mutáveis pelo jogador: `aggression`, `caution`, `curiosity`, `greed`, `territorialism`.
- **DNA (Fixo na Geração):** Limites e taxas: `metabolismBase`, `baseSpeed`, `maxVision`, `efficiency`.
- **Memory:** `spatialMemory` (heatmaps limitados por grid), `recentEncounters` (lista circular de entidades avistadas).
- **Blackboard (Estado Mental):** `currentGoal`, `currentTarget`, `lastKnownDanger`, `safeZone`, `currentAction`.
- **Stats:** `age`, `kills`, `foodEaten`, `distanceTraveled`, `generation`.

---

## 4. Sistemas do Mundo (World Systems)
A arquitetura ECS operará através destes sistemas orquestrados por um Scheduler:

- **PerceptionSystem:** Cruza o SpatialHash e preenche o Blackboard com entidades visíveis (Food, Snakes).
- **MemorySystem:** Pega as percepções e atualiza os mapas de memória (Decay de memórias antigas).
- **NeedSystem:** Atualiza a fome com base no tamanho/metabolismo, regenera energia se parado, aumenta estresse perto de ameaças.
- **GoalSystem:** Analisa Traits e Needs e elege a Diretriz (ex: Fome > 80 = `FEED`; Fome < 20 & Curiosidade alta = `EXPLORE`).
- **AISystem (Brain/Utility AI):** Gera as ações concretas. Se Goal=`FEED`, pontua todas as comidas visíveis usando os Traits (Comida perto de inimigo ganha penalty se Cautela for alta) e gera um `MovementVector`.
- **MovementSystem (Steering):** Aplica as forças do vetor na direção desejada suavemente, respeitando a `baseSpeed` e consumindo `energy` se usar boost.
- **CollisionSystem:** Matemática rigorosa de interseção. Emite evento `DeathEvent`.
- **FoodSystem:** Respawn global de alimentos, degradação de alimentos, cálculo de magnetismo de comida.
- **GrowthSystem:** Ouve eventos de ingestão e calcula o aumento de massa baseado no DNA.
- **CombatSystem/ThreatSystem:** Avalia relações de tamanho para ditar quem é predador/presa em um encontro.
- **PersistenceSystem:** Serializa a lista de agentes e status e salva periodicamente (ex: SQLite).
- **StatisticsSystem & RankingSystem:** Agrega pontuações (Kills, Maioridade) e expõe para o Client.
- **EventSystem:** O barramento (Pub/Sub) central que conecta as consequências lógicas.

---

## 5. Economia do Mundo e Balanceamento Matemático
Todas as regras abaixo residirão em arquivos de configuração estritos (`config.json`/`economy.json`):

- **Geração de Comida:** Limite máximo = N * (tamanho_do_mapa). Comida decai após X tempo (apodrece).
- **Crescimento:** `Massa_Ganho = Comida_Valor * (Metabolismo / 100)`. Comprimento e Raio aumentam logaritmicamente (fica mais difícil crescer quanto maior).
- **Fome (Decay):** `Fome_Tick = (Massa_Total * Fator_Desgaste) + (Velocidade_Atual * Fator_Esforço)`. Crescer custa mais manutenção.
- **Energia (Boost):** Consome massa e barra de energia rápida. `Energia_Regen` só ocorre se a cobra não estiver "caçando".
- **Spawn:** Proteção de N segundos (imortalidade), instanciada longe das zonas mais densas (calculado via Heatmap global).
- **Respawn de Agente de Player:** Cooldown global de T segundos ou penalidade de massa ao nascer se morrer seguidamente.

---

## 6. Fluxo Completo da IA (O Ciclo Cognitivo)
A cada Tick Cognitivo da IA, ocorre o fluxo:
1. **Percepção:** O Sensor extrai o mundo ao redor e manda para a Memória de Curto Prazo.
2. **Atualização da Memória:** Registra novas comidas e ameaças. Aplica esquecimento (Decay) em itens velhos.
3. **Necessidades:** NeedSystem recalcula Fome, Energia e Estresse.
4. **Objetivos (Goal):** GoalEngine olha pro Blackboard. Se Estresse > 90, Objetivo = SOBREVIVER. Se Fome > 70, Objetivo = ALIMENTAR-SE.
5. **Avaliação (Utility):** Com o objetivo traçado, a IA usa as curvas matemáticas (Ex: Agressividade reduz o peso negativo do perigo) para dar "Notas" (Scores) a cada ação possível (ex: ir para comida A, ir para comida B).
6. **Planejamento/Steering:** Escolhe a ação de maior nota. Traça o vetor de movimento fugindo de paredes e indo para o alvo.
7. **Execução:** Passa o vetor de rotação alvo para a Física (que roda a 60Hz interpolando a curva).
8. **Aprendizado/Feedback:** Se bateu num local perigoso, na próxima rodada a Memória atualiza aquele ponto com alto risco.

---

## 7. Extensibilidade da Arquitetura
A arquitetura baseada em Eventos e ECS garante que o código não precise de refatorações sistêmicas para expandir:
- **Genética e Evolução:** Ao criar o Agente, bastará criar um `DNASystem` que gera o Agente baseando-se no cruzamento de pais, injetando valores diferentes no componente `DNA`.
- **Diferentes Espécies/Mutações:** Pode ser feito criando novos *Components* (ex: `PoisonComponent`, `ArmorComponent`) e um sistema isolado que interage com eles durante a colisão, sem afetar as lógicas base.
- **Clãs/Territórios:** Adição de um `FactionComponent`. O `PerceptionSystem` passa a reconhecer membros da mesma facção como aliados.
- **Clima/Biomas:** O `WorldManager` pode mudar fatores multiplicadores no `EventSystem` (ex: Evento `WinterStarted` altera a constante base de `FoodDecay` para apodrecer a comida mais rápido, impactando automaticamente as Needs de todas as cobras).
- **Eventos e NPCs/Chefes:** Um Chefe é apenas uma Entidade com componentes `DNA` absurdamente altos e que talvez substitua a `GoalEngine` por um script coreografado, operando no mesmo fluxo do ECS.

---

## 8. Roadmap de Funcionalidades Atualizado

### MVP (Mínimo Produto Viável)
- Motor ECS e Barramento de Eventos Globais.
- Entidades processadas via Scheduler de Frequências (Physics 60Hz, AI 5Hz).
- IA Básica (Percepção -> Needs -> Utility AI -> Movement).
- Cliente como Dashboard de Estratégia e Espectador (sem envio de input de direção).
- Matemática da economia base (fome, metabolismo e crescimento).

### Alpha
- O "Blackboard" e Memória Espacial implementados na prática.
- Persistência contínua com banco de dados (SQLite/JSON).
- Relatório de Post-Mortem básico.
- Sistema de Goals em macro-nível (migrar de zona, explorar longo prazo).

### Beta
- Balanceamento Data-Driven total via configs externas.
- Gráficos de telemetria no frontend para o Estrategista.
- Primeiros traços emergentes (territorialidade ou comportamento de bando não-programado).

### v1.0
- Lançamento Estável. Ranking de Temporada.
- IA perfeitamente suave, balanceada e escalável (milhares de entidades suportadas simultaneamente através de spatial hashing apurado).

### Pós-Lançamento
- Árvore Genética (reprodução e mutações).
- Facções, Clãs e controle de Territórios.
- Biomas afetando movimentação e clima dinâmico.
