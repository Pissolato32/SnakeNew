const UINT32_MAX = 0xFFFFFFFF;

export const SIMULATION_VERSION = 'simulation-v1';
export const SIMULATION_LODS = Object.freeze({ HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' });

function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < String(value).length; i += 1) {
        hash ^= String(value).charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function normalizeSeed(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
    return hashString(seed ?? 'snake-new');
}

export function seededRandom(seed, ...parts) {
    let state = normalizeSeed(seed);
    for (const part of parts) state = (Math.imul(state ^ hashString(part), 1664525) + 1013904223) >>> 0;
    state = (state + 0x6D2B79F5) >>> 0;
    state = Math.imul(state ^ (state >>> 15), state | 1) >>> 0;
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / (UINT32_MAX + 1);
}

export function createWorldClock({ worldTime = 0, simulationTick = 0 } = {}) {
    if (!Number.isFinite(worldTime) || worldTime < 0) throw new Error('worldTime must be a non-negative number');
    if (!Number.isInteger(simulationTick) || simulationTick < 0) throw new Error('simulationTick must be a non-negative integer');
    return { worldTime, simulationTick, version: SIMULATION_VERSION };
}

export function advanceWorldClock(clock, deltaMs, tickMs) {
    if (!clock) throw new Error('clock is required');
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('deltaMs must be non-negative');
    if (!Number.isFinite(tickMs) || tickMs <= 0) throw new Error('tickMs must be positive');
    const total = clock.worldTime + deltaMs;
    const ticks = Math.floor(total / tickMs) - Math.floor(clock.worldTime / tickMs);
    return { ...clock, worldTime: total, simulationTick: clock.simulationTick + Math.max(0, ticks) };
}

export function createCheckpoint({ clock, worldSeed, state }) {
    if (!clock || !state) throw new Error('clock and state are required');
    return {
        version: SIMULATION_VERSION,
        clock: { ...clock },
        worldSeed: normalizeSeed(worldSeed),
        state: structuredClone(state)
    };
}

export function restoreCheckpoint(checkpoint) {
    if (!checkpoint || checkpoint.version !== SIMULATION_VERSION) throw new Error('unsupported simulation checkpoint version');
    return {
        clock: { ...checkpoint.clock },
        worldSeed: normalizeSeed(checkpoint.worldSeed),
        state: structuredClone(checkpoint.state)
    };
}

export function createAuditEvent({ clock, entityId, eventType, inputs = {}, result = {}, worldSeed }) {
    if (!clock || !entityId || !eventType) throw new Error('clock, entityId and eventType are required');
    const seed = normalizeSeed(worldSeed);
    return Object.freeze({
        version: SIMULATION_VERSION,
        worldTime: clock.worldTime,
        simulationTick: clock.simulationTick,
        entityId: String(entityId),
        eventType: String(eventType),
        seed: seededRandom(seed, clock.simulationTick, entityId, eventType),
        inputs: structuredClone(inputs),
        result: structuredClone(result)
    });
}

export function getSimulationStepMs(lod) {
    if (lod === SIMULATION_LODS.HIGH) return 1000 / 60;
    if (lod === SIMULATION_LODS.MEDIUM) return 60_000;
    if (lod === SIMULATION_LODS.LOW) return 15 * 60_000;
    throw new Error(`unknown simulation LOD: ${lod}`);
}

export function integrateLinear(value, ratePerMs, deltaMs, min = -Infinity, max = Infinity) {
    const next = value + ratePerMs * deltaMs;
    return Math.max(min, Math.min(max, next));
}
