class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.mouse = { x: 0, y: 0 };
        this.isBoosting = false;
        this.showDebugPanel = false;

        this.setupListeners();
    }

    setupListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', () => { this.isBoosting = true; });
        this.canvas.addEventListener('mouseup', () => { this.isBoosting = false; });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'd' && e.ctrlKey) {
                e.preventDefault();
                this.showDebugPanel = !this.showDebugPanel;
            }
        });
    }

    getInput() {
        return {
            mouse: this.mouse,
            isBoosting: this.isBoosting,
            showDebugPanel: this.showDebugPanel
        };
    }
}

export default InputManager;
