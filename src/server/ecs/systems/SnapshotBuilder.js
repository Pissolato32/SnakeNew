class SnapshotBuilder {
    constructor() {
        this.protocolVersion = 1; // Protocolo de Snapshot V1
    }

    /**
     * Serializa as atualizações diferenciais (delta) e inclui cabeçalhos de metadados do protocolo.
     * @param {number} tickCount - O tick count atual da região.
     * @param {Object} delta - O diferencial computado pelo DiffEngine.
     * @returns {Object} Pacote formatado sob o protocolo v1.
     */
    buildSnapshot(tickCount, delta) {
        return {
            v: this.protocolVersion,
            t: tickCount,
            ts: Date.now(),
            delta: delta
        };
    }
}

export default SnapshotBuilder;
