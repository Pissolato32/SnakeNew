import GameState from './GameState.js';

function makePlayer(id, bodyLength) {
    const body = [];
    for (let i = 0; i < bodyLength; i++) {
        body.push({ x: i * 10, y: id * 100 + i });
    }
    return {
        id: `p${id}`,
        x: id * 10,
        y: id * 10,
        angle: 0.5,
        n: `Bot${id}`,
        skin: 'default',
        radius: 10,
        color: '#ff0000',
        a: true,
        sc: bodyLength,
        s: body,
    };
}

function makeItems(count, prefix) {
    const items = [];
    for (let i = 0; i < count; i++) {
        items.push({ id: `${prefix}${i}`, x: i, y: i, type: 'food', color: '#fff', radius: 4 });
    }
    return items;
}

function makeSnapshot(playerCount, bodyLength, foodCount, powerupCount) {
    return {
        players: Array.from({ length: playerCount }, (_, i) => makePlayer(i, bodyLength)),
        food: makeItems(foodCount, 'f'),
        powerups: makeItems(powerupCount, 'pu'),
    };
}

describe('GameState.updateFromSnapshot performance', () => {
    const PLAYER_COUNT = 100;
    const BODY_LENGTH = 200;
    const FOOD_COUNT = 1000;
    const POWERUP_COUNT = 20;
    const FRAMES_TO_SIMULATE = 120;

    test('stays within a sane time budget under worst-case entity counts', () => {
        const gameState = new GameState();
        const snapshotA = makeSnapshot(PLAYER_COUNT, BODY_LENGTH, FOOD_COUNT, POWERUP_COUNT);
        const snapshotB = makeSnapshot(PLAYER_COUNT, BODY_LENGTH, FOOD_COUNT, POWERUP_COUNT);

        const start = performance.now();
        for (let i = 0; i < FRAMES_TO_SIMULATE; i++) {
            const t = (i % 10) / 10;
            gameState.updateFromSnapshot(snapshotA, snapshotB, t);
        }
        const elapsed = performance.now() - start;
        const perFrame = elapsed / FRAMES_TO_SIMULATE;

        // eslint-disable-next-line no-console
        console.log(`[perf] updateFromSnapshot: ${perFrame.toFixed(3)} ms/frame over ${FRAMES_TO_SIMULATE} frames ` +
            `(${PLAYER_COUNT} players x ${BODY_LENGTH} segments, ${FOOD_COUNT} food, ${POWERUP_COUNT} powerups)`);

        expect(perFrame).toBeLessThan(8);
    });

    test('does not grow the CircularBuffer backing array across frames (no per-frame allocation)', () => {
        const gameState = new GameState();
        const snapshotA = makeSnapshot(5, 50, 10, 2);
        const snapshotB = makeSnapshot(5, 50, 10, 2);

        gameState.updateFromSnapshot(snapshotA, snapshotB, 0.5);
        const player = gameState.getPlayer('p0');
        const bufferRefBefore = player.body.buffer;

        for (let i = 0; i < 30; i++) {
            gameState.updateFromSnapshot(snapshotA, snapshotB, (i % 10) / 10);
        }

        expect(player.body.buffer).toBe(bufferRefBefore);
    });
});
