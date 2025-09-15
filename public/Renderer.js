import { CAMERA_ZOOM_FACTOR, CAMERA_ZOOM_MULTIPLIER, CAMERA_ZOOM_SMOOTHING, CAMERA_MOVE_SMOOTHING } from './Constants.client.js';
import ObjectPool from './ObjectPool.js';

class Renderer {
    constructor(gameState) {
        this.gameState = gameState;
        this.backgroundCanvas = document.getElementById('backgroundCanvas');
        this.backgroundCtx = this.backgroundCanvas.getContext('2d');
        this.gameCanvas = document.getElementById('gameCanvas');
        this.ctx = this.gameCanvas.getContext('2d');

        console.log('Renderer Constructor: gameCanvas =', this.gameCanvas);
        console.log('Renderer Constructor: gameCanvas.width =', this.gameCanvas.width, 'gameCanvas.height =', this.gameCanvas.height);
        console.log('Renderer Constructor: gameCanvas.clientWidth =', this.gameCanvas.clientWidth, 'gameCanvas.clientHeight =', this.gameCanvas.clientHeight);
        console.log('Renderer Constructor: gameCanvas.style.display =', this.gameCanvas.style.display, 'gameCanvas.style.opacity =', this.gameCanvas.style.opacity);
        console.log('Renderer Constructor: ctx =', this.ctx);

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
        this.drawStaticBackground();
        console.log('Renderer resizeCanvas: gameCanvas.width =', this.gameCanvas.width, 'gameCanvas.height =', this.gameCanvas.height);
        console.log('Renderer resizeCanvas: gameCanvas.clientWidth =', this.gameCanvas.clientWidth, 'gameCanvas.clientHeight =', this.gameCanvas.clientHeight);
        console.log('Renderer resizeCanvas: gameCanvas.style.display =', this.gameCanvas.style.display, 'gameCanvas.style.opacity =', this.gameCanvas.style.opacity);
    }

    updateCamera() {
        const self = this.gameState.self;
        if (!self) return;

        this.camera.x += (self.x - this.camera.x) * CAMERA_MOVE_SMOOTHING;
        this.camera.y += (self.y - this.camera.y) * CAMERA_MOVE_SMOOTHING;
        const targetZoom = Math.pow(self.maxLength / 30, CAMERA_ZOOM_FACTOR) * CAMERA_ZOOM_MULTIPLIER;
        this.camera.zoom += (targetZoom - this.camera.zoom) * CAMERA_ZOOM_SMOOTHING;
    }

    draw() {
        this.ctx.save();
        this.ctx.fillStyle = '#121212';
        this.ctx.fillRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

        const self = this.gameState.self;
        if (!self) {
            this.ctx.restore();
            return;
        }

        this.ctx.translate(this.gameCanvas.width / 2, this.gameCanvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        this.drawWorld();

        // Culling logic here

        this.gameState.food.forEach(f => this.drawFood(f));
        this.gameState.powerups.forEach(p => this.drawPowerUp(p));
        this.gameState.players.forEach(p => this.drawSnake(p));

        this.drawParticles();

        this.ctx.restore();
    }

    drawWorld() {
        const gridSize = 50;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; // Changed from 0.05 to 0.1 for better visibility
        this.ctx.lineWidth = 1;
        const halfWorld = this.gameState.worldSize / 2;

        for (let x = -halfWorld; x <= halfWorld; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, -halfWorld);
            this.ctx.lineTo(x, halfWorld);
            this.ctx.stroke();
        }
        for (let y = -halfWorld; y <= halfWorld; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(-halfWorld, y);
            this.ctx.lineTo(halfWorld, y);
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Changed from 0.1 to 0.2 for better visibility
        this.ctx.lineWidth = 10;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, halfWorld, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawStaticBackground() {
        // Simplified for now
    }

    drawFood(f) {
        this.ctx.save();
        const pulse = Math.sin(Date.now() / 200);

        // Ensure fillStyle is set before drawing
        this.ctx.fillStyle = f.color;

        if (f.glow) {
            this.ctx.shadowColor = f.color;
            this.ctx.shadowBlur = 10 + pulse * 5;
        } else {
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
            this.ctx.shadowBlur = 8 + pulse * 3;
        }

        this.ctx.beginPath();
        this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        this.ctx.fill();

        const gradient = this.ctx.createRadialGradient(f.x - f.radius/2, f.y - f.radius/2, 0, f.x, f.y, f.radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, f.color);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        this.ctx.restore();
    }

    drawPowerUp(p) {
        this.ctx.save(); // Save context for powerup drawing
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.fill();
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(Date.now() / 200))})`;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.restore(); // Restore context after powerup drawing
    }

    drawSnake(p) {
        if (!p.body || p.body.length === 0) {
            return;
        }

        this.ctx.save();

        if (p.isBoosting) {
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = 'white';
        }

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        if (p.skin === 'rainbow') {
            p.hue = (Date.now() / 10) % 360;
        }

        for (let i = p.body.length - 1; i > 0; i--) {
            const segment = p.body.get(i);
            if (!segment) continue;

            const radius = Math.max(2, p.radius * (1 - (i / p.body.length) * 0.7));
            let segmentColor;
            let borderColor;

            switch (p.skin) {
                case 'rainbow':
                    segmentColor = `hsl(${(p.hue + i * 5) % 360}, 100%, 70%)`;
                    borderColor = `hsl(${(p.hue + i * 5) % 360}, 100%, 50%)`;
                    break;
                case 'galaxy':
                    segmentColor = '#191970';
                    borderColor = '#000033';
                    break;
                case 'neon':
                default:
                    segmentColor = p.color;
                    borderColor = this.adjustColorBrightness(p.color, -30);
            }

            if (p.skin === 'neon' || p.skin === 'galaxy') {
                this.ctx.fillStyle = p.skin === 'neon' ? p.color : 'rgba(255, 255, 255, 0.5)';
                this.ctx.globalAlpha = 0.15;
                this.ctx.beginPath();
                this.ctx.arc(segment.x, segment.y, radius + 4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
            }

            this.ctx.fillStyle = borderColor;
            this.ctx.beginPath();
            this.ctx.arc(segment.x, segment.y, radius + 1, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = segmentColor;
            this.ctx.beginPath();
            this.ctx.arc(segment.x, segment.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            if (p.skin === 'galaxy' && i % 7 === 0) {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(segment.x + (Math.random() - 0.5) * radius, segment.y + (Math.random() - 0.5) * radius, Math.random() * 1.2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        const head = p.body.get(0);
        if (!head) {
            this.ctx.restore();
            return;
        }

        let headColor = p.color;
        let headBorderColor = this.adjustColorBrightness(p.color, -30);

        switch (p.skin) {
            case 'rainbow':
                headColor = `hsl(${p.hue}, 100%, 70%)`;
                headBorderColor = `hsl(${p.hue}, 100%, 50%)`;
                break;
            case 'galaxy':
                headColor = '#191970';
                headBorderColor = '#000033';
                break;
        }

        this.ctx.fillStyle = headBorderColor;
        this.ctx.beginPath();
        this.ctx.arc(head.x, head.y, p.radius + 1, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = headColor;
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
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        this.ctx.shadowBlur = 3;
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
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

        return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16);
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
}

export default Renderer;
