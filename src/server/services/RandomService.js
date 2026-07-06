/**
 * RandomService
 * Isola toda a geração de números aleatórios do jogo.
 * Essencial para suportar determinismo, seeds, replays e testes automatizados.
 */
class RandomService {
    constructor(seed = null) {
        this.setSeed(seed !== null ? seed : Math.random() * 2147483647);
    }

    setSeed(seed) {
        this.seed = seed;
        let numericSeed = 0;
        if (typeof seed === 'string') {
            for (let i = 0; i < seed.length; i++) {
                numericSeed = (numericSeed * 31 + seed.charCodeAt(i)) | 0;
            }
        } else {
            numericSeed = seed | 0;
        }
        this.state = numericSeed;
    }

    // Retorna float entre 0 (inclusivo) e 1 (exclusivo) usando mulberry32
    random() {
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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
