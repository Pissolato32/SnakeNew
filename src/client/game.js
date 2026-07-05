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

        this.uiManager.onStrategyChange = (property, value) => {
            this.inputManager.updateStrategy({ [property]: value });
        };
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
        if (input) {
            this.socketClient.sendInput(input);
        }
    }

    predictMovement(player, input) {
        // No client-side prediction needed for spectator/AI-driven ecosystem
    }

    reconcile(snapshot) {
        // No client-side reconciliation needed for spectator/AI-driven ecosystem
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
