class Needs {
    constructor() {
        this.hunger = 0;      // 0 a 100
        this.energy = 100;    // 0 a 100
        this.stress = 0;      // 0 a 100
        this.fear = 0;        // Reação imediata a perigo iminente
        this.fatigue = 0;     // Acúmulo de longo prazo
        this.curiosity = 50;  // Vontade de ir para áreas não mapeadas
        this.confidence = 50; // Baseado no tamanho e sucessos recentes
    }
}

export default Needs;
