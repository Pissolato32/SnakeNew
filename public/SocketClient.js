class SocketClient {
    constructor() {
        this.socket = null;
        this.selfId = null;
        this.ping = 0;
        this.lastPingTime = 0;
    }

    connect() {
        if (typeof window === 'undefined') return;
        if (typeof window.io !== 'function') {
            console.error('Socket.IO client não carregado. Verifique a tag de script da CDN.');
            return;
        }
        try {
            // Se front e servidor estiverem no mesmo domínio (Render), uma chamada sem URL usa o host atual
            this.socket = window.io({
                transports: ['websocket'],
                path: '/socket.io'
            });
        } catch (e) {
            console.error('Falha ao inicializar Socket.IO:', e);
            return;
        }

        this.setupSocketListeners();

        setInterval(() => {
            if (!this.socket) return;
            this.lastPingTime = Date.now();
            this.socket.emit('ping');
        }, 2000);
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            this.selfId = this.socket.id;
            this.onConnect(this.selfId);
        });

        this.socket.on('game-setup', (config) => {
            this.onGameSetup(config);
        });

        this.socket.on('game-state', (delta) => {
            this.onGameState(delta);
        });

        this.socket.on('death', (data) => {
            this.onDeath(data);
        });

        this.socket.on('pong', () => {
            this.ping = Date.now() - this.lastPingTime;
            this.onPong(this.ping);
            this.socket.emit('pingUpdate', this.ping);
        });
    }

    joinGame(details) {
        this.socket.emit('join-game', details);
    }

    sendPlayerUpdate(update) {
        this.socket.emit('player-update', update);
    }

    // Placeholder methods for event handlers
    onConnect(id) {}
    onGameSetup(config) {}
    onGameState(delta) {}
    onDeath(data) {}
    onPong(ping) {}
}

export default SocketClient;
