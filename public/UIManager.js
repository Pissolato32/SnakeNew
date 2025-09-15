import { UI_SOLID_COLORS, LEADERBOARD_SELF_COLOR } from './Constants.client.js';

class UIManager {
    constructor() {
        // UI Elements
        this.loginScreen = document.getElementById('loginScreen');
        this.gameUI = document.getElementById('gameUI');
        this.deathScreen = document.getElementById('deathScreen');
        this.playButton = document.getElementById('playButton');
        this.playAgainButton = document.getElementById('playAgainButton');
        this.nicknameInput = document.getElementById('nicknameInput');
        this.skinSelect = document.getElementById('skinSelect');
        this.scoreValue = document.getElementById('scoreValue');
        this.finalScore = document.getElementById('finalScore');
        this.leaderboardList = document.getElementById('leaderboardList');
        this.colorSelector = document.getElementById('colorSelector');
        this.colorDisplay = document.getElementById('colorDisplay');
        this.prevColor = document.getElementById('prevColor');
        this.nextColor = document.getElementById('nextColor');
        this.debugPanel = document.getElementById('debug-panel');
        console.log('UIManager: this.debugPanel =', this.debugPanel);

        this.solidColors = UI_SOLID_COLORS;
        this.currentColorIndex = 0;
        this.profilerChartInitialized = false;

        this.setupListeners();
        this.updateColorSelectorVisibility();
        this.updateColorDisplay();
    }

    setupListeners() {
        if (this.playButton) {
            this.playButton.addEventListener('click', () => this.onPlayButtonClick());
        }
        if (this.playAgainButton) {
            this.playAgainButton.addEventListener('click', () => this.onPlayAgainButtonClick());
        }
        if (this.skinSelect) {
            this.skinSelect.addEventListener('change', () => this.updateColorSelectorVisibility());
        }
        if (this.prevColor) {
            this.prevColor.addEventListener('click', () => this.changeColor(-1));
        }
        if (this.nextColor) {
            this.nextColor.addEventListener('click', () => this.changeColor(1));
        }

        if (this.debugPanel) {
            this.makeDraggable(this.debugPanel);
            const closeButton = this.debugPanel.querySelector('.close-button');
            if (closeButton) {
                closeButton.addEventListener('click', () => this.toggleDebugPanel(false));
            }
        }
    }

    onPlayButtonClick() {
        // This will be handled by the main game class
    }

    onPlayAgainButtonClick() {
        this.deathScreen.style.display = 'none';
        this.loginScreen.style.display = 'flex';
    }

    showGameUI() {
        this.loginScreen.style.display = 'none';
        this.deathScreen.style.display = 'none';
        this.gameUI.style.display = 'block';
    }

    showDeathScreen(score) {
        this.finalScore.textContent = score;
        this.deathScreen.style.display = 'flex';
        this.gameUI.style.display = 'none';
    }

    updateScoreAndLeaderboard(players, selfId) {
        const self = players.get(selfId);
        if (!self) return;
        this.scoreValue.textContent = Math.floor(self.maxLength);

        const sortedPlayers = Array.from(players.values()).sort((a, b) => b.maxLength - a.maxLength);
        this.leaderboardList.innerHTML = '';
        sortedPlayers.slice(0, 10).forEach(p => {
            const li = document.createElement('li');
            li.textContent = `${p.nickname} - ${Math.floor(p.maxLength)}`;
            if (p.id === selfId) {
                li.style.color = LEADERBOARD_SELF_COLOR;
                li.style.fontWeight = 'bold';
            }
            this.leaderboardList.appendChild(li);
        });
    }

    toggleDebugPanel(show) {
        if (this.debugPanel) {
            this.debugPanel.style.display = show ? 'block' : 'none';
            if (show && !this.profilerChartInitialized) {
                const profilerChartCanvas = this.debugPanel.querySelector('#profilerChart');
                if (profilerChartCanvas && window.initProfilerChart) {
                    window.initProfilerChart(profilerChartCanvas);
                    this.profilerChartInitialized = true;
                }
            }
        }
    }

    updateDebugPanel(metrics, gameState) {
        if (!this.debugPanel) return;

        // Update performance metrics
        document.getElementById('fpsValue').textContent = metrics.fps.toFixed(2);
        document.getElementById('frameTimeValue').textContent = metrics.frameTime.toFixed(2);
        document.getElementById('updateTimeValue').textContent = metrics.updateTime.toFixed(2);
        document.getElementById('renderTimeValue').textContent = metrics.renderTime.toFixed(2);
        document.getElementById('networkLatencyValue').textContent = metrics.networkLatency.toFixed(2);
        document.getElementById('memoryUsageValue').textContent = metrics.memoryUsage.toFixed(2);

        // Update player state
        const self = gameState.self;
        if (self) {
            document.getElementById('debugX').textContent = self.x.toFixed(2);
            document.getElementById('debugY').textContent = self.y.toFixed(2);
            document.getElementById('debugCurrentSpeed').textContent = self.speed.toFixed(2);
            document.getElementById('debugAngle').textContent = self.angle.toFixed(2);
            document.getElementById('debugSize').textContent = Math.floor(self.maxLength);
            document.getElementById('debugRadius').textContent = self.radius.toFixed(2);
            document.getElementById('debugBoosting').textContent = self.isBoosting;
        }

        // Update game state
        document.getElementById('debugBotCount').textContent = Array.from(gameState.players.values()).filter(p => p.isBot).length;
        document.getElementById('debugPing').textContent = `${metrics.networkLatency.toFixed(0)} ms`;

        // Update chart
        if (window.updateProfilerChart) {
            window.updateProfilerChart(metrics.frameTime);
        }
    }

    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = element.querySelector(".profiler-header");

        if (header) {
            header.onmousedown = dragMouseDown;
        } else {
            element.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    getLoginDetails() {
        return {
            nickname: this.nicknameInput.value || 'Anonymous',
            skin: this.skinSelect.value,
            color: this.solidColors[this.currentColorIndex]
        };
    }

    updateColorSelectorVisibility() {
        if (this.colorSelector) {
            this.colorSelector.style.display = this.skinSelect.value === 'default' ? 'flex' : 'none';
        }
    }

    changeColor(direction) {
        this.currentColorIndex += direction;
        if (this.currentColorIndex < 0) {
            this.currentColorIndex = this.solidColors.length - 1;
        }
        if (this.currentColorIndex >= this.solidColors.length) {
            this.currentColorIndex = 0;
        }
        this.updateColorDisplay();
    }

    updateColorDisplay() {
        if (this.colorDisplay) {
            this.colorDisplay.style.backgroundColor = this.solidColors[this.currentColorIndex];
        }
    }
}

export default UIManager;
