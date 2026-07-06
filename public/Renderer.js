import { CAMERA_ZOOM_FACTOR, CAMERA_ZOOM_MULTIPLIER, CAMERA_ZOOM_SMOOTHING, CAMERA_MOVE_SMOOTHING } from './Constants.client.js';
import ObjectPool from '/shared/ObjectPool.js';

class Renderer {
    constructor(gameState) {
        this.gameState = gameState;
        this.backgroundCanvas = document.getElementById('backgroundCanvas');
        this.backgroundCtx = this.backgroundCanvas.getContext('2d');
        this.gameCanvas = document.getElementById('gameCanvas');
        this.ctx = this.gameCanvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

        this.camera = { x: 0, y: 0, zoom: 1 };

        this.particlePool = new ObjectPool(
            () => ({ x: 0, y: 0, vx: 0, vy: 0, radius: 0, color: '', alpha: 1 }),
            (particle) => {
                particle.x = particle.y = particle.vx = particle.vy = 0;
                particle.radius = 0;
                particle.alpha = 1;
                particle.color = '';
            }
        );
        this.particles = [];

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.gameCanvas.width = window.innerWidth;
        this.gameCanvas.height = window.innerHeight;
        this.backgroundCanvas.width = window.innerWidth;
        this.backgroundCanvas.height = window.innerHeight;

        if (this.minimapCanvas) {
            this.minimapCanvas.width = 200;
            this.minimapCanvas.height = 200;
        }

        this.drawStaticBackground();
    }

    updateCamera() {
        const self = this.gameState.getPlayer(this.gameState.selfId);
        if (!self) return;

        // On the first frame where we find our player, snap the camera
        // directly to their position instead of slowly smoothing from (0,0).
        if (!this.cameraInitialized) {
            this.camera.x = self.x;
            this.camera.y = self.y;
            this.cameraInitialized = true;
        } else {
            this.camera.x += (self.x - this.camera.x) * CAMERA_MOVE_SMOOTHING;
            this.camera.y += (self.y - this.camera.y) * CAMERA_MOVE_SMOOTHING;
        }

        const targetZoom = Math.pow(self.maxLength / 30, CAMERA_ZOOM_FACTOR) * CAMERA_ZOOM_MULTIPLIER;
        this.camera.zoom += (targetZoom - this.camera.zoom) * CAMERA_ZOOM_SMOOTHING;
    }

