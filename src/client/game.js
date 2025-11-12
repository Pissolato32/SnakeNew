import GameState from './GameState.js';
import InputManager from './InputManager.js';
import UIManager from './UIManager.js';
import SocketClient from './SocketClient.js';
import Renderer from './Renderer.js';
import PerformanceMonitor from '../../public/PerformanceMonitor.js';

const INTERPOLATION_BUFFER_MS = 120; // 120ms buffer for interpolation

class GameClient {
    constructor() {
        this.gameState = new GameState();
        this.uiManager = new UIManager();
        this.socketClient = new SocketClient();
        this.renderer = new Renderer(this.gameState);
        this.inputManager = new InputManager(this.renderer.gameCanvas);
        this.perfMonitor = new PerformanceMonitor();

        this.snapshotBuffer = [];
        this.pendingInputs = [];
        this.gameLoopRunning = false;
        this.lastTime = 0;
    }

    init() {
        this.setupEventHandlers();
        this.socketClient.connect();
    }

    setupEventHandlers() {
        this.uiManager.onPlayButtonClick = () => this.joinGame();

        this.socketClient.onConnect = (id) => {
            this.gameState.setSelfId(id);
        };

        this.socketClient.onGameSetup = (config) => {
            this.gameState.setWorldSize(config.worldSize);
            this.renderer.drawStaticBackground();
        };

        this.socketClient.onSnapshot = (snapshot) => {
            this.perfMonitor.markUpdateStart();
            this.handleSnapshot(snapshot);
            this.perfMonitor.markUpdateEnd();
        };

        this.socketClient.onDeath = (data) => {
            this.uiManager.showDeathScreen(data.score);
            this.renderer.gameCanvas.style.opacity = '0.3';
            this.pendingInputs = []; // Clear pending inputs on death
        };
        
        this.socketClient.onPong = (ping) => {
            this.perfMonitor.updateNetworkLatency(ping);
        };
    }

    handleSnapshot(snapshot) {
        snapshot.timestamp = performance.now();
        this.snapshotBuffer.push(snapshot);
        if (this.snapshotBuffer.length > 20) {
            this.snapshotBuffer.shift();
        }
        this.reconcile(snapshot);
    }

    joinGame() {
        const details = this.uiManager.getLoginDetails();
        this.socketClient.joinGame(details);
        this.startGame();
    }

    startGame() {
        this.uiManager.showGameUI();
        this.renderer.gameCanvas.style.display = 'block';
        this.renderer.gameCanvas.style.opacity = '1';

        if (!this.gameLoopRunning) {
            this.gameLoopRunning = true;
            requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        }
    }

    gameLoop(timestamp) {
        this.perfMonitor.beginFrame(timestamp);

        this.processInputs();
        this.renderInterpolatedState();
        
        this.uiManager.updateScoreAndLeaderboard(this.gameState.players, this.gameState.selfId);
        const input = this.inputManager.getInput();
        this.uiManager.toggleDebugPanel(input.showDebugPanel);
        if (input.showDebugPanel) {
            this.uiManager.updateDebugPanel(this.perfMonitor.getMetrics(), this.gameState);
        }

        this.perfMonitor.endFrame();

        if (this.gameLoopRunning) {
            requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }

    processInputs() {
        const self = this.gameState.getPlayer(this.gameState.selfId);
        if (!self || self.isDead) return;

        const input = this.inputManager.getInput();
        const worldMouseX = (input.mouse.x - this.renderer.gameCanvas.width / 2) / this.renderer.camera.zoom + this.renderer.camera.x;
        const worldMouseY = (input.mouse.y - this.renderer.gameCanvas.height / 2) / this.renderer.camera.zoom + this.renderer.camera.y;
        const targetAngle = Math.atan2(worldMouseY - self.y, worldMouseX - self.x);

        const inputPayload = { angle: targetAngle, isBoosting: input.isBoosting };
        const seq = this.socketClient.sendInput(inputPayload);
        
        this.pendingInputs.push({ seq, ...inputPayload });
        
        // Client-side prediction
        this.predictMovement(self, inputPayload);
    }
    
    predictMovement(player, input) {
        // Simplified prediction based on user input
        player.angle = input.angle;
        const speed = input.isBoosting ? player.speed * 1.5 : player.speed; // Approximate
        player.x += Math.cos(player.angle) * speed * (1/60); // Assume 60fps for prediction delta
        player.y += Math.sin(player.angle) * speed * (1/60);
    }

    reconcile(snapshot) {
        const serverState = snapshot.players.find(p => p.id === this.gameState.selfId);
        const self = this.gameState.getPlayer(this.gameState.selfId);

        if (!self || !serverState) return;

        // Remove acknowledged inputs
        this.pendingInputs = this.pendingInputs.filter(input => input.seq > serverState.seq);

        // Set authoritative state from server
        self.x = serverState.x;
        self.y = serverState.y;
        self.angle = serverState.angle;
        self.maxLength = serverState.sc;
        // ... and other stats

        // Re-apply pending inputs for reconciliation
        this.pendingInputs.forEach(input => {
            this.predictMovement(self, input);
        });
    }

    renderInterpolatedState() {
        const renderTimestamp = performance.now() - INTERPOLATION_BUFFER_MS;
        
        const snapshotAIndex = this.snapshotBuffer.findIndex((s, i) => 
            s.timestamp <= renderTimestamp && this.snapshotBuffer[i+1] && this.snapshotBuffer[i+1].timestamp > renderTimestamp
        );

        if (snapshotAIndex === -1) {
            // Not enough data to interpolate, just render the latest known state
            this.renderer.updateCamera();
            this.renderer.draw();
            return;
        }

        const snapshotA = this.snapshotBuffer[snapshotAIndex];
        const snapshotB = this.snapshotBuffer[snapshotAIndex + 1];
        
        const timeDiff = snapshotB.timestamp - snapshotA.timestamp;
        const renderDiff = renderTimestamp - snapshotA.timestamp;
        const t = timeDiff > 0 ? renderDiff / timeDiff : 0;

        // Update GameState with all players/entities for rendering
        this.gameState.updateFromSnapshot(snapshotA, snapshotB, t);
        
        this.renderer.updateCamera();
        this.renderer.draw();
    }
}

window.onload = () => {
    const game = new GameClient();
    game.init();
    window.gameInstance = game; // For debugging
};
