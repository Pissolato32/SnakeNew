/**
 * A Circular Buffer implementation that can dynamically grow.
 * Optimized for queue-like operations (adding to one end, removing from the other).
 */
class CircularBuffer {
    constructor(initialCapacity = 50) {
        this.buffer = new Array(initialCapacity);
        this.capacity = initialCapacity;
        this.length = 0;
        this.head = 0; // Points to the first element
        this.tail = 0; // Points to the next available slot for the last element
    }

    /**
     * Adds an item to the front of the buffer (like unshift).
     * @param {*} item The item to add.
     */
    addFirst(item) {
        if (this.length === this.capacity) {
            this._grow();
        }
        this.head = (this.head - 1 + this.capacity) % this.capacity;
        this.buffer[this.head] = item;
        this.length++;
    }

    /**
     * Removes an item from the end of the buffer (like pop).
     * @returns {*} The removed item.
     */
    removeLast() {
        if (this.length === 0) {
            return undefined;
        }
        this.tail = (this.tail - 1 + this.capacity) % this.capacity;
        const item = this.buffer[this.tail];
        this.buffer[this.tail] = undefined; // Clear the reference
        this.length--;
        return item;
    }

    /**
     * Gets an item at a specific index from the start of the buffer.
     * @param {number} index The index to retrieve.
     * @returns {*} The item at the specified index.
     */
    get(index) {
        if (index < 0 || index >= this.length) {
            return undefined;
        }
        const bufferIndex = (this.head + index) % this.capacity;
        return this.buffer[bufferIndex];
    }

    /**
     * Returns an array representation of the buffer, from head to tail.
     * @returns {Array<*>}
     */
    toArray() {
        const arr = [];
        for (let i = 0; i < this.length; i++) {
            arr.push(this.get(i));
        }
        return arr;
    }

    /**
     * Doubles the buffer's capacity when it's full.
     */
    _grow() {
        const newCapacity = this.capacity * 2;
        const newBuffer = new Array(newCapacity);

        // Re-order elements into the new buffer
        for (let i = 0; i < this.length; i++) {
            newBuffer[i] = this.get(i);
        }

        this.buffer = newBuffer;
        this.capacity = newCapacity;
        this.head = 0;
        this.tail = this.length;
    }
}

// =================================================================================
// Game.js - Client-side logic for slither.io style game
// =================================================================================

import { FOOD_MAGNET_RADIUS, FOOD_MAGNET_FORCE } from './Constants.client.js';

class Game {
    constructor() {
        // Core Components
        this.backgroundCanvas = document.getElementById('backgroundCanvas');
        this.backgroundCtx = this.backgroundCanvas.getContext('2d');
        this.gameCanvas = document.getElementById('gameCanvas');
        this.ctx = this.gameCanvas.getContext('2d');
        this.socket = null;

        // UI Elements
        this.loginScreen = document.getElementById('loginScreen');
        this.gameUI = document.getElementById('gameUI');
        this.deathScreen = document.getElementById('deathScreen');
        this.playButton = document.getElementById('playButton');
        this.playAgainButton = document.getElementById('playAgainButton');
        this.nicknameInput = document.getElementById('nicknameInput');
        this.scoreValue = document.getElementById('scoreValue');
        this.finalScore = document.getElementById('finalScore');
        this.leaderboardList = document.getElementById('leaderboardList');

        // Game State
        this.players = {};
        this.food = [];
        this.powerups = [];
        this.selfId = null;
        // this.worldSize = 3000; // Removed hardcoded worldSize

        // Client State
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.mouse = { x: 0, y: 0 };
        this.isBoosting = false;
        this.gameLoopRunning = false;
        this.isDead = false; // Add this line
        this.showDebugPanel = false;
        this.ping = 0;
        this.lastPingTime = 0;
        this.particles = []; // Array to hold particles
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.socket = io();
        this.setupSocketListeners();

        this.playButton.addEventListener('click', () => this.joinGame());
        this.playAgainButton.addEventListener('click', () => {
            this.deathScreen.style.display = 'none';
            this.loginScreen.style.display = 'flex';
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'd' && e.ctrlKey) {
                e.preventDefault(); // Prevent default browser action (e.g., bookmark)
                this.showDebugPanel = !this.showDebugPanel;
            }
        });

