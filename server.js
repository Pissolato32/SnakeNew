const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const compression = require('compression');
const app = express();
app.use(compression());
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Import GameManager
const GameManager = require('./GameManager');
const gameManager = new GameManager(io);
gameManager.start();

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
