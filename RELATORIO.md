# Relatório de Análise e Plano de Refatoração: Idle Multiplayer Persistent World

## 1. Diagnóstico da Arquitetura Atual
O projeto atual é um jogo clássico multiplayer baseado no modelo "Server Authoritative", utilizando Node.js e Socket.IO.
O loop principal do jogo (GameLoop/Room tick) executa a 60 FPS, gerenciando física, colisões, spawn de comida e input direto dos jogadores.
Os jogadores possuem controle direto sobre suas cobras (direção e boost), e existe um sistema rudimentar de bots baseado em Árvore de Comportamento (Behavior Tree) para preencher a sala.
A arquitetura é funcional para um jogo de ação em tempo real, mas possui forte acoplamento entre o jogador (Socket) e a entidade (Cobra), não existindo o conceito de persistência de mundo ou sessões assíncronas duradouras.

## 2. Componentes que podem ser reaproveitados
- **Sistema de Rede (NetworkManager / SocketClient):** A base de emissão de snapshots e delta encoding pode ser mantida para otimização de banda.
- **Estruturas de Dados Espaciais:** `SpatialHashing.js` é fundamental para evitar complexidade O(n²) e será extensamente utilizado pelos novos sistemas de Percepção da IA.
- **Utilitários e Buffers:** `CircularBuffer.js`, `Logger.js`, e lógicas matemáticas de vetores em `Utils.js`.
- **Base do CollisionSystem:** A matemática de colisões circulares e resolução de intersecções pode ser mantida com adaptações determinísticas.
- **Frontend Canvas (Renderer.js):** A lógica de culling e renderização eficiente do lado do cliente será mantida, sendo o cliente um mero "espectador" (Observer).

## 3. Componentes que devem ser descartados ou totalmente reescritos
- **InputManager.js e Controles Ativos:** O jogador não controla mais a cobra. A UI será totalmente substituída por um painel de Estratégia.
- **AIManager.js (Atual):** A Behavior Tree simples será substituída por uma arquitetura complexa de Utility AI baseada em scores.
- **PlayerManager.js:** Será desmembrado. O conceito de "Jogador" passará a ser "Conta/Estrategista", e as cobras serão "Agentes (Agents)".
- **GameManager.js / Room.js (Lógica de Sessão):** A criação de salas temporárias será substituída por um Mundo Persistente particionado (World -> Regions/Rooms).
- **Lógica de Desconexão:** Cobras não morrem ou somem quando o Socket desconecta. Elas permanecem no loop do servidor.

## 4. Nova Arquitetura Proposta
A nova arquitetura será baseada em **Sistemas Independentes (Data-Driven e Modular)**:
- **Core Data:** As entidades conterão apenas dados (Posição, Tamanho, Parâmetros de Estratégia, Memória).
- **World Server Loop:** Um loop assíncrono persistente.
  `WorldUpdate -> Perception -> AI Scoring -> Steering/Movement -> Physics -> Persistence`
- **Utility AI Engine:** Em vez de if/else, cada agente rodará de forma paralela (ou em batch) seus avaliadores de módulo (Threat, Food, Risk, Exploration) combinando as preferências da "Estratégia do Jogador" para produzir vetores de direção baseados num somatório de campos de utilidade (Steering Behaviors).
- **Sistema de Configuração Externo:** Uso intensivo de YAML/JSON para definir parâmetros básicos (pesos, visão, taxa de conversão alimentar).
- **Persistência (Database/Storage Layer):** Salvamento periódico (ex: a cada 1 minuto) do estado do mundo (posições, tamanhos, inventário) em memória/banco de dados embutido (ex: SQLite).

## 5. Plano de Migração em Etapas
- **Fase 1: Desacoplamento e Fundação.** Remover controles do jogador e forçar todas as cobras a operarem usando a IA local. Separar a lógica de Rede da entidade Cobra.
- **Fase 2: Motor de IA (Utility AI).** Implementar as Engines modulares propostas (Behavior, Decision, Target Selection, Navigation). Adicionar o "Perfil de Personalidade" com os parâmetros definidos de 0 a 100.
- **Fase 3: Mundo Persistente.** Alterar o ciclo de vida da sala para que nunca seja encerrada. Salvar e carregar dados periodicamente, desvinculando o "Socket ID" da "Cobra".
- **Fase 4: UI de Estratégia e Dashboard.** No cliente, criar a interface do "Estrategista", enviando as métricas e recebendo telemetria da Cobra (Stats, Kills, etc.).
- **Fase 5: Otimização e Escalabilidade.** Implementar processamento em batch para as IAs, refinamento das querys no SpatialHash e otimização do GC (Garbage Collector).

## 6. Avaliação de Riscos
- **Performance do Servidor (CPU Bound):** Rodar uma IA pesada para *todas* as cobras de forma persistente a 60 vezes por segundo pode estrangular o Node.js.
  *Mitigação:* O "Cérebro" da IA (tomada de decisão) rodará a uma taxa menor (ex: 5 a 10 vezes por segundo), e apenas a interpolação do movimento final ocorrerá a 60 FPS.
- **Memory Leaks no Mundo Persistente:** Como o jogo não reseta, acúmulo de objetos não limpos (como comida dropada ou logs) vai crashar o servidor.
  *Mitigação:* Pools estritos (Object Pools) e coleta de lixo forçada por lógicas in-game (comida apodrece).

## 7. Estimativa de Esforço por Módulo (Alta/Média/Baixa)
- Modulação da Arquitetura Core (Eventos/GameLoop): *Alta*
- Sistema de IA Baseada em Scores (Utility AI): *Alta*
- Refatoração do Cliente (Remoção de Inputs, Novo Dashboard): *Média*
- Sistema de Persistência e DB: *Média*
- Physics & Navegação Determinística: *Média*
- Balanceamento Incial (JSON configs): *Baixa*

## 8. Dependências Técnicas
- Introdução de banco de dados leve para persistência (ex: SQLite3 local via `better-sqlite3` ou persistência via JSON no início).
- Ajustes finos no Client para frameworks de UI simples (ou manutenção em Vanilla DOM manipulado para o painel de propriedades).

## 9. Melhorias de Desempenho Esperadas
- Eliminação da inconsistência de lags do jogador, uma vez que a movimentação é toda calculada do lado do servidor (Server-Authoritative Puro).
- Redução do payload de Network (clientes não enviam atualizações de eixo, apenas snapshots de mudança de estratégia eventuais).
- Melhor reaproveitamento de memória ao usar Object Pools persistentes ao longo dos dias em vez de instanciar a cada match.

## 10. Roadmap dividido em fases (Para Execução)
1. **Fase 1:** Geração da estrutura de Entidades (Agent, PlayerAccount), alteração do cliente para modo Espectador.
2. **Fase 2:** Implementação das Engines Modulares de Percepção e Avaliação de Riscos.
3. **Fase 3:** Sistema de Scores / Utility AI final e Navegação baseada em Steering Behaviors.
4. **Fase 4:** Estatísticas do Servidor e Persistência de Dados (SQLite/Disk).
5. **Fase 5:** Ajuste Fino e Balanceamento baseado em arquivos Data Driven.
