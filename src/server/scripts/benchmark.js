import Region from '../Region.js';
import Logger from '../../shared/Logger.js';
import config from '../../../config/index.js';

import fs from 'fs';
import path from 'path';

// Desabilita logs detalhados para manter o terminal do benchmark limpo
class SilentLogger extends Logger {
    info() {}
    warn(msg) { console.warn(`[WARN] ${msg}`); }
    error(msg) { console.error(`[ERROR] ${msg}`); }
    debug() {}
}

async function runBenchmark() {
    console.log('=====================================================');
    console.log('       STARTING ALIFE SIMULATION BENCHMARK           ');
    console.log('=====================================================');
    console.log('Configuring environment for 1,000 autonomous bots...');

    // Remove world_state.db para garantir que não carregue bots antigos acumulados
    const dbPath = path.join(process.cwd(), 'world_state.db');
    if (fs.existsSync(dbPath)) {
        try {
            fs.unlinkSync(dbPath);
        } catch (e) {}
    }

    // Sobrescreve dinamicamente as configurações de bot para o estresse
    config.BOT_COUNT = 1000;
    config.dbPath = ':memory:';
    if (config.game) {
        config.game.DYNAMIC_FOOD_TARGET_PER_AGENT = 2;
    }
    
    // Instancia uma região silenciosa
    const mockIo = {
        sockets: {
            sockets: new Map()
        }
    };
    const logger = new SilentLogger();
    const region = new Region('benchmark-region', mockIo, logger);

    // Aguarda a inicialização automática concluir
    while (!region.isReady) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    const agents = region.agentManager.getAgents();
    const initialAgents = Object.keys(agents).length;
    const initialFood = region.foodManager.getFood().length;
    console.log('List of agent IDs (first 10):', Object.keys(agents).slice(0, 10));
    console.log('List of agent nicknames (first 10):', Object.values(agents).map(a => a.nickname).slice(0, 10));
    console.log(`Region initialized successfully.`);
    console.log(`Agents: ${initialAgents} | Food items: ${initialFood}`);
    console.log('Running 100 ticks of simulation...');

    const tickTimes = [];
    const ramUsages = [];

    // Força GC se disponível para leitura precisa
    if (global.gc) {
        global.gc();
    }

    for (let i = 0; i < 100; i++) {
        const start = process.hrtime.bigint();

        // Roda um tick de simulação
        region.tick();

        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        tickTimes.push(durationMs);

        // Monitora o heap do Node.js
        const mem = process.memoryUsage();
        ramUsages.push(mem.heapUsed / 1024 / 1024); // em MB
    }

    // Calcula as métricas
    const totalDuration = tickTimes.reduce((a, b) => a + b, 0);
    const avgTick = totalDuration / tickTimes.length;
    const maxTick = Math.max(...tickTimes);
    const minTick = Math.min(...tickTimes);

    const avgRam = ramUsages.reduce((a, b) => a + b, 0) / ramUsages.length;
    const peakRam = Math.max(...ramUsages);

    console.log('\n=====================================================');
    console.log('                BENCHMARK RESULTS                    ');
    console.log('=====================================================');
    console.log(`Total Simulation Ticks Run : ${tickTimes.length}`);
    console.log(`Simulation Target Rate     : 10 Hz (100ms budget)`);
    console.log(`Average Tick Time          : ${avgTick.toFixed(3)} ms`);
    console.log(`Min Tick Time              : ${minTick.toFixed(3)} ms`);
    console.log(`Max Tick Time              : ${maxTick.toFixed(3)} ms`);
    console.log(`Average Heap RAM Usage     : ${avgRam.toFixed(2)} MB`);
    console.log(`Peak Heap RAM Usage        : ${peakRam.toFixed(2)} MB`);
    
    // Performance budget checking (100ms budget check)
    if (avgTick < 25) {
        console.log('Status: EXCELLENT (Average tick is well within the 100ms budget)');
    } else if (avgTick < 70) {
        console.log('Status: GOOD (Within budget, but monitor closely)');
    } else {
        console.log('Status: WARNING (Average tick is close to or exceeding simulation limits)');
    }
    console.log('=====================================================\n');

    process.exit(0);
}

runBenchmark().catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
});
