import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import compression from 'compression';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import path from 'path';
import Logger from '../shared/Logger.js';
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
            scriptSrc: ['\'self\'', '\'unsafe-inline\'', 'https://cdn.jsdelivr.net', 'https://cdn.socket.io'],
            styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
            imgSrc: ['\'self\'', 'data:'],
            connectSrc: ['\'self\'', 'ws:', 'wss:', 'https://cdn.jsdelivr.net', 'https://cdn.socket.io']
        }
    }
}));
app.use(compression());

// Custom CORS middleware to dynamically handle credentials and Vercel domains
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        // Fallback for non-browser clients (if acceptable), or explicitly reject
        // Allowing no-origin might be insecure if credentials are required,
        // but for public APIs it's common. We'll leave it out or restrict it.
        // Actually, if we want to be strictly secure and require CORS for web:
        res.setHeader('Access-Control-Allow-Origin', config.ALLOWED_ORIGINS[0]);
    } else {
        res.setHeader('Access-Control-Allow-Origin', 'null');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || config.ALLOWED_ORIGINS.includes(origin)) {
                callback(null, origin || config.ALLOWED_ORIGINS[0]);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const PORT = config.PORT;

const staticOptions = {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
};

app.use(express.static(path.join(__dirname, '../../public'), staticOptions));
app.use('/shared', express.static(path.join(__dirname, '../shared'), staticOptions));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'index.html'));
});

// Import WorldManager
import WorldManager from './WorldManager.js';
import HealthCheck from './HealthCheck.js';

const worldManager = new WorldManager(io);
const healthCheck = new HealthCheck(worldManager);

app.get('/health', (req, res) => {
    const status = healthCheck.getHealthStatus();
    res.status(200).json(status);
});

async function main() {
    await worldManager.start(); // Initialize the world

    // Game simulation loop
    setInterval(() => {
        worldManager.tick();
    }, GAME_TICK_RATE_MS);

    // Snapshot broadcast loop
    setInterval(() => {
        worldManager.sendSnapshots();
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
