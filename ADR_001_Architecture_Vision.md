# ADR 001: Visão Arquitetural - De Snake Bot para Artificial Life Simulation

## Status
Aceito

## Contexto
O projeto precisa ser migrado de um "Snake Multiplayer Tradicional" para um "Idle Multiplayer Persistent World" e uma Simulação de Vida Artificial. O jogador não terá mais controle direto; a entidade passa a ser um "Agente" em um ecossistema. A primeira proposta ainda limitava a IA a ações reflexivas instantâneas (ver comida -> ir até comida). Para evoluirmos para um ecossistema complexo (com genética, reprodução, planejamento), a arquitetura precisa mudar significativamente.

## Decisões
1. **Padrão Entity Component System (ECS) (ou inspirado nele):** Em vez da hierarquia clássica de OOP com Managers inchados, vamos quebrar os atributos das cobras em Componentes (Stats, Vision, Memory, Brain, Needs) e lógicas em Sistemas (CollisionSystem, MovementSystem, PerceptionSystem, etc.).
2. **Sistema Orientado a Eventos:** O desacoplamento será garantido através da comunicação via Barramento de Eventos Globais. Em vez de chamadas diretas de funções, os sistemas dispararão e assinarão eventos (ex: `FoodDetected`, `SnakeDied`, `GoalCompleted`).
3. **Blackboard Pattern para IA:** Cada Agente (Cobra) terá um `Blackboard` - um bloco de memória compartilhada para si mesmo onde todos os módulos de IA escrevem ou leem dados (última comida vista, nível de estresse atual, perigos detectados, objetivos).
4. **Goal Engine:** Acima das Utility Engines de curto prazo (Threat, Food), haverá um Planejador de Objetivos (`GoalEngine`). A IA trabalhará com decisões que perduram, criando planos (ex: "Sobreviver", "Migrar para o Sul", "Crescer Agressivamente").
5. **Necessidades e Traços (Traits/Needs):** O modelo mental do agente possuirá propriedades de simulação, como `Fome`, `Energia`, `Curiosidade`, `Estresse`, ao invés de meramente buscar "scores" aleatórios.
6. **DNA e Genética Básica:** A arquitetura já preverá uma árvore genética por Agente (mesmo que com mutação inativa no v1), permitindo evoluções futuras.
7. **Scheduler de Frequências (Task Manager):** Nem todo cálculo precisa de 60Hz. Um relógio mestre coordenará atualizações baseadas em necessidades:
   - Movimento/Física/Interpolação de Cliente: 60Hz
   - Visão (Spatial Queries): 20Hz
   - Utility AI e Steering: 5Hz
   - Goal Evaluation e Necessidades: 1Hz
   - Persistência: Cada 30s.

## Consequências
- A base de código requer uma refatoração maior e mais focada na separação em sistemas desacoplados, mas tornará a futura inserção de mecânicas complexas exponencialmente mais fácil e segura.
- A carga computacional no node será drasticamente otimizada graças ao Scheduler, permitindo que a IA (o processamento mais pesado) rode a uma fração do custo normal.
