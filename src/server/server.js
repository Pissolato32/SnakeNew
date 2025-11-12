import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import compression from 'compression';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import path from 'path';
import Logger from '../../public/shared/Logger.js';
import config from '../../config/index.js';
import { GAME_TICK_RATE_MS, SNAPSHOT_RATE_HZ } from '../shared/Constants.js';

const logger = new Logger(config.DEBUG_MODE ? 'debug' : 'info');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ['\'self\''],
            scriptSrc: ['\'self\'', '\'unsafe-inline\'', 'https://cdn.jsdelivr.net'],
            styleSrc: ['\'self\'', '\'unsafe-inline\''],
            imgSrc: ['\'self\'', 'data:'],
            connectSrc: ['\'self\'', 'ws:', 'wss:', 'https://cdn.jsdelivr.net']
        }
    }
}));
app.use(compression());
const server = http.createServer(app);
const io = new SocketIOServer(server);

const PORT = config.PORT;

app.use(express.static(path.join(__dirname, '../../public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'index.html'));
});

// Import GameManager
import GameManager from './GameManager.js';

const gameManager = new GameManager(io);

async function main() {
    await gameManager.start(); // Initialize the world

    // Game simulation loop
    setInterval(() => {
        gameManager.tick();
    }, GAME_TICK_RATE_MS);

    // Snapshot broadcast loop
    setInterval(() => {
        gameManager.sendSnapshots();
    }, 1000 / SNAPSHOT_RATE_HZ);
}

main();

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use. Please free the port and try again.`);
        process.exit(1);
    } else {
        logger.error('Server error:', err);
    }
});

server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});
