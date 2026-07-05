# North Star Document (Vision 2.0) - The Persistent ALife Ecosystem

## 1. A Visão de Longo Prazo (3 a 5 Anos)
O projeto evoluirá para ser o **MMO de Vida Artificial (ALife) mais orgânico e complexo do mercado**.
Milhares de Estrategistas cultivarão linhagens únicas de Criaturas Autônomas em um ecossistema persistente, compartilhado e em constante mutação. A economia deixará de ser apenas "ingerir pontos luminosos" para se tornar uma teia ecológica completa (Plantas -> Insetos -> Criaturas Pequenas -> Predadores Ápices). As criaturas formarão clãs, dominarão territórios e os Estrategistas competirão intelectualmente no *Laboratório Evolutivo* para encontrar a "build perfeita" para cada bioma e meta do jogo.

## 2. O Que Torna Este Jogo Único (Unique Selling Proposition - USP)
- **Não é um Idle Clicker:** O jogador não clica para ver números subirem. Ele formula hipóteses biológicas e comportamentais.
- **Não é um Jogo de Ação:** A ausência de controle direto eleva o papel do jogador de *Operador* para *Criador/Cientista*.
- **Comportamento Emergente vs. Scriptado:** As criaturas não seguem scripts de "vá do ponto A ao B". Suas ações são resultados da combinação caótica de suas Necessidades (Fome, Energia), Percepção (Memória Espacial) e Instintos Genéticos.
- **Progressão Assimétrica (Meta Progression):** A perda de uma Criatura não é um "Game Over", mas sim a coleta de dados e *Biomassa* que alimentará a Conta (O Laboratório) para a próxima geração ser biologicamente e computacionalmente superior.

## 3. Pilares Invioláveis (Core Pillars)
Qualquer nova feature deve ser rejeitada se violar estes princípios:
1. **Zero Controle Direto:** O Estrategista nunca dita o movimento (ex: ir para a esquerda ou acelerar). O controle atua exclusivamente sobre o *como* e *por que* (Objetivos e Instintos).
2. **O Mundo Nunca Dorme:** O ecossistema roda continuamente no servidor. Entrar e sair do jogo apenas conecta a câmera do Estrategista.
3. **Emergência Sistêmica:** Interações complexas devem surgir de regras simples interagindo (ECS e Utility AI).
4. **Morte com Propósito:** A morte de uma criatura é fundamental para a progressão meta. Ela alimenta o mundo (literalmente) e alimenta a pesquisa do Estrategista (metaphoricamente).

## 4. Progressão e Economia Meta
O jogo possui dois eixos de progressão: a Sobrevivência da Criatura e o Laboratório do Estrategista.
- **O Ciclo Econômico:** `Energia do Mundo -> Biomassa -> Criatura Morre -> Pontos Evolutivos -> Pesquisa no Laboratório`.
- **A Árvore de Pesquisa:**
  - *Sensores:* Visão Longa, Visão Periférica, Memória Fotográfica, Identificação de Armadilhas.
  - *Cérebro:* Planejamento de Rotas, Utility AI Avançada, Antecipação, Prevenção de Risco.
  - *Corpo:* Metabolismo Eficiente, Velocidade Base, Escamas (Armadura).
  - *Instintos:* Caça em Bando, Territorialismo, Cautela Extrema.
- **Ação do Estrategista:** Salvar "Builds", clonar estratégias, comparar gerações, testar IA em Sandbox local antes de soltar no World.

## 5. MoSCoW (Roadmap de Funcionalidades)

### Must Have (Essenciais - Para a Base Funcional)
- Arquitetura baseada em **Entity-Component-System (ECS)** e **Global Event Bus**.
- Renomeação completa da base: `Snake` -> `Creature`, `Player` -> `Strategist`, `Room` -> `Region`, `GameManager` -> `WorldManager`.
- Motor de IA (Brain) baseado em **Utility AI** e **Goal Engine**.
- Estado mental mantido num **Blackboard**.
- Modo espectador e painel de estratégia no Client.
- Necessidades vitais da Criatura (Fome que leva à morte, Energia e Stress).

### Should Have (Desejáveis - Para Retenção e Meta Game)
- Meta Progression (Árvore de Pesquisa do Laboratório).
- Acúmulo de Biomassa e Pontos Evolutivos.
- Persistência contínua em Banco de Dados.
- Histórico Post-Mortem (Estatísticas vitais da geração anterior).
- Memória Espacial das Criaturas (Heatmaps de risco no Blackboard).

### Could Have (Opcionais - Para Escala e Retenção Extra)
- Sistema de Replay (assistir aos últimos 5 minutos de vida da criatura antes de morrer).
- Sandbox Offline (O Estrategista testa a IA contra NPCs num ambiente controlado sem gastar Biomassa).
- Ecologia viva: Cadeia alimentar realística (Food -> Insects -> Small Creatures).
- Relatórios avançados (Gráficos de sobrevivência por linhagem Genética).

### Won't Have (Descartados ou Muito Futuros)
- Controle direto ("modo arcade").
- Mecânicas baseadas unicamente em Pay-To-Win que alterem diretamente o DNA da criatura com dinheiro.
- Física complexa 3D ou Z-axis.

## 6. Decisões Arquiteturais Imutáveis
1. **ECS (Entity Component System):** É proibido voltar para heranças complexas ou God Classes.
2. **Event-Driven:** Sistemas não chamam funções de outros sistemas diretamente (exceto utilities matemáticas cruas).
3. **Decoupled Scheduler:** A Física sempre roda independente e mais rápida que a Tomada de Decisão (Cognição).
4. **Data-Driven (Configurações em JSON):** Nenhum comportamento, peso ou velocidade será "Hardcoded" em JavaScript.