    draw() {
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

        const self = this.gameState.getPlayer(this.gameState.selfId);

        if (!self) {
            this.ctx.restore();
            return;
        }

        this.ctx.translate(this.gameCanvas.width / 2, this.gameCanvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        this.drawWorld();

        const halfW = (this.gameCanvas.width / this.camera.zoom) / 2;
        const halfH = (this.gameCanvas.height / this.camera.zoom) / 2;
        const left = this.camera.x - halfW * 1.5;
        const right = this.camera.x + halfW * 1.5;
        const top = this.camera.y - halfH * 1.5;
        const bottom = this.camera.y + halfH * 1.5;

        const inView = (x, y, r = 0) => x + r >= left && x - r <= right && y + r >= top && y - r <= bottom;

        const danceTime = Date.now() / 1000 * 0.5;

        this.gameState.food.forEach(f => {
            if (inView(f.x, f.y, f.radius)) this.drawFood(f, danceTime);
        });
        this.gameState.powerups.forEach(p => {
            if (inView(p.x, p.y, p.radius)) this.drawPowerUp(p);
        });

        this.gameState.players.forEach(p => {
            if (p.isDead) return;
            if (inView(p.x, p.y, (p.radius || 0) * 2 + 200)) this.drawCreature(p);
        });

        this.drawParticles();

        this.ctx.restore();
    }

    drawWorld() {
        const gridSize = 200;
        const halfWorld = this.gameState.worldSize / 2;

        const halfW = (this.gameCanvas.width / this.camera.zoom) / 2;
        const halfH = (this.gameCanvas.height / this.camera.zoom) / 2;
        const left = Math.max(-halfWorld, this.camera.x - halfW - gridSize);
        const right = Math.min(halfWorld, this.camera.x + halfW + gridSize);
        const top = Math.max(-halfWorld, this.camera.y - halfH - gridSize);
        const bottom = Math.min(halfWorld, this.camera.y + halfH + gridSize);

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        for (let x = Math.floor(left / gridSize) * gridSize; x <= right; x += gridSize) {
            this.ctx.moveTo(x, top);
            this.ctx.lineTo(x, bottom);
        }
        for (let y = Math.floor(top / gridSize) * gridSize; y <= bottom; y += gridSize) {
            this.ctx.moveTo(left, y);
            this.ctx.lineTo(right, y);
        }

        this.ctx.stroke();

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 10;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, halfWorld, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawStaticBackground() {
        this.backgroundCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
        this.backgroundCtx.fillStyle = '#0b0c10';
        this.backgroundCtx.fillRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);
    }

    drawFood(f, danceTime) {
        this.ctx.fillStyle = f.color;
        this.ctx.beginPath();

        let dx = 0;
        let dy = 0;
        if (f.type !== 'butterfly') {
            const danceOffset = (f.x * 7 + f.y * 13) % (2 * Math.PI);
            dx = Math.cos(danceTime + danceOffset) * 2.5;
            dy = Math.sin(danceTime + danceOffset) * 2.5;
        }

        this.ctx.arc(f.x + dx, f.y + dy, f.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPowerUp(p) {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawCreature(p) {
        if (!p.body || p.body.length === 0) {
            return;
        }

        this.ctx.save();
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        const head = p.body.get(0);
        if (!head) {
            this.ctx.restore();
            return;
        }

        let baseColor = p.color;
        let borderColor;

        if (p.skin === 'rainbow') {
            p.hue = (Date.now() / 10) % 360;
            baseColor = `hsl(${p.hue}, 100%, 70%)`;
            borderColor = `hsl(${p.hue}, 100%, 50%)`;
        } else if (p.skin === 'galaxy') {
            baseColor = '#191970';
            borderColor = '#000033';
        } else {
            if (p._colorDirty || !p._borderColor) {
                p._borderColor = this.adjustColorBrightness(p.color, -30);
                p._colorDirty = false;
            }
            borderColor = p._borderColor;
        }

        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = p.radius * 2 + 2;
        this.ctx.beginPath();
        this.ctx.moveTo(p.body.get(0).x, p.body.get(0).y);
        for (let i = 1; i < p.body.length; i++) {
            const segment = p.body.get(i);
            this.ctx.lineTo(segment.x, segment.y);
        }
        this.ctx.stroke();

        this.ctx.strokeStyle = baseColor;
        this.ctx.lineWidth = p.radius * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(p.body.get(0).x, p.body.get(0).y);
        for (let i = 1; i < p.body.length; i++) {
            const segment = p.body.get(i);
            this.ctx.lineTo(segment.x, segment.y);
        }
        this.ctx.stroke();

        this.ctx.fillStyle = borderColor;
        this.ctx.beginPath();
        this.ctx.arc(head.x, head.y, p.radius + 1, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = baseColor;
        this.ctx.beginPath();
        this.ctx.arc(head.x, head.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();

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

        const pupilRadius = eyeRadius / 1.8;
        const pupilLookOffset = p.radius * 0.15;
        const pupilX = head.x + Math.cos(p.angle) * pupilLookOffset;
        const pupilY = head.y + Math.sin(p.angle) * pupilLookOffset;

        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(pupilX + eyeXOffset, pupilY + eyeYOffset, pupilRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(pupilX - eyeXOffset, pupilY - eyeYOffset, pupilRadius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();

        this.ctx.save();
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.strokeText(p.nickname, head.x, head.y - p.radius - 15);
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(p.nickname, head.x, head.y - p.radius - 15);
        this.ctx.restore();
    }

    adjustColorBrightness(color, amount) {
        const usePound = color[0] === '#';
        const col = usePound ? color.slice(1) : color;

        const num = parseInt(col, 16);
        let r = (num >> 16) + amount;
        let g = (num >> 8 & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;

        r = r > 255 ? 255 : r < 0 ? 0 : r;
        g = g > 255 ? 255 : g < 0 ? 0 : g;
        b = b > 255 ? 255 : b < 0 ? 0 : b;

        return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.01;
            if (p.alpha <= 0) {
                this.particlePool.release(p);
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    drawMinimap() {
        if (!this.minimapCtx) return;

        const size = 200;
        const halfWorld = this.gameState.worldSize / 2;
        const scale = size / this.gameState.worldSize;
        const center = size / 2;
        const radius = size / 2;

        this.minimapCtx.clearRect(0, 0, size, size);

        this.minimapCtx.save();
        this.minimapCtx.beginPath();
        this.minimapCtx.arc(center, center, radius, 0, Math.PI * 2);
        this.minimapCtx.clip();

        this.minimapCtx.fillStyle = '#000000';
        this.minimapCtx.fillRect(0, 0, size, size);

        this.gameState.food.forEach(f => {
            const miniX = ((f.x + halfWorld) * scale);
            const miniY = ((f.y + halfWorld) * scale);
            this.minimapCtx.fillStyle = f.color;
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(miniX, miniY, 1, 0, Math.PI * 2);
            this.minimapCtx.fill();
        });

        this.minimapCtx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        this.minimapCtx.lineWidth = 3;
        this.minimapCtx.beginPath();
        this.minimapCtx.arc(center, center, radius - 2, 0, Math.PI * 2);
        this.minimapCtx.stroke();

        const self = this.gameState.getPlayer(this.gameState.selfId);
        if (self) {
            const miniX = ((self.x + halfWorld) * scale);
            const miniY = ((self.y + halfWorld) * scale);

            this.minimapCtx.strokeStyle = '#000';
            this.minimapCtx.lineWidth = 2;
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(miniX, miniY, 5, 0, Math.PI * 2);
            this.minimapCtx.stroke();

            this.minimapCtx.fillStyle = '#00FF00';
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(miniX, miniY, 4, 0, Math.PI * 2);
            this.minimapCtx.fill();
        }

        this.minimapCtx.restore();
    }
}

export default Renderer;
