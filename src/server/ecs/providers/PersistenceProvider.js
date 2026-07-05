/**
 * Interface/Classe Base para Provedores de Persistência
 */
class PersistenceProvider {
    constructor() {
        if (this.constructor === PersistenceProvider) {
            throw new Error("Cannot instantiate abstract class");
        }
    }

    async saveState(stateData) {
        throw new Error("Method 'saveState()' must be implemented.");
    }

    async loadState() {
        throw new Error("Method 'loadState()' must be implemented.");
    }
}

export default PersistenceProvider;
