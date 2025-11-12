import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000'; // Adjust if your server runs on a different port
const BOT_COUNT = process.argv[2] ? parseInt(process.argv[2], 10) : 1;
const INPUT_INTERVAL_MS = 100; // How often bots send input (10 times per second)

const getRandomNickname = () => {
    return `Bot_${Math.random().toString(36).substring(2, 8)}`;
};

const createBot = (botId) => {
    const socket = io(SERVER_URL);
    let player = { x: 0, y: 0, angle: 0, speed: 4 }; // Client-side prediction approximation

    socket.on('connect', () => {
        console.log(`Bot ${botId} connected with ID: ${socket.id}`);
        socket.emit('join-game', { nickname: getRandomNickname(), skin: 'default', color: '#FF00FF' });
    });

    socket.on('game-setup', (config) => {
        console.log(`Bot ${botId} received game setup:`, config);
    });

    socket.on('snapshot', (snapshot) => {
        // Basic client-side update for prediction
        const selfState = snapshot.players.find(p => p.id === socket.id);
        if (selfState) {
            player.x = selfState.x;
            player.y = selfState.y;
            player.angle = selfState.angle;
            player.speed = selfState.speed || 4; // Update speed if available in snapshot
        }
    });

    socket.on('death', (data) => {
        console.log(`Bot ${botId} died with score: ${data.score}. Rejoining...`);
        setTimeout(() => {
            socket.emit('join-game', { nickname: getRandomNickname(), skin: 'default', color: '#FF00FF' });
        }, 2000); // Wait 2 seconds before rejoining
    });

    socket.on('error', (message) => {
        console.error(`Bot ${botId} error:`, message);
    });

    socket.on('disconnect', () => {
        console.log(`Bot ${botId} disconnected.`);
    });

    setInterval(() => {
        if (socket.connected) {
            // Simulate random movement
            const targetAngle = Math.random() * 2 * Math.PI;
            const isBoosting = Math.random() > 0.8; // 20% chance to boost

            // Simple client-side prediction for smoother local movement
            player.angle = targetAngle;
            const currentSpeed = isBoosting ? player.speed * 1.5 : player.speed;
            player.x += Math.cos(player.angle) * currentSpeed * (INPUT_INTERVAL_MS / 1000);
            player.y += Math.sin(player.angle) * currentSpeed * (INPUT_INTERVAL_MS / 1000);

            socket.emit('input', { angle: targetAngle, isBoosting: isBoosting, seq: Date.now() });
        }
    }, INPUT_INTERVAL_MS);
};

for (let i = 0; i < BOT_COUNT; i++) {
    createBot(i + 1);
}

console.log(`Starting ${BOT_COUNT} bots...`);
