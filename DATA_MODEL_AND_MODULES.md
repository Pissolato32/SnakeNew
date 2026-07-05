# Modelo de Dados e Módulos da Simulação de Vida Artificial

## Módulos do Sistema e Dependências (Baseado em ECS)

- **EventBus:** O barramento global de pub/sub (Ex: `WorldEventBus`). Nenhum sistema chama métodos de outros, exceto via eventos.
- **WorldManager:** O mestre que mantém a lista de entidades e gerencia o **Scheduler**.
- **Scheduler:** Dispara atualizações com base em frequências definidas (Hz).
- **NetworkSystem:** Apenas assina eventos e manda snapshots (delta encoded) a 60Hz. Transmite comandos de mudança de Estratégia dos clientes.
- **PhysicsSystem:** Resolve movimento linear baseado em vetores (60Hz).
- **CollisionSystem:** Lê SpatialHash, cruza dados e emite evento `SnakeDied`. (60Hz)
- **PerceptionSystem:** Usa o SpatialHash para escanear redondezas e atualiza o `Blackboard`. (20Hz)
- **BrainSystem (Utility AI):** Lê o Blackboard e emite `MovementIntention` (Steering Behavior). (5Hz)
- **GoalSystem:** Analisa Necessidades (Needs), Traços (Traits) e Blackboard para ditar a "Diretriz Suprema" atual. (1Hz)
- **NeedsSystem:** Atualiza a fome e energia. (1Hz)
- **PersistenceSystem:** Salva a entidade em DB. (0.033Hz - a cada 30s)

## Modelo de Dados (Entity Components)

A Entidade (Agent) no servidor nada mais será que um objeto contenedor (ID) mapeado para estruturas de dados enxutas.

```javascript
// Agent Data Model

{
  id: "uuid",
  ownerId: "user_uuid", // Null se for bot selvagem
  name: "Cobra 1",

  // Spatial & Physics (O que o Network manda)
  transform: { x: 0, y: 0, targetAngle: 0, isBoosting: false, radius: 10, length: 15 },
  history: [], // Posições do rabo

  // Traits / Genetics (Estático/Altera por player config)
  dna: {
    aggression: 50,  // Prefere lutar e roubar (0-100)
    caution: 80,     // Prefere fugir de ameaças maiores
    greed: 30,       // Risco de buscar comida no meio de cobras
    curiosity: 60,   // Explora áreas novas
    metabolism: 50   // Taxa de consumo de energia
  },

  // Needs (Dinâmico, atualiza 1Hz)
  needs: {
    hunger: 20,      // 0-100 (100 = morre de fome ou age extremo)
    energy: 100,     // Consumida pelo boost
    stress: 10       // Aumenta ao ver inimigos ou ser encurralado
  },

  // Stats (Para persistência e Ranking)
  stats: {
    age: 120, // Segundos vivos
    foodEaten: 400,
    kills: 2,
    distanceTraveled: 10000,
    highestLength: 50
  },

  // Blackboard (Estado Mental / Memória de Curto Prazo)
  blackboard: {
    currentGoal: "EXPLORE", // "FEED", "FLEE", "ATTACK", "MIGRATE"
    lastKnownFood: [], // array de posições recentes
    threats: [], // referências a inimigos
    safeZones: [],
    targetEntityId: null, // Objetivo atual
    lastDangerArea: { x, y, timestamp }
  }
}
```

## Fluxo da Inteligência Artificial (Tick Logic)

1. **[20Hz] PerceptionSystem**:
   - `Agent` lê ao redor via `SpatialHash`.
   - Popula `blackboard.threats` e `blackboard.lastKnownFood`.
2. **[1Hz] NeedsSystem**:
   - Incrementa `hunger`.
   - Se `hunger` > X, dispara alerta.
3. **[1Hz] GoalSystem**:
   - Avalia `hunger`, se alto e `greed` alto -> Objetivo = `FEED`.
   - Se `stress` > 80 e `caution` alto -> Objetivo = `FLEE`.
   - Grava `blackboard.currentGoal`.
4. **[5Hz] BrainSystem (Utility/Steering)**:
   - Lê `currentGoal`.
   - Avalia opções.
   - Gera um vetor 2D para movimento final.
5. **[60Hz] PhysicsSystem**:
   - Aplica a matemática do vetor 2D para girar o `targetAngle` gradativamente e avançar a cabeça (`transform.x/y`).
