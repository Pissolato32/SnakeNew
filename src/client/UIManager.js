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

        this.energyValue = document.getElementById('energyValue');
        this.energyBar = document.getElementById('energyBar');
        this.hungerValue = document.getElementById('hungerValue');
        this.hungerBar = document.getElementById('hungerBar');
        this.stressValue = document.getElementById('stressValue');
        this.stressBar = document.getElementById('stressBar');
        this.fearValue = document.getElementById('fearValue');
        this.fearBar = document.getElementById('fearBar');
        this.fatigueValue = document.getElementById('fatigueValue');
        this.fatigueBar = document.getElementById('fatigueBar');
        this.blackboardState = document.getElementById('blackboardState');
        this.strategySliders = ['aggression', 'caution', 'curiosity', 'greed'];
        this.toggleFOV = document.getElementById('toggleFOV');
        this.showFOV = false;

        this.deathReason = document.getElementById('deathReason');
        this.deathSurvivalTime = document.getElementById('deathSurvivalTime');
        this.deathKills = document.getElementById('deathKills');
        this.deathFoodEaten = document.getElementById('deathFoodEaten');
        this.deathMaxHunger = document.getElementById('deathMaxHunger');
        this.deathMaxStress = document.getElementById('deathMaxStress');
        this.deathMaxFear = document.getElementById('deathMaxFear');

        this.solidColors = UI_SOLID_COLORS;
        this.currentColorIndex = 0;
        this.profilerChartInitialized = false;

        this.setupListeners();
        this.updateColorSelectorVisibility();
        this.updateColorDisplay();
    }

    setupListeners() {
        if (this.playButton) {
            this.playButton.addEventListener('click', () => {
                console.log('Play button clicked!');
                if (this.onPlayButtonClick) {
                    this.onPlayButtonClick();
                }
            });
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

        this.strategySliders.forEach(slider => {
            const rangeEl = document.getElementById(`${slider}Slider`);
            const numberEl = document.getElementById(`${slider}Value`);

            if (rangeEl && numberEl) {
                // Slider → Number input (real-time as user drags)
                rangeEl.addEventListener('input', () => {
                    const val = parseFloat(rangeEl.value);
                    numberEl.value = val.toFixed(2);
                    if (this.onStrategyChange) {
                        this.onStrategyChange(slider, val);
                    }
                });

                // Number input → Slider (when user types a value)
                numberEl.addEventListener('input', () => {
                    let val = parseFloat(numberEl.value);
                    if (isNaN(val)) return;
                    val = Math.max(0, Math.min(100, val));
                    rangeEl.value = val;
                    if (this.onStrategyChange) {
                        this.onStrategyChange(slider, val);
                    }
                });

                // Format to 2 decimals on blur (when user leaves the field)
                numberEl.addEventListener('blur', () => {
                    let val = parseFloat(numberEl.value);
                    if (isNaN(val)) val = 50;
                    val = Math.max(0, Math.min(100, val));
                    numberEl.value = val.toFixed(2);
                    rangeEl.value = val;
                });
            }
        });

        if (this.debugPanel) {
            this.makeDraggable(this.debugPanel);
            const closeButton = this.debugPanel.querySelector('.close-button');
            if (closeButton) {
                closeButton.addEventListener('click', () => this.toggleDebugPanel(false));
            }
        }

        if (this.toggleFOV) {
            this.toggleFOV.addEventListener('change', () => {
                this.showFOV = this.toggleFOV.checked;
            });
        }
    }

    onPlayButtonClick() {
        // This will be handled by the main game class
    }

    onPlayAgainButtonClick() {
        this.deathScreen.style.display = 'none';
        this.loginScreen.style.display = 'flex';
        if (this.onPlayAgain) this.onPlayAgain();
    }

    showGameUI() {
        this.loginScreen.classList.add('hidden');
        this.deathScreen.style.display = 'none';
        this.gameUI.classList.remove('hidden');
        
        // Show the canvas elements
        const gameCanvas = document.getElementById('gameCanvas');
        const backgroundCanvas = document.getElementById('backgroundCanvas');
        const minimapCanvas = document.getElementById('minimapCanvas');
        if (gameCanvas) gameCanvas.style.display = 'block';
        if (backgroundCanvas) backgroundCanvas.style.display = 'block';
        if (minimapCanvas) minimapCanvas.style.display = 'block';
    }

    showDeathScreen(score, stats = null) {
        this.finalScore.textContent = score;
        
        if (stats) {
            const survivalMs = Date.now() - (stats.bornAt || Date.now());
            const seconds = Math.floor(survivalMs / 1000) % 60;
            const minutes = Math.floor(survivalMs / 60000);
            const timeString = `${minutes}m ${seconds}s`;

            if (this.deathReason) this.deathReason.textContent = stats.deathReason || 'collision';
            if (this.deathSurvivalTime) this.deathSurvivalTime.textContent = timeString;
            if (this.deathKills) this.deathKills.textContent = stats.kills || 0;
            if (this.deathFoodEaten) this.deathFoodEaten.textContent = stats.foodEaten || 0;
            if (this.deathMaxHunger) this.deathMaxHunger.textContent = `${Math.round(stats.maxHungerReached || 0)}%`;
            if (this.deathMaxStress) this.deathMaxStress.textContent = `${Math.round(stats.maxStressReached || 0)}%`;
            if (this.deathMaxFear) this.deathMaxFear.textContent = `${Math.round(stats.maxFearReached || 0)}%`;
        }

        this.deathScreen.classList.remove('hidden');
        this.gameUI.classList.add('hidden');
    }

    updateScoreAndLeaderboard(players, selfId) {
        const now = Date.now();
        if (this.lastUiUpdate && now - this.lastUiUpdate < 100) {
            return;
        }
        this.lastUiUpdate = now;

        const self = players.get(selfId);
        if (!self) return;
        this.scoreValue.textContent = Math.floor(self.maxLength);

        const sortedPlayers = Array.from(players.values()).sort((a, b) => b.maxLength - a.maxLength);
        this.leaderboardList.innerHTML = '';
        sortedPlayers.slice(0, 10).forEach(p => {
            const li = document.createElement('li');
            li.textContent = `${p.nickname || 'Anonymous'} - ${Math.floor(p.maxLength)}`;
            if (p.id === selfId) {
                li.style.color = LEADERBOARD_SELF_COLOR;
                li.style.fontWeight = 'bold';
            }
            this.leaderboardList.appendChild(li);
        });

        if (self.needs) {
            if (this.energyValue) this.energyValue.textContent = Math.floor(self.needs.energy || 0);
            if (this.energyBar) this.energyBar.style.width = `${self.needs.energy || 0}%`;
            if (this.hungerValue) this.hungerValue.textContent = Math.floor(self.needs.hunger || 0);
            if (this.hungerBar) this.hungerBar.style.width = `${self.needs.hunger || 0}%`;
            if (this.stressValue) this.stressValue.textContent = Math.floor(self.needs.stress || 0);
            if (this.stressBar) this.stressBar.style.width = `${self.needs.stress || 0}%`;
            if (this.fearValue) this.fearValue.textContent = Math.floor(self.needs.fear || 0);
            if (this.fearBar) this.fearBar.style.width = `${self.needs.fear || 0}%`;
            if (this.fatigueValue) this.fatigueValue.textContent = Math.floor(self.needs.fatigue || 0);
            if (this.fatigueBar) this.fatigueBar.style.width = `${self.needs.fatigue || 0}%`;
        }
        if (self.blackboard && this.blackboardState) {
            this.blackboardState.textContent = `Goal: ${self.blackboard.currentGoal || 'EXPLORE'} | State: ${self.blackboard.emotionalState || 'CALM'}`;
        }
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

        const now = Date.now();
        if (this.lastDebugPanelUpdate && now - this.lastDebugPanelUpdate < 250) {
            return;
        }
        this.lastDebugPanelUpdate = now;

        const updateText = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        };

        updateText('fpsValue', metrics.fps.toFixed(1));
        updateText('p1LowFpsValue', metrics.p1LowFps.toFixed(1));
        updateText('frameTimeValue', `${metrics.avgFrameTime.toFixed(2)} ms`);
        updateText('updateTimeValue', `${metrics.avgUpdateTime.toFixed(3)} ms`);
        updateText('renderTimeValue', `${metrics.avgRenderTime.toFixed(3)} ms`);
        updateText('droppedFramesValue', `${metrics.droppedFrames} (${metrics.droppedFramePct.toFixed(1)}%)`);
        updateText('networkLatencyValue', `${metrics.networkLatency.toFixed(0)} ms`);
        updateText('memoryUsageValue', `${metrics.memoryUsage.toFixed(2)} MB`);

        updateText('debugBotCount', Array.from(gameState.players.values()).filter(p => p.isBot).length);
    }

    makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = element.querySelector('.profiler-header');

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
            element.style.top = (element.offsetTop - pos2) + 'px';
            element.style.left = (element.offsetLeft - pos1) + 'px';
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