        setInterval(() => {
            this.lastPingTime = Date.now();
            this.socket.emit('ping');
        }, 2000);
    }
    
    joinGame() {
        const nickname = this.nicknameInput.value || 'Anonymous';
        this.socket.emit('join-game', nickname);
        this.startGame();
    }

    setupSocketListeners() {
        this.socket.on('connect', () => { this.selfId = this.socket.id; });
        this.socket.on('game-setup', (config) => { 
            this.worldSize = config.worldSize; 
            this.drawStaticBackground(); // Draw static background once
        });
        this.socket.on('game-state', (delta) => {
            // Apply player deltas
            for (const id in delta.players.added) {
                this.players[id] = delta.players.added[id];
                this.players[id].targetX = this.players[id].x; // Initialize target for interpolation
                this.players[id].targetY = this.players[id].y;
                this.players[id].body = new CircularBuffer(); // Initialize CircularBuffer for new players
            }
            for (const id in delta.players.updated) {
                const updatedProps = delta.players.updated[id];
                const player = this.players[id];
                if (player) {
                    // Update x and y for interpolation targets
                    if (updatedProps.x !== undefined) { player.targetX = updatedProps.x; }
                    if (updatedProps.y !== undefined) { player.targetY = updatedProps.y; }

                    // Update maxLength if it changed
                    if (updatedProps.maxLength !== undefined) { player.maxLength = updatedProps.maxLength; }

                    // Reconstruct body based on new head position and maxLength
                    // This is a simplified reconstruction. The server is the source of truth.
                    // The client will just add the new head and trim the tail.
                    if (updatedProps.x !== undefined || updatedProps.y !== undefined) {
                        // Add the new head position
                        player.body.addFirst({ x: updatedProps.x !== undefined ? updatedProps.x : player.x,
                                              y: updatedProps.y !== undefined ? updatedProps.y : player.y });
                    }

                    // Trim the body to the new maxLength
                    while (player.body.length > player.maxLength) {
                        player.body.removeLast();
                    }

                    // Update other properties
                    for (const key in updatedProps) {
                        if (key === 'x' || key === 'y' || key === 'maxLength' || key === 'body') {
                            // Already handled or skipped
                            continue;
                        }
                        player[key] = updatedProps[key];
                    }
                }
            }
            delta.players.removed.forEach(id => {
                delete this.players[id];
            });

            // Apply food deltas
            delta.food.added.forEach(f => {
                this.food.push(f);
            });
            delta.food.removed.forEach(id => {
                this.food = this.food.filter(f => f.id !== id);
            });
            delta.food.updated.forEach(updatedFood => {
                const foodItem = this.food.find(f => f.id === updatedFood.id);
                if (foodItem) {
                    for (const key in updatedFood) {
                        foodItem[key] = updatedFood[key];
                    }
                }
            });

            // Apply powerup deltas
            delta.powerups.added.forEach(p => {
                this.powerups.push(p);
            });
            delta.powerups.removed.forEach(id => {
                const removedPowerup = this.powerups.find(p => p.id === id);
                if (removedPowerup) {
                    // Create particles at the powerup's position
                    for (let i = 0; i < 10; i++) {
                        this.particles.push({
                            x: removedPowerup.x + (Math.random() - 0.5) * 10,
                            y: removedPowerup.y + (Math.random() - 0.5) * 10,
                            vx: (Math.random() - 0.5) * 5,
                            vy: (Math.random() - 0.5) * 5,
                            radius: Math.random() * 5 + 2,
                            color: removedPowerup.color,
                            alpha: 1
                        });
                    }
                }
                this.powerups = this.powerups.filter(p => p.id !== id);
            });
            delta.powerups.updated.forEach(updatedPowerup => {
                const powerupItem = this.powerups.find(p => p.id === updatedPowerup.id);
                if (powerupItem) {
                    for (const key in updatedPowerup) {
                        powerupItem[key] = updatedPowerup[key];
                    }
                }
            });
        });
        this.socket.on('death', (data) => {
            this.isDead = true; // Set a flag that the player is dead
            this.finalScore.textContent = data.score;
            this.deathScreen.style.display = 'flex';
            this.gameCanvas.style.opacity = '0.3'; // Make canvas transparent
            this.gameUI.style.display = 'none';
            // Do NOT set this.gameLoopRunning = false;
        });
        this.socket.on('pong', () => {
            this.ping = Date.now() - this.lastPingTime;
            this.socket.emit('pingUpdate', this.ping); // Send ping to server
        });
    }

    startGame() {
        this.loginScreen.style.display = 'none';
        this.deathScreen.style.display = 'none';
        this.gameCanvas.style.display = 'block';
        this.gameCanvas.style.opacity = '1'; // Reset opacity
        this.gameUI.style.display = 'block';
        this.isDead = false; // Reset dead flag

        this.gameCanvas.addEventListener('mousemove', (e) => {
            const rect = this.gameCanvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        this.gameCanvas.addEventListener('mousedown', () => { this.isBoosting = true; });
        this.gameCanvas.addEventListener('mouseup', () => { this.isBoosting = false; });

        if (!this.gameLoopRunning) {
            this.gameLoopRunning = true;
            this.gameLoop();
        }
    }

    gameLoop() {
        if (!this.gameLoopRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        const self = this.players[this.selfId];
        if (!self) return;

        if (this.showDebugPanel) {
            console.log(`CLIENT - Player ${self.id} Pos: (${self.x.toFixed(2)}, ${self.y.toFixed(2)})`);
        }

        if (this.isDead) { // If player is dead, stop sending input
            this.socket.emit('player-update', { angle: self.angle, isBoosting: false }); // Send no input, no boosting
            // Still update camera for smooth view of the death scene
            this.camera.x += (self.x - this.camera.x) * 0.1;
            this.camera.y += (self.y - this.camera.y) * 0.1;
            const targetZoom = Math.pow(self.radius, -0.3) * 3;
            this.camera.zoom += (targetZoom - this.camera.zoom) * 0.05;
            return; // Stop further updates for the dead player
        }

        // --- Client-Side Prediction ---
        // Calculate angle and send input to server
        const worldMouseX = (this.mouse.x - this.gameCanvas.width / 2) / this.camera.zoom + self.x;
        const worldMouseY = (this.mouse.y - this.gameCanvas.height / 2) / this.camera.zoom + self.y;
        const targetAngle = Math.atan2(worldMouseY - self.y, worldMouseX - self.x);
        this.socket.emit('player-update', { angle: targetAngle, isBoosting: this.isBoosting });

        // Predict own movement
        const angleDiff = targetAngle - self.angle;
        self.angle += Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)) * self.turnRate;
        const baseSpeed = Math.max(3, 4 - (self.maxLength / 1000));
        self.baseSpeed = baseSpeed;
        const speed = self.isBoosting ? baseSpeed * 1.5 : baseSpeed; // This speed is for client-side prediction only
        self.currentSpeed = speed; // Store the calculated speed

        // Interpolate all players to their target positions from the server
        for(const id in this.players) {
            const p = this.players[id];
            if(p.targetX) {
                p.x += (p.targetX - p.x) * 0.3;
                p.y += (p.targetY - p.y) * 0.3;
            }
        }

        // Update camera
        this.camera.x += (self.x - this.camera.x) * 0.1;
        this.camera.y += (self.y - this.camera.y) * 0.1;
        const targetZoom = Math.pow(self.radius, -0.3) * 3;
        this.camera.zoom += (targetZoom - this.camera.zoom) * 0.05;
        this.updateParticles(); // Update particles
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.01; // Fade out
            if (p.alpha <= 0) {
                this.particles.splice(i, 1); // Remove if faded
            }
        }
    }

    draw() {
        this.ctx.save();
        this.ctx.fillStyle = '#121212';
        this.ctx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

        const self = this.players[this.selfId];
        if (!self) {
            this.ctx.restore();
            return;
        }

        this.ctx.translate(this.gameCanvas.width / 2, this.gameCanvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        this.drawWorld(); // Draw the world border after transformations

        this.food.forEach(f => {
            this.drawFood(f);
            if (this.selfId && this.players[this.selfId]) {
                const self = this.players[this.selfId];
                const distance = Math.hypot(self.x - f.x, self.y - f.y);
                const radiiSum = self.radius + f.radius;
                const collisionDetected = distance < radiiSum;
                console.log(`CLIENT - Player Pos: (${self.x.toFixed(2)}, ${self.y.toFixed(2)}), Radius: ${self.radius.toFixed(2)}`);
                console.log(`CLIENT - Food Pos: (${f.x.toFixed(2)}, ${f.y.toFixed(2)}), Radius: ${f.radius.toFixed(2)}`);
                console.log(`CLIENT - Distance: ${distance.toFixed(2)}, Radii Sum: ${radiiSum.toFixed(2)}, Collision: ${collisionDetected}`);
                console.log(`CLIENT - Camera: (${this.camera.x.toFixed(2)}, ${this.camera.y.toFixed(2)}), Zoom: ${this.camera.zoom.toFixed(2)}`);
            }
        });
        this.powerups.forEach(p => this.drawPowerUp(p));
        for (const id in this.players) {
            this.drawSnake(this.players[id]);
        }

        this.drawParticles(); // Draw particles

        this.ctx.restore();
        this.drawUI();
    }

    // --- Drawing & UI Helpers ---
    resizeCanvas() { this.gameCanvas.width = window.innerWidth; this.gameCanvas.height = window.innerHeight; }

    drawWorld() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.worldSize / 2, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawStaticBackground() {
        // Clear the background canvas before redrawing
        this.backgroundCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);

        // Draw the static background elements on the background canvas
        this.backgroundCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.backgroundCtx.lineWidth = 2;
        this.backgroundCtx.beginPath();
        this.backgroundCtx.arc(this.backgroundCanvas.width / 2, this.backgroundCanvas.height / 2, this.worldSize / 2, 0, Math.PI * 2);
        this.backgroundCtx.stroke();
    }

    drawFood(f) {
        this.ctx.beginPath();
        this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = f.color;
        this.ctx.fill();
        // Add visual indicator for client-side collision proximity
        if (this.selfId && this.players[this.selfId]) {
            const self = this.players[this.selfId];
            const distance = Math.hypot(self.x - f.x, self.y - f.y);
            const radiiSum = self.radius + f.radius;
            const collisionDetected = distance < radiiSum;

            if (collisionDetected) {
                this.ctx.strokeStyle = 'red'; // Highlight in red
                this.ctx.lineWidth = 3; // Make border thicker
            } else {
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Original color
                this.ctx.lineWidth = 1; // Original thickness
            }
        } else {
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Original color if self player not found
            this.ctx.lineWidth = 1; // Original thickness
        }
        this.ctx.stroke();
    }

    drawPowerUp(p) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.fill();
        // Add a pulsing effect
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(Date.now() / 200))})`;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }

    drawSnake(p) {
        if (p.body.length === 0) {
            return; // Não faz nada se a cobra não tiver corpo
        }
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 2;

        // Draw the body segments (from tail to neck)
        const segmentDrawInterval = Math.max(1, Math.floor(p.body.length / 100)); // Draw fewer segments for longer snakes
        for (let i = 1; i < p.body.length; i += segmentDrawInterval) {
            const segment = p.body.get(i);
            if (segment) { // Add this check
                const radius = p.radius * (1 - (i / p.body.length) * 0.5);
                this.ctx.beginPath();
                this.ctx.arc(segment.x, segment.y, radius, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.fill();
                this.ctx.stroke();
            }
        }

        // Now, draw the head on top of the body (p.body[0])
        const head = p.body.get(0);
        this.ctx.beginPath();
        this.ctx.arc(head.x, head.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.fill();
        this.ctx.stroke();

        // Draw the eyes and nickname on the head
        const eyeRadius = p.radius / 3;
        const eyeXOffset = Math.cos(p.angle + Math.PI / 2) * p.radius * 0.6;
        const eyeYOffset = Math.sin(p.angle + Math.PI / 2) * p.radius * 0.6;
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(head.x + eyeXOffset, head.y + eyeYOffset, eyeRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(head.x - eyeXOffset, head.y - eyeYOffset, eyeRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(head.x + eyeXOffset, head.y + eyeYOffset, eyeRadius / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(head.x - eyeXOffset, head.y - eyeYOffset, eyeRadius / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(p.nickname, head.x, head.y + p.radius + 20);
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    drawUI() {
        this.drawMinimap();
        this.updateScoreAndLeaderboard();

        const self = this.players[this.selfId];
        if (!self) return;

        if (self && self.powerups.foodMagnet && self.powerups.foodMagnet.active) {
            this.ctx.save();
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            const remainingTime = Math.ceil((self.powerups.foodMagnet.endTime - Date.now()) / 1000);
            this.ctx.fillText(`Food Magnet: ${remainingTime}s`, this.gameCanvas.width / 2, 50);
            this.ctx.restore();
        }

        if (this.showDebugPanel) {
            this.drawDebugPanel();
        }
    }

    drawDebugPanel() {
        const self = this.players[this.selfId];
        if (!self) return;

        const botCount = Object.values(this.players).filter(p => p.isBot).length;

        const debugInfo = [
            `X: ${self.x.toFixed(2)}`,
            `Y: ${self.y.toFixed(2)}`,
            `Max Speed: 4.00`,
            `Min Speed: 3.00`,
            `Base Speed: ${self.baseSpeed ? self.baseSpeed.toFixed(2) : 'N/A'}`, // This will now correctly show the size-dependent base speed
            `Current Speed: ${self.currentSpeed ? self.currentSpeed.toFixed(2) : 'N/A'}`, // This will now correctly show the size-dependent current speed
            `Turn Rate: ${self.turnRate ? self.turnRate.toFixed(4) : 'N/A'}`, // This should now be constant at 0.1
            `Angle: ${self.angle.toFixed(2)}`,
            `Size (Score): ${Math.floor(self.maxLength)}`,
            `Radius: ${self.radius.toFixed(2)}`,
            `RGB: (${self.rgb.r}, ${self.rgb.g}, ${self.rgb.b})`,
            `Boosting: ${this.isBoosting}`,
            `Bot Count: ${botCount}`,
            `Ping: ${this.ping} ms`
        ];

        this.ctx.save();
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'left';

        let yPos = 20;
        for (const info of debugInfo) {
            this.ctx.fillText(info, 20, yPos);
            yPos += 20;
        }

        this.ctx.restore();
    }

    drawMinimap() {
        const minimapSize = 200;
        const minimapX = this.gameCanvas.width - minimapSize - 20;
        const minimapY = this.gameCanvas.height - minimapSize - 20;
        const halfWorld = this.worldSize / 2;
        const minimapScale = minimapSize / this.worldSize;

        const minimapCenterX = minimapX + minimapSize / 2;
        const minimapCenterY = minimapY + minimapSize / 2;
        const minimapRadius = minimapSize / 2;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(minimapCenterX, minimapCenterY, minimapRadius, 0, Math.PI * 2); // Draw the circular shape
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fill();
        this.ctx.lineWidth = 3; // Make border more visible
        this.ctx.strokeStyle = 'white'; // White border
        this.ctx.stroke();
        this.ctx.clip(); // Clip subsequent drawings to this circular path

        const gridSize = 20; // Number of cells in the grid (e.g., 20x20)
        const cellSize = minimapSize / gridSize;

        // Create a 2D array to store density
        const densityGrid = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));

        // Populate density grid with players
        for (const id in this.players) {
            const p = this.players[id];
            const gridX = Math.floor((p.x + halfWorld) * minimapScale / cellSize);
            const gridY = Math.floor((p.y + halfWorld) * minimapScale / cellSize);

            if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
                densityGrid[gridY][gridX] += 1; // Increment for players
            }
        }

        // Populate density grid with food
        this.food.forEach(f => {
            const gridX = Math.floor((f.x + halfWorld) * minimapScale / cellSize);
            const gridY = Math.floor((f.y + halfWorld) * minimapScale / cellSize);

            if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
                densityGrid[gridY][gridX] += f.score * 0.2; // Increment for food based on score (less weight than players)
            }
        });

        // Draw heatmap
        let maxDensity = 0;
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (densityGrid[y][x] > maxDensity) {
                    maxDensity = densityGrid[y][x];
                }
            }
        }

        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const density = densityGrid[y][x];
                if (density > 0) {
                    const alpha = Math.min(1, density / maxDensity); // Normalize density to alpha value
                    this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.7})`; // Red heatmap
                    // Adjust fillRect coordinates to be relative to the minimap's top-left corner
                    this.ctx.fillRect(minimapX + x * cellSize, minimapY + y * cellSize, cellSize, cellSize);
                }
            }
        }

        // Draw self player on top
        const self = this.players[this.selfId];
        if (self) {
            const playerX = minimapX + (self.x + halfWorld) * minimapScale;
            const playerY = minimapY + (self.y + halfWorld) * minimapScale;
            this.ctx.fillStyle = '#FFFFFF'; // White for self
            this.ctx.beginPath();
            this.ctx.arc(playerX, playerY, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    updateScoreAndLeaderboard() {
        const self = this.players[this.selfId];
        if (!self) return;
        this.scoreValue.textContent = Math.floor(self.maxLength);
        const sortedPlayers = Object.values(this.players).sort((a, b) => b.maxLength - a.maxLength);
        this.leaderboardList.innerHTML = '';
        sortedPlayers.slice(0, 10).forEach(p => {
            const li = document.createElement('li');
            li.textContent = `${p.nickname} - ${Math.floor(p.maxLength)}`;
            if (p.id === this.selfId) {
                li.style.color = '#4CAF50';
                li.style.fontWeight = 'bold';
            }
            this.leaderboardList.appendChild(li);
        });
    }
}

window.onload = () => {
    const game = new Game();
    game.init();
};