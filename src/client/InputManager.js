class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.showDebugPanel = false;

        // Em vez de enviar coordenadas locais para movimento,
        // o jogador enviará estratégias e metas
        this.currentStrategy = {
            aggression: 50,
            caution: 50,
            curiosity: 50
        };

        this.strategyChanged = false;
        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'd' && e.ctrlKey) {
                e.preventDefault();
                this.showDebugPanel = !this.showDebugPanel;
            }
        });
    }

    // Chamado pela UI de Estratégia quando o usuário altera os sliders
    updateStrategy(newStrategy) {
        this.currentStrategy = { ...this.currentStrategy, ...newStrategy };
        this.strategyChanged = true;
    }

    getInput() {
        if (!this.strategyChanged) {
            return null;
        }

        this.strategyChanged = false;

        return {
            type: 'STRATEGY_UPDATE',
            strategy: this.currentStrategy
        };
    }
}

export default InputManager;
