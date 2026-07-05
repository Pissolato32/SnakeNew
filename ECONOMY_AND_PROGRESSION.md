# Economy & Progression Design (The Strategist's Obsession)

## 1. A Obsessão do Jogo (The Core Hook)
O jogador não está apenas "tentando sobreviver". A verdadeira motivação (a obsessão) do jogo é **Construir a Linhagem Perfeita**.
O objetivo é alcançar a espécie dominante do ecossistema, ajustando as falhas da geração anterior através de engenharia genética e comportamental. O jogador atua como um Cientista de IA, buscando otimização contínua.

## 2. O Loop de Progressão (A Máquina do Tempo Evolutiva)
A progressão inverte o foco do avatar para o laboratório:

**Conta (Estrategista) -> Laboratório -> Pesquisa -> Genes -> Nova Geração -> Coleta de Dados/Biomassa -> Melhoria do Laboratório -> Nova Geração Melhorada.**

Neste loop, a morte do Organismo (Creature/Agent) não é uma falha, mas sim uma etapa essencial de coleta de dados. Cada morte gera *Biomassa* (moeda do jogo) e *Insight* (dados comportamentais).

## 3. Progressão Permanente da Conta (O Laboratório)
Mesmo quando o Organismo morre, o que persiste na conta do jogador:
- **Biomassa:** Acumulada pelo tempo de vida, quantidade de alimento ingerido e predações bem-sucedidas. Utilizada para upgrades no Laboratório.
- **Nível do Laboratório:** Libera novas abas de pesquisa.
- **Árvore de Pesquisa (Tech Tree):** Desbloqueia novas faixas de DNA (ex: mutar limite de visão periférica de 90º para 120º).
- **Perfis de Estratégia (Loadouts):** Estratégias testadas e salvas.

## 4. Árvore Genealógica (Lineage Tree)
Todas as gerações são salvas permanentemente. O jogador tem acesso a um "Livro da Vida" visual onde pode:
- Ver a Árvore de todas as gerações passadas (Gen 1, Gen 2... Gen 45).
- Comparar os *Stats* de sobrevivência entre a Geração 10 e a Geração 11.
- Verificar quais genes e configurações exatas de IA estavam ativas em cada geração.
- Ressuscitar/Clonar uma geração antiga que obteve sucesso em um determinado bioma, criando uma bifurcação (Branch) na evolução.

## 5. O Sistema de Replay ("A Caixa Preta")
Para evitar que o jogo seja apenas sobre "observar e torcer", implementaremos a "Caixa Preta".
Quando um Organismo morre, o jogador pode assistir ao **Replay dos últimos 30 segundos**, mas com um diferencial técnico:
- **Overlays de IA (Visual Debug):** O replay mostra o *FOV* (campo de visão), os vetores de decisão, as ameaças coloridas por nível de perigo e os *Utility Scores* flutuando na tela.
- **Identificação da Falha:** O Estrategista pode literalmente ver: "Ah, o score de fuga foi baixo porque a Cautela estava em 20%, ele achou que conseguia devorar a comida antes daquele predador maior chegar."
Isso dá ao jogador o feedback necessário para voltar ao Laboratório e ajustar a próxima geração.

## 6. Perfis de Estratégia e Comunidade
Ao invés de manipular dezenas de sliders toda vez, o jogador pesquisa, cria e salva *Arquétipos comportamentais*.
- **Exemplos de Perfis Básicos:**
  - *Coward (Covarde):* Cautela 90, Ganância 10, Fuga imediata ao ver movimento.
  - *Scavenger (Oportunista):* Agressividade 10, Curiosidade 80. Fica nas bordas esperando Organismos maiores morrerem para roubar nutrientes.
  - *Predator (Predador):* Agressividade 95. Busca ativamente confrontos por superioridade de tamanho.
- **Compartilhamento:** Os jogadores podem importar e exportar "Builds" (ex: formato de string de texto igual no Factorio ou Path of Exile) para trocar no Discord ou Reddit.

## 7. Retorno Diário (Engajamento)
- **Eventos Globais Prolongados:** "Esta semana o bioma global está mais frio; o Metabolismo consumirá 20% mais energia." Os jogadores entram para criar "Builds de Inverno".
- **Geração Offline:** O Organismo sobrevive ativamente enquanto o jogador dorme. Acordar pela manhã e ver o "Relatório Noturno" (sua criatura sobreviveu 8 horas e eliminou 3 rivais) é extremamente gratificante.
