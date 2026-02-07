require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const socketAuthMiddleware = require('./sockets/middleware');
const socketHandler = require('./sockets/socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

connectDB();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', chatRoutes);

io.use(socketAuthMiddleware);
socketHandler(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`სერვერი გაეშვა - http://localhost:${PORT}`);
});