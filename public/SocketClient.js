class SocketClient {
    constructor() {
        this.socket = null;
        this.selfId = null;
        this.ping = 0;
        this.lastPingTime = 0;
    }

    connect() {
        this.socket = io();
        this.setupSocketListeners();
        
        setInterval(() => {
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
