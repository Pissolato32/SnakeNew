class SocketClient {
    constructor() {
        this.socket = null;
        this.selfId = null;
        this.ping = 0;
        this.lastPingTime = 0;
        this.sequenceNumber = 0;
    }

    connect() {
        const connectionUrl = window.location.hostname.includes('vercel.app')
            ? 'http://localhost:3000'
            : undefined;

        this.socket = io(connectionUrl);
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

        this.socket.on('snapshot', (snapshot) => {
            this.onSnapshot(snapshot);
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

    sendInput(inputData) {
        if (this.socket && this.socket.connected) {
            this.sequenceNumber++;
            const payload = {
                ...inputData,
                seq: this.sequenceNumber,
            };
            this.socket.emit('input', payload);
            return this.sequenceNumber;
        }
        return -1;
    }

    // Placeholder methods for event handlers
    onConnect(_id) {}
    onGameSetup(_config) {}
    onSnapshot(_snapshot) {}
    onDeath(_data) {}
    onPong(_ping) {}
}

export default SocketClient;