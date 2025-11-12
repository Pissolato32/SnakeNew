# Arquitetura do Projeto

## Visão Geral

O SnakeNew é um jogo multiplayer inspirado no Slither.io, construído com Node.js no backend e JavaScript vanilla no frontend. A arquitetura foi reorganizada para melhor separação de responsabilidades e manutenibilidade.

## Estrutura de Diretórios

```
SnakeNew/
├── src/                    # Código fonte principal
│   ├── server/            # Lógica do servidor
│   ├── client/            # Lógica do cliente
│   └── shared/            # Código compartilhado
├── public/                # Arquivos estáticos
├── config/                # Configurações
└── __tests__/             # Testes
```

## Componentes Principais

### Server (`src/server/`)
- **server.js**: Ponto de entrada, configuração Express e Socket.IO
- **GameManager.js**: Orquestrador principal do jogo
- **PlayerManager.js**: Gerenciamento de jogadores e bots
- **FoodManager.js**: Sistema de comida e spawning
- **PowerupManager.js**: Sistema de power-ups
- **CollisionSystem.js**: Detecção e resolução de colisões
- **NetworkManager.js**: Comunicação cliente-servidor
- **GameLoop.js**: Loop principal do jogo (60 FPS)
- **AIManager.js**: Inteligência artificial dos bots

### Client (`src/client/`)
- **game.js**: Ponto de entrada do cliente
- **Renderer.js**: Sistema de renderização Canvas
- **GameState.js**: Estado local do jogo
- **InputManager.js**: Captura de input do usuário
- **SocketClient.js**: Comunicação WebSocket
- **UIManager.js**: Interface do usuário

### Shared (`src/shared/`)
- **Constants.js**: Constantes compartilhadas
- **Utils.js**: Funções utilitárias
- **SpatialHashing.js**: Sistema de hash espacial
- **CircularBuffer.js**: Buffer circular para histórico

## Fluxo de Dados

1. **Cliente → Servidor**: Input do usuário via WebSocket
2. **Servidor**: Processamento da lógica do jogo
3. **Servidor → Cliente**: Estado do jogo via delta encoding
4. **Cliente**: Renderização e interpolação

## Sistemas Principais

### Sistema de Colisões
- Usa spatial hashing para otimização
- Detecção precisa cabeça-a-cabeça vs cabeça-a-corpo
- Resolução baseada em tamanho e posicionamento

### Sistema de IA
- Behavior Trees para bots
- Estados: Farming, Attacking, Fleeing
- Pathfinding com avoidance

### Sistema de Rede
- Delta encoding para reduzir bandwidth
- Rate limiting baseado em ping
- Lag compensation

## Configuração

Todas as configurações estão centralizadas em `config/index.js`:
- Parâmetros de jogo
- Configurações de rede
- Constantes de performance

## Inicialização

```bash
npm start  # Inicia src/server/server.js
```

O servidor serve arquivos estáticos de `public/` e carrega o cliente de `src/client/`.