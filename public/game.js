import GameState from './GameState.js';
import InputManager from './InputManager.js';
import UIManager from './UIManager.js';
import SocketClient from './SocketClient.js';
import Renderer from './Renderer.js';
import PerformanceMonitor from './PerformanceMonitor.js';
import {
    TURN_RATE_MIN,
    TURN_RATE_MAX_INITIAL,
    LENGTH_DIVISOR_TURN_RATE,
    BASE_SPEED_MIN,
    BASE_SPEED_MAX_INITIAL,
    LENGTH_DIVISOR_SPEED,
    BOOST_SPEED_MULTIPLIER
} from './Constants.client.js';

class GameClient {
    constructor() {
        this.gameState = new GameState();
        this.uiManager = new UIManager();
        this.socketClient = new SocketClient();
        this.renderer = new Renderer(this.gameState);
        this.inputManager = new InputManager(this.renderer.gameCanvas);
        this.perfMonitor = new PerformanceMonitor();

        this.isDead = false;
        this.gameLoopRunning = false;
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

        this.socketClient.onGameState = (delta) => {
            this.perfMonitor.markUpdateStart();
            this.gameState.processDelta(delta);
            this.perfMonitor.markUpdateEnd();
        };

        this.socketClient.onDeath = (data) => {
            this.isDead = true;
            this.uiManager.showDeathScreen(data.score);
            this.renderer.gameCanvas.style.opacity = '0.3';
            this.renderer.gameCanvas.style.display = 'none'; // Hide canvas on death
        };
        
        this.socketClient.onPong = (ping) => {
            this.perfMonitor.updateNetworkLatency(ping);
        };
    }

    joinGame() {
        const details = this.uiManager.getLoginDetails();
        this.socketClient.joinGame(details);
        this.startGame();
    }

    startGame() {
        this.uiManager.showGameUI();
        this.isDead = false;

        if (!this.gameLoopRunning) {
            this.gameLoopRunning = true;
            requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        }
    }

    gameLoop(timestamp) {
        this.perfMonitor.beginFrame(timestamp);

        this.perfMonitor.markUpdateStart();
        this.update();
        this.perfMonitor.markUpdateEnd();

        this.perfMonitor.markRenderStart();
        this.renderer.draw();
        this.uiManager.updateScoreAndLeaderboard(this.gameState.players, this.gameState.selfId);
        this.renderer.updateCamera();
        this.perfMonitor.markRenderEnd();

        this.perfMonitor.endFrame();

        if (this.gameLoopRunning) {
            requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }

    update() {
        const self = this.gameState.self;
        if (!self) return;

        const input = this.inputManager.getInput();

        if (this.isDead) {
            this.socketClient.sendPlayerUpdate({ angle: self.angle, isBoosting: false });
            return;
        }

        // Client-side prediction
        const worldMouseX = (input.mouse.x - this.renderer.gameCanvas.width / 2) / this.renderer.camera.zoom + self.x;
        const worldMouseY = (input.mouse.y - this.renderer.gameCanvas.height / 2) / this.renderer.camera.zoom + self.y;
        const targetAngle = Math.atan2(worldMouseY - self.y, worldMouseX - self.x);
        this.socketClient.sendPlayerUpdate({ angle: targetAngle, isBoosting: input.isBoosting });

        const angleDiff = targetAngle - self.angle;
        self.angle += Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)) * self.turnRate;

        self.turnRate = Math.max(TURN_RATE_MIN, TURN_RATE_MAX_INITIAL - (self.maxLength / LENGTH_DIVISOR_TURN_RATE) * TURN_RATE_MIN);
        self.baseSpeed = Math.max(BASE_SPEED_MIN, BASE_SPEED_MAX_INITIAL - (self.maxLength / LENGTH_DIVISOR_SPEED));
        self.speed = input.isBoosting ? self.baseSpeed * BOOST_SPEED_MULTIPLIER : self.baseSpeed;

        self.x += Math.cos(self.angle) * self.speed;
        self.y += Math.sin(self.angle) * self.speed;

        self.body.addFirst({ x: self.x, y: self.y });
        while (self.body.length > self.maxLength) {
            self.body.removeLast();
        }

        // Interpolation
        this.gameState.players.forEach(p => {
            if (p.targetX) {
                const factor = (p.id === this.gameState.selfId) ? 0.05 : 0.15;
                p.x += (p.targetX - p.x) * factor;
                p.y += (p.targetY - p.y) * factor;
            }
        });

        this.renderer.updateParticles();
        this.uiManager.toggleDebugPanel(input.showDebugPanel);
        if (input.showDebugPanel) {
            this.uiManager.updateDebugPanel(this.perfMonitor.getMetrics(), this.gameState);
        }
    }
}

window.onload = () => {
    const game = new GameClient();
    game.init();
    window.gameInstance = game; // For debugging
};