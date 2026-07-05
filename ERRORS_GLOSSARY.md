# Glossário de Erros e Soluções (SnakeNew)

Este documento registra de forma resumida todos os erros críticos encontrados e corrigidos durante o desenvolvimento e deploy do ecossistema SnakeNew, servindo como consulta rápida para desenvolvimento futuro.

---

### 1. Bloqueio de scripts externos por CSP (Content Security Policy)
* **Erro:** 
  `Loading the script 'https://cdn.socket.io/4.8.1/socket.io.min.js' violates the following Content Security Policy directive...`
* **Causa:** O middleware de segurança `helmet` no servidor Express (`server.js`) estava ativo com as configurações padrão, bloqueando requisições e carregamento de scripts vindos de CDNs externas não homologadas.
* **Solução:** Customizar as diretivas do Helmet na inicialização do Express para liberar explicitamente as CDNs do Socket.io e JSDelivr:
  ```javascript
  app.use(helmet({
      contentSecurityPolicy: {
          directives: {
              scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.socket.io"],
              connectSrc: ["'self'", "ws:", "wss:", "https://cdn.jsdelivr.net", "https://cdn.socket.io"]
          }
      }
  }));
  ```

---

### 2. Erro de MIME Type Estrito no CSS
* **Erro:** 
  `Refused to apply style from 'https://snakenew.onrender.com/style.css' because its MIME type ('text/plain') is not a supported stylesheet MIME type...`
* **Causa:** Ambientes de produção estritos exigem cabeçalhos MIME corretos (`Content-Type`). O servidor de arquivos estáticos do Express às vezes falhava em atribuir o tipo correto para arquivos `.css` ou `.js`.
* **Solução:** Configurar cabeçalhos estáticos explícitos na inicialização do `express.static`:
  ```javascript
  const staticOptions = {
      setHeaders: (res, filePath) => {
          if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
          if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
      }
  };
  app.use(express.static(path.join(__dirname, 'public'), staticOptions));
  ```

---

### 3. Falha de Referência ao Socket.io (`io` is not defined)
* **Erro:** 
  `Uncaught ReferenceError: io is not defined at SocketClient.connect`
* **Causa:** Efeito colateral do Erro 1 (CSP). Como o script do Socket.io client foi bloqueado pelo navegador, a classe global `io` nunca foi inicializada na página de login.
* **Solução:** Resolvido automaticamente corrigindo as permissões de CSP no Helmet (Erro 1).

---

### 4. Travamento no Health Check da Render
* **Erro:** 
  `TypeError: Cannot read properties of undefined (reading 'values') at HealthCheck.getHealthStatus`
* **Causa:** O script do monitor de integridade tentava listar as regiões ativas no `WorldManager` antes que o mapa estivesse populado ou utilizava chaves de dicionário incorretas.
* **Solução:** Adicionar validações de tipo seguro e tratamento contra valores nulos antes de realizar iterações de saúde no `HealthCheck.js`.

---

### 5. Sobrecarga e Picos de Lag na Inicialização (Ticks > 100ms)
* **Erro:** 
  `[WARN] Region A tick took too long: 196.79ms` (picos de até 400ms)
* **Causa:** 
  1. Conflito entre bots iniciais (`BOT_COUNT=50` definido no painel da Render) e a quantidade alvo estática do mapa (`MIN_BOT_COUNT=5`). O servidor criava 50 bots e no primeiro tick tentava deletar 45 cobras de uma só vez, processando física, IA e limpezas complexas em loop rápido.
  2. Atualização desenfreada da DOM no cliente. O placar e a HUD do jogo eram redesenhados a 60Hz/120Hz via `requestAnimationFrame` forçando o navegador a refazer layouts constantemente.
* **Solução:**
  1. Corrigir cálculo de alvo do mapa em `Region.js` para respeitar `config.BOT_COUNT` ao invés da constante fixa.
  2. Reduzir a variável `BOT_COUNT` para 10 ou 12 no painel da Render para preservar a CPU compartilhada gratuita.
  3. Limitar (throttling) atualizações de DOM na HUD do cliente para a taxa máxima de **10Hz** no `UIManager.js`.

---

### 6. Erro de Referência Circular na Persistência de Dados
* **Erro:** 
  `[ERROR] PersistenceSystem failed to save state: TypeError: Converting circular structure to JSON`
* **Causa:** O sistema tentava serializar todo o conteúdo do componente `agent.blackboard`. Esse objeto contém sensores com referências diretas a outras cobras ao redor, gerando uma referência cíclica bidirecional infinita.
* **Solução:** Apenas persistir o objetivo cognitivo atual (`currentGoal`) do blackboard, que é um dado primitivo seguro:
  ```javascript
  blackboard: {
      currentGoal: agent.blackboard?.currentGoal || 'EXPLORE'
  }
  ```

---

### 7. Conexão Recusada no deploy da Vercel
* **Erro:** 
  `GET http://localhost:3000/socket.io/... net::ERR_CONNECTION_REFUSED`
* **Causa:** O arquivo `SocketClient.js` continha um fallback que apontava clientes Vercel para `http://localhost:3000` assumindo testes locais, fazendo com que o jogo rodando em produção tentasse buscar um servidor local no PC do jogador.
* **Solução:** Configurar a URL de conexão de modo dinâmico: se a URL atual contém `.vercel.app`, conecta à URL de produção da Render. Caso contrário, deixa `undefined` (para herdar a mesma porta e protocolo do servidor atual):
  ```javascript
  const connectionUrl = window.location.hostname.includes('vercel.app')
      ? 'https://snakenew.onrender.com'
      : undefined;
  ```

---

### 8. Bloqueio de CORS na Conexão entre Vercel e Render (Credenciais e Origem Dinâmica)
* **Erro:** 
  `Access to XMLHttpRequest at 'https://snakenew.onrender.com/...' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present...`
* **Causa:** O Socket.io por padrão pode enviar cookies ou cabeçalhos de autenticação (credenciais). Sob a especificação de CORS do W3C, se a requisição inclui credenciais, a origem permitida `Access-Control-Allow-Origin` não pode ser o curinga (`*`) e deve ser exatamente a URL do originador da requisição.
* **Solução:** Configurar a política de CORS de forma dinâmica no Express e no construtor do Socket.IO para ler a origem da requisição e refleti-la dinamicamente, ativando `credentials: true`:
  ```javascript
  // No Express (server.js):
  app.use((req, res, next) => {
      const origin = req.headers.origin;
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
      if (req.method === 'OPTIONS') return res.sendStatus(200);
      next();
  });

  // No Socket.IO Server:
  const io = new SocketIOServer(server, {
      cors: {
          origin: (origin, callback) => {
              callback(null, origin || '*');
          },
          methods: ['GET', 'POST'],
          credentials: true
      }
  });
  ```
