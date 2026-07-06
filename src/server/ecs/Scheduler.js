class Scheduler {
    constructor(logger) {
        this.logger = logger;
        this.tasks = [];
    }

    /**
     * Registra um sistema ou tarefa no Scheduler.
     * @param {string} name - Nome legível do sistema/tarefa.
     * @param {number} frequencyHz - Frequência nominal em Hz.
     * @param {function} callback - Função a ser executada.
     */
    addTask(name, frequencyHz, callback) {
        this.tasks.push({
            name,
            intervalMs: 1000 / frequencyHz,
            callback,
            lastRun: 0,
            avgDurationMs: 0
        });
    }

    /**
     * Executa um tick do Scheduler, rodando as tarefas que alcançaram seu intervalo nominal.
     * Retorna os tempos de processamento individuais medidos.
     * @param {number} now - Marca temporal do tick atual em ms.
     * @returns {Object} Duração de cada tarefa executada neste ciclo em ms.
     */
    tick(now) {
        const results = {};

        for (const task of this.tasks) {
            // Executa se o tempo transcorrido for maior/igual ao intervalo nominal correspondente
            const timeSinceLastRun = now - task.lastRun;
            if (timeSinceLastRun >= task.intervalMs) {
                const start = process.hrtime.bigint();
                
                try {
                    task.callback(now);
                } catch (err) {
                    this.logger.error(`Error executing system task ${task.name}:`, err);
                }

                const end = process.hrtime.bigint();
                const durationMs = Number(end - start) / 1_000_000;
                
                // Média móvel da duração da tarefa para profiling
                task.avgDurationMs = task.avgDurationMs * 0.9 + durationMs * 0.1;
                task.lastRun = now;
                results[task.name] = durationMs;
            }
        }
        return results;
    }
}

export default Scheduler;
