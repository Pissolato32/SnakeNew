/**
 * RandomService
 * Isola toda a geração de números aleatórios do jogo.
 * Essencial para suportar determinismo, seeds, replays e testes automatizados.
 */
class RandomService {
    constructor(seed = null) {
        this.seed = seed || Math.random();
        // Placeholder for a real seeded RNG like PRNG (e.g. mulberry32 or sfc32)
        // For MVP we just wrap Math.random to avoid direct calls everywhere
    }

    setSeed(seed) {
        this.seed = seed;
    }

    // Retorna float entre 0 (inclusivo) e 1 (exclusivo)
    random() {
        return Math.random();
    }

    // Retorna número entre min e max
    range(min, max) {
        return this.random() * (max - min) + min;
    }

    // Retorna inteiro entre min e max
    rangeInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    // Escolhe aleatoriamente um elemento de um array
    choice(array) {
        if (!array || array.length === 0) return null;
        const index = this.rangeInt(0, array.length - 1);
        return array[index];
    }
}

// Exporta um singleton global por padrão, mas a arquitetura deve injetar isso
export default new RandomService();
