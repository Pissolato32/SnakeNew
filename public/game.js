import GameState from './GameState.js';
import InputManager from './InputManager.js';
import UIManager from './UIManager.js';
import SocketClient from './SocketClient.js';
import Renderer from './Renderer.js';
import PerformanceMonitor from './PerformanceMonitor.js';

const INTERPOLATION_BUFFER_MS = 120;

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
        this.isDead = false;
    }

    init() {
        this.setupEventHandlers();
        this.socketClient.connect();

        this.uiManager.onStrategyChange = (property, value) => {
            this.inputManager.updateStrategy({ [property]: value });
        };

        window.addEventListener('keydown', (e) => {
            if (!e.ctrlKey || !e.shiftKey) return;
            if (e.key === 'R' || e.key === 'r') {
                e.preventDefault();
                this.perfMonitor.resetSession();
                console.log('[perf] session reset');
            } else if (e.key === 'E' || e.key === 'e') {
                e.preventDefault();
                this.perfMonitor.downloadCsv();
                console.log('[perf] CSV exported');
            }
        });
    }

    setupEventHandlers() {
        this.uiManager.onPlayButtonClick = () => this.joinGame();

        this.uiManager.onPlayAgainButtonClick = () => {
            this.isDead = false;
            this.renderer.gameCanvas.style.opacity = '0';
            this.renderer.gameCanvas.style.display = 'none';
            this.gameState.reset();
        };

        this.socketClient.onConnect = (id) => {
            this.gameState.setSelfId(id);
        };

        this.socketClient.onGameSetup = (config) => {
            this.gameState.setWorldSize(config.worldSize);
            this.renderer.drawStaticBackground();

            const details = this.uiManager.getLoginDetails();
            if (config.token && details.nickname) {
                localStorage.setItem(`snakenew_token_${details.nickname}`, config.token);
            }

            this.startGame();
        };

        this.socketClient.onLoginFailed = (data) => {
            alert(data.error || 'Login falhou.');
        };

        this.socketClient.onSnapshot = (snapshot) => {
            this.perfMonitor.markUpdateStart();
            this.handleSnapshot(snapshot);
            this.perfMonitor.markUpdateEnd();
        };

        this.socketClient.onDeath = (data) => {
            this.isDead = true;
            this.gameState.reset();
            this.snapshotBuffer = [];
            this.pendingInputs = [];
            this.renderer.cameraInitialized = false;
            this.uiManager.showDeathScreen(data.score);
            this.renderer.gameCanvas.style.opacity = '0.3';
        };

        this.socketClient.onPong = (ping) => {
            this.perfMonitor.updateNetworkLatency(ping);
        };
    }

    handleSnapshot(snapshot) {
        if (this.isDead) return;
        snapshot.timestamp = performance.now();
        this.snapshotBuffer.push(snapshot);
        if (this.snapshotBuffer.length > 20) {
            this.snapshotBuffer.shift();
        }
        this.reconcile(snapshot);
    }

    joinGame() {
        this.isDead = false;
        this.snapshotBuffer = [];
        this.gameState.reset();
        this.renderer.cameraInitialized = false;

        const details = this.uiManager.getLoginDetails();
        const token = localStorage.getItem(`snakenew_token_${details.nickname}`);
        if (token) {
            details.token = token;
        }
        this.socketClient.joinGame(details);
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

        if (!this.isDead) {
            this.processInputs();
            this.renderInterpolatedState();
        } else {
            this.renderer.ctx.clearRect(0, 0, this.renderer.gameCanvas.width, this.renderer.gameCanvas.height);
        }

        this.uiManager.updateScoreAndLeaderboard(this.gameState.players, this.gameState.selfId);
        const showDebug = this.inputManager.showDebugPanel;
        this.uiManager.toggleDebugPanel(showDebug);
        if (showDebug) {
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
    }

    reconcile(snapshot) {
    }

    renderInterpolatedState() {
        const renderTimestamp = performance.now() - INTERPOLATION_BUFFER_MS;

        const snapshotAIndex = this.snapshotBuffer.findIndex((s, i) =>
            s.timestamp <= renderTimestamp && this.snapshotBuffer[i+1] && this.snapshotBuffer[i+1].timestamp > renderTimestamp
        );

        this.perfMonitor.markUpdateStart();
        if (snapshotAIndex === -1) {
            this.perfMonitor.markUpdateEnd();
            this.renderer.updateCamera();
            this.perfMonitor.markRenderStart();
            this.renderer.draw();
            this.perfMonitor.markRenderEnd();
            this.maybeDrawMinimap();
            return;
        }

        const snapshotA = this.snapshotBuffer[snapshotAIndex];
        const snapshotB = this.snapshotBuffer[snapshotAIndex + 1];

        const timeDiff = snapshotB.timestamp - snapshotA.timestamp;
        const renderDiff = renderTimestamp - snapshotA.timestamp;
        const t = timeDiff > 0 ? renderDiff / timeDiff : 0;

        this.gameState.updateFromSnapshot(snapshotA, snapshotB, t);
        this.perfMonitor.markUpdateEnd();

        this.renderer.updateCamera();
        this.perfMonitor.markRenderStart();
        this.renderer.draw();
        this.perfMonitor.markRenderEnd();
        this.maybeDrawMinimap();
    }

    maybeDrawMinimap() {
        const now = performance.now();
        if (!this.lastMinimapUpdate || now - this.lastMinimapUpdate > 200) {
            this.renderer.drawMinimap();
            this.lastMinimapUpdate = now;
        }
    }
}

window.onload = () => {
    const game = new GameClient();
    game.init();
    window.gameInstance = game;
};
