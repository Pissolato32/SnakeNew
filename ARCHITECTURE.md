# Arquitetura do Projeto

## Visão Geral

O SnakeNew é um jogo multiplayer persistente inspirado no Slither.io, construído com Node.js no backend e JavaScript vanilla no frontend. A arquitetura é baseada em componentes desacoplados de Simulação de Regiões, Sistemas de IA Cognitiva e Persistência de Estado (ECS) com suporte a simulação em background 24/7.

## Estrutura de Diretórios

```
SnakeNew/
├── src/                    # Código fonte principal
│   ├── server/            # Lógica do servidor (Física, Redes, Persistência)
│   │   ├── ecs/           # Sistemas e Provedores do ecossistema de Persistência
│   │   └── services/      # Serviços auxiliares de backend
│   ├── client/            # Lógica do cliente (Canvas, Interpolação, Painel de Controle)
│   └── shared/            # Código compartilhado entre cliente e servidor
├── public/                # Código buildado e assets estáticos para o navegador
├── config/                # Arquivos de configurações e variáveis de ambiente
└── scripts/               # Scripts auxiliares de build e teste
```

## Componentes Principais

### Server (`src/server/`)
- **server.js**: Ponto de entrada, configuração Express e Socket.IO.
- **WorldManager.js**: Orquestrador global que pre-cria as regiões do jogo e gerencia a hibernação inteligente e a progressão em background.
- **Region.js**: Instância isolada do mapa de jogo que executa a simulação física, colisões, IA e persistência.
- **AgentManager.js**: Gerenciamento de agentes (jogadores e bots) e ciclo de vida de cobras.
- **FoodManager.js**: Sistema de comidas normais e dinâmicas (alimentadas pela morte de cobras).
- **PowerupManager.js**: Gerenciamento de power-ups coletáveis na arena (ímãs de comida, etc.).
- **CollisionSystem.js**: Detecção e resolução de colisões otimizadas via Hash Espacial.
- **NetworkManager.js**: Roteamento e listeners de pacotes Socket.IO.
- **AIManager.js**: Inteligência artificial cognitiva e gerador de decisões de bots.
- **AntiCheat.js**: Detetor autoritativo de teleporte e speed-hacks.

### Client (`src/client/`)
- **game.js**: Ponto de entrada do loop de renderização e interpolação no cliente.
- **Renderer.js**: Renderização otimizada em múltiplos canvas (grades de câmera, comida, jogadores e minimapa).
- **GameState.js**: Estado local do jogo com interpolação linear de pacotes.
- **InputManager.js**: Captura de movimentação, boost e tecla de painel de controle.
- **SocketClient.js**: Comunicação WebSocket com reconexão automática e cálculo de latência (ping).
- **UIManager.js**: Atualização otimizada de interface (tabela de classificação, necessidades e debug a 10Hz).

### Shared (`src/shared/`)
- **Constants.js**: Definição de limites de física, velocidade, rotação e constantes de IA compartilhadas.
- **Utils.js**: Métodos utilitários de distância e bounding boxes.
- **SpatialHashing.js**: Grade de busca espacial bidimensional para acelerar detecção de colisões.
- **CircularBuffer.js**: Estrutura eficiente para histórico de movimentos e replicação física.

---

## Fluxo de Estado e Conexão 24/7

### 1. Persistência de Dados (JSON / Banco de Dados)
A cada 30 segundos, o `PersistenceSystem` serializa o estado das cobras ativas (ID, nickname, posição, pontuação, necessidades, sliders de estratégia) e grava em disco através do `JsonPersistenceProvider`. No início do servidor, a região lê o estado salvo para restaurar o ecossistema exatamente de onde parou.

### 2. Reconexão por Nickname (Strategist)
Quando o jogador insere o nickname no menu de entrada, o servidor busca por uma cobra pré-existente (offline) com o mesmo nome. Se encontrada, ela reconecta o socket do jogador ao corpo da cobra existente, mantendo sua massa, pontuação e histórico de jogo intactos.

### 3. Hibernação Inteligente e Simulação de Fundo (Sleep Mode)
Para preservar os recursos da nuvem:
- **Hibernação**: Se o número de conexões ativas for **zero**, o servidor desativa o loop de física de 60Hz e de envio de snapshots de rede.
- **Progressão Offline (Strategic Simulation)**: A cada 5 segundos de hibernação, o servidor realiza uma macro-atualização de progressão offline na região. Ele simula necessidades biológicas (fome, cansaço), crescimento das cobras por alimentação virtual e combates simplificados por proximidade de forma extremamente leve, mantendo o mundo vivo 24/7 sem consumir CPU da nuvem.
- **Despertar**: Ao conectar qualquer socket, o loop a 60Hz é restaurado instantaneamente.

---

## Execução e Testes

### Executando Localmente
```bash
npm install
npm run build
npm start
```

### Rodando a Suíte de Testes (Jest)
```bash
npm test
```
A suíte inclui cobertura de:
* Unitários (Buffers, Pool de Objetos, Persistência, Utilitários).
* Integração (Região de simulação física, inicialização dinâmica e simulação de progresso offline).