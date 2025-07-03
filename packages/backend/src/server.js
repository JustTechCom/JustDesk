const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Redis connection - Render Redis URL kullan
const redis = new Redis(process.env.REDIS_URL || process.env.REDIS_HOST, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3
});

// CORS - Multiple origins için
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    /\.onrender\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST']
};

app.use(cors(corsOptions));

// Socket.IO - CORS güncellemesi
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket']
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Port configuration
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ JustDesk backend running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    redis.disconnect();
  });
});
