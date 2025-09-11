const { worldSize } = require('./Constants');

function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c/2, r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
    r = Math.round((r + m) * 255); g = Math.round((g + m) * 255); b = Math.round((b + m) * 255);
    return { r, g, b };
}

function getSafeSpawnPoint(players, SPAWN_BUFFER) {
    let spawnPoint = null;
    let isSafe = false;
    let attempts = 0;
    while (!isSafe && attempts < 50) {
        const angle = Math.random() * 2 * Math.PI;
        const r = Math.sqrt(Math.random()) * (worldSize / 2 - 100);
        spawnPoint = { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
        isSafe = true;
        for (const id in players) {
            if (Math.hypot(spawnPoint.x - players[id].x, spawnPoint.y - players[id].y) < SPAWN_BUFFER) {
                isSafe = false;
                break;
            }
        }
        attempts++;
    }
    return spawnPoint;
}

module.exports = {
    hslToRgb,
    getSafeSpawnPoint
};
