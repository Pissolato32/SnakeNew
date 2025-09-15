import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import compression from 'compression';
import { fileURLToPath } from 'url';
import path from 'path';
import Logger from './public/shared/Logger.js';
import * as Constants from './Constants.js';

const logger = new Logger(Constants.DEBUG_MODE ? 'debug' : 'info');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(compression());
const server = http.createServer(app);
const io = new SocketIOServer(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Import GameManager
import GameManager from './GameManager.js';
const gameManager = new GameManager(io);
gameManager.start();

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
