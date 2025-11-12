### Plano de Implementação: Arquitetura de Jogo Autoritativa

Este plano divide a refatoração em fases lógicas para transformar o jogo em uma experiência online robusta, seguindo as melhores práticas da indústria.

---

**Fase 1: Refatoração do Servidor (Motor Autoritativo)**

O foco desta fase é implementar o núcleo da lógica de jogo no servidor, tornando-o a única fonte de verdade.

1.  **Estabelecer Tick Rate Fixo:**
    *   **Onde:** `src/server/server.js` (ou um novo `GameLoop.js`).
    *   **O quê:** Substituir o loop de jogo atual por um `setInterval` com taxa fixa (ex: 15 ticks por segundo / ~66.7ms). Toda a simulação (movimento, colisão) ocorrerá dentro deste tick.

2.  **Centralizar o Estado do Jogo:**
    *   **Onde:** `src/server/GameManager.js`.
    *   **O quê:** Unificar todo o estado do jogo (posições das cobras, comidas, placares) em uma estrutura de dados central. Usar coordenadas de grade discretas (números inteiros) e representar as cobras como `Arrays` (usando `push` e `shift` para simular um deque).

3.  **Implementar Lógica Autoritativa:**
    *   **Onde:** `src/server/GameManager.js`, `src/server/CollisionSystem.js`.
    *   **O quê:** O servidor moverá as cobras com base na última "intenção" de direção recebida do cliente. A detecção de colisão e o crescimento da cobra ocorrerão exclusivamente no servidor. O input do cliente apenas atualiza a direção desejada.

4.  **Criar Sistema de Snapshots:**
    *   **Onde:** `src/server/NetworkManager.js`.
    *   **O quê:** Em uma cadência ligeiramente mais lenta (ex: 12 Hz / ~83.3ms), o servidor irá "empacotar" o estado atual do jogo em um snapshot e enviá-lo a todos os clientes. Este snapshot será otimizado para conter apenas dados essenciais.

**Fase 2: Refatoração do Cliente (Previsão, Interpolação e Reconciliação)**

Esta fase adapta o cliente para renderizar o jogo de forma suave e responsiva, apesar da latência da rede.

1.  **Inputs com Números de Sequência:**
    *   **Onde:** `public/InputManager.js`, `public/SocketClient.js`.
    *   **O quê:** Anexar um número de sequência a cada input enviado ao servidor. Ex: `socket.emit('input', { seq: sequenceNumber++, dir: [dx, dy] });`. Isso é vital para a reconciliação.

2.  **Previsão de Movimento (Client-Side Prediction):**
    *   **Onde:** `public/game.js`.
    *   **O quê:** Ao pressionar uma tecla, o cliente moverá sua própria cobra localmente *imediatamente*. Isso fornece feedback instantâneo, fazendo o jogo parecer responsivo.

3.  **Buffer de Snapshots e Interpolação:**
    *   **Onde:** `public/game.js`, `public/Renderer.js`.
    *   **O quê:** O cliente armazenará os snapshots recebidos em um buffer. O motor de renderização (`Renderer.js`) usará dois snapshots do passado (ex: 120ms atrás) para interpolar a posição dos objetos na tela. Isso elimina o "engasgo" visual causado por variações na rede (jitter).

4.  **Reconciliação de Estado:**
    *   **Onde:** `public/game.js`, `public/SocketClient.js`.
    *   **O quê:** Ao receber um snapshot do servidor, o cliente irá corrigir seu estado local para corresponder ao estado autoritativo e reaplicará os inputs que foram enviados mas ainda não processados pelo servidor. Isso corrige pequenas discrepâncias da previsão de forma quase imperceptível.

**Fase 3: Otimização de Rede e Protocolo**

O foco é a eficiência, segurança e escalabilidade da comunicação.

1.  **Otimizar Payloads:**
    *   **O quê:** Reduzir o tamanho das mensagens trocadas. Substituir objetos JSON por `Arrays` de dados ou usar bibliotecas de serialização binária como `MessagePack`.

2.  **Implementar Rate Limiting e Validação:**
    *   **Onde:** `src/server/NetworkManager.js`.
    *   **O quê:** Limitar a frequência de inputs que um cliente pode enviar (ex: 20/s). Validar todos os dados recebidos para evitar pacotes maliciosos ou malformados.

3.  **Gerenciamento de Salas (Rooms):**
    *   **Onde:** `src/server/server.js`, `src/server/GameManager.js`.
    *   **O quê:** Utilizar o recurso de "salas" do Socket.IO para isolar as partidas. Cada sala terá seu próprio estado e loop de jogo, permitindo que o sistema escale para múltiplos jogos simultâneos.

**Fase 4: Testes e Telemetria**

Garantir a qualidade e obter dados para futuras melhorias.

1.  **Corrigir Testes Existentes:**
    *   **O quê:** Os testes unitários estão quebrados. O primeiro passo é corrigir a configuração do Jest para que eles possam ser executados.

2.  **Adicionar Telemetria Básica:**
    *   **O quê:** Exibir no cliente o ping (RTT) e o status do buffer de interpolação. No servidor, registrar métricas como o tempo de execução do tick.

3.  **Criar Clientes de Teste (Bots):**
    *   **O quê:** Desenvolver um script simples em Node.js que atue como um jogador para realizar testes de carga e depuração automatizada.