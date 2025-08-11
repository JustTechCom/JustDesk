const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const config = require('./config');
const securityMiddleware = require('./middleware/security');
const corsMiddleware = require('./middleware/cors');
const { generalLimiter } = require('./middleware/rateLimit');
const routes = require('./routes');
const socketHandler = require('./sockets');
const connections = require('./utils/connections');
const { redis } = require('./utils/redis');
const logger = require('./utils/logger');

const app = express();
const httpServer = createServer(app);

app.use(securityMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);
app.use('/api', routes);

const io = new Server(httpServer, {
  cors: config.cors,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  connectTimeout: 20000,
  maxHttpBufferSize: 1e6,
});

const connectionRates = new Map();
io.use((socket, next) => {
  const clientIP = socket.handshake.address;
  const now = Date.now();

  if (!connectionRates.has(clientIP)) {
    connectionRates.set(clientIP, { count: 1, resetTime: now + 60000 });
    return next();
  }

  const rateData = connectionRates.get(clientIP);

  if (now > rateData.resetTime) {
    rateData.count = 1;
    rateData.resetTime = now + 60000;
    return next();
  }

  if (rateData.count >= 10) {
    return next(new Error('Connection rate limit exceeded'));
  }

  rateData.count++;
  next();
});

io.on('connection', socketHandler(io));

app.use((err, req, res, next) => {
  logger.error('Express error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }

  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

const connectionRateCleanup = setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of connectionRates.entries()) {
    if (data.resetTime < now) {
      connectionRates.delete(ip);
    }
  }
}, 60 * 1000);

setInterval(async () => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [socketId, connection] of connections.entries()) {
    if (now - connection.connectedAt > 2 * 60 * 60 * 1000) {
      connections.delete(socketId);
      cleanedCount++;
    }
  }

    if (cleanedCount > 0) {
      logger.info(`🧹 Cleaned up ${cleanedCount} expired connections`);
    }
}, 10 * 60 * 1000);

  setInterval(async () => {
    logger.info('🕐 Checking for session timeouts...');

  try {
    const keys = await redis.keys('room:*');
    let timeoutCount = 0;

    for (const key of keys) {
      const roomData = await redis.get(key);
      if (roomData) {
        const room = JSON.parse(roomData);
        const now = Date.now();

        if (room.isSharing && room.sharingStartTime) {
          const sharingDuration = now - room.sharingStartTime;
          const oneHour = 60 * 60 * 1000;

          if (sharingDuration > oneHour) {
            io.to(room.hostId).emit('session-timeout', {
              message: 'Your sharing session has expired after 1 hour',
              duration: sharingDuration,
            });
            io.to(room.roomId).emit('session-ended', {
              reason: 'timeout',
              message: 'The sharing session has ended due to timeout',
            });
            await redis.del(key);
            timeoutCount++;
          }
        }
      }
    }

      if (timeoutCount > 0) {
        logger.info(`⏰ Cleaned up ${timeoutCount} expired sessions`);
      }
    } catch (error) {
      logger.error('❌ Error in session timeout checker:', error);
    }
  }, 30 * 1000);

const PORT = config.app.port;
  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 JustDesk backend running on port ${PORT}`);
  });

process.on('SIGTERM', () => {
  clearInterval(connectionRateCleanup);
  httpServer.close(() => {
      redis.disconnect();
      logger.info('🛑 Server closed');
    });
  });

process.on('SIGINT', () => {
  clearInterval(connectionRateCleanup);
  httpServer.close(() => {
      redis.disconnect();
      logger.info('🛑 Server closed');
    });
  });
