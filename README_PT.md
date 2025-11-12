# Slither.io Clone

Clone do jogo Slither.io desenvolvido em Node.js e JavaScript vanilla.

## 🎮 Como Jogar

### Instalação

1. Certifique-se de ter o Node.js instalado (v22+ recomendado)
2. Instale as dependências:
```bash
npm install
```

### Iniciar o Jogo

**Opção 1 - Windows:**
```bash
start.bat
```

**Opção 2 - Comando direto:**
```bash
npm start
```

O servidor iniciará na porta 3002. Abra seu navegador e acesse:
```
http://localhost:3002
```

### Controles

- **Mouse**: Controla a direção da cobra
- **Clique/Espaço**: Ativa o boost (aumenta velocidade mas consome massa)
- **ESC**: Pausa o jogo

### Objetivo

- Coma a comida colorida para crescer
- Evite colidir com outras cobras
- Faça outras cobras colidirem com você para comer seus restos
- Torne-se o maior jogador no leaderboard!

## 🛠️ Tecnologias

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: JavaScript vanilla, HTML5 Canvas
- **Recursos**: 
  - Sistema de IA para bots
  - Sistema de física e colisões otimizado
  - Renderização otimizada com canvas
  - Sistema de power-ups
  - Rede otimizada com delta encoding

## 📁 Estrutura do Projeto

```
SnakeNew/
├── src/
│   ├── server/         # Código do servidor
│   │   ├── server.js   # Servidor Express e Socket.IO
│   │   ├── GameManager.js      # Gerenciador principal
│   │   ├── PlayerManager.js    # Gerenciamento de jogadores
│   │   ├── FoodManager.js      # Gerenciamento de comida
│   │   ├── PowerupManager.js   # Gerenciamento de power-ups
│   │   ├── AIManager.js        # IA dos bots
│   │   ├── CollisionSystem.js  # Sistema de colisões
│   │   ├── NetworkManager.js   # Gerenciamento de rede
│   │   └── GameLoop.js         # Loop principal do jogo
│   ├── client/         # Código do cliente
│   │   ├── game.js     # Cliente principal
│   │   ├── Renderer.js # Renderização
│   │   ├── GameState.js # Estado do cliente
│   │   ├── InputManager.js # Gerenciamento de input
│   │   ├── SocketClient.js # Cliente WebSocket
│   │   └── UIManager.js    # Interface do usuário
│   └── shared/         # Código compartilhado
│       ├── Constants.js    # Constantes compartilhadas
│       ├── Utils.js        # Utilitários
│       ├── SpatialHashing.js # Sistema espacial
│       └── CircularBuffer.js # Buffer circular
├── public/             # Arquivos estáticos
│   ├── index.html      # Interface do jogo
│   ├── style.css       # Estilos
│   └── shared/         # Utilitários do cliente
├── config/             # Configurações
└── __tests__/          # Testes
```

## 🧪 Testes

Execute os testes com:
```bash
npm test
```

## 🐛 Debug

Para ativar o modo debug, edite `config/index.js` e defina:
```javascript
DEBUG_MODE: true
```

## 📝 Notas

- O jogo suporta múltiplos jogadores simultâneos
- Bots são adicionados automaticamente para completar o jogo
- O sistema de física é otimizado com spatial hashing
- A renderização usa técnicas de culling para melhor performance
