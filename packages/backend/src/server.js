const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression());

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit health checks to 10 per minute per IP
  message: {
    error: 'Too many health check requests, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit API calls to 50 per 15 minutes per IP
  message: {
    error: 'Too many API requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Very strict limit for sensitive operations
  message: {
    error: 'Rate limit exceeded for sensitive operation.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use(generalLimiter);

// Redis connection with proper error handling
let redis;
let redisHealthCache = {
  status: 'unknown',
  lastCheck: 0,
  cacheDuration: 30000 // 30 seconds cache
};

try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        console.log(`Redis retry attempt ${times}`);
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000
    });
  } else {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        console.log(`Redis retry attempt ${times}`);
        return Math.min(times * 50, 2000);
      }
    });
  }

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
    redisHealthCache.status = 'connected';
    redisHealthCache.lastCheck = Date.now();
  });

  redis.on('ready', () => {
    console.log('✅ Redis ready to accept commands');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
    redisHealthCache.status = 'error: ' + err.message;
    redisHealthCache.lastCheck = Date.now();
  });

  redis.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
    redisHealthCache.status = 'reconnecting';
    redisHealthCache.lastCheck = Date.now();
  });

} catch (error) {
  console.error('❌ Redis initialization error:', error);
  redisHealthCache.status = 'initialization error';
}

// CORS configuration
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'https://localhost:3000',
    /\.onrender\.com$/,
    /^https:\/\/.*\.onrender\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' })); // Limit JSON payload size

// Socket.IO with proper CORS and rate limiting
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  // Connection rate limiting
  connectTimeout: 20000,
  maxHttpBufferSize: 1e6 // 1MB max message size
});

// Connection tracking with cleanup
const connections = new Map();
const connectionRates = new Map(); // IP-based connection tracking

// Helper functions
function generateRoomId() {
  return crypto.randomInt(100000000, 999999999).toString();
}

function generatePassword() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Rate limited Redis health check
async function getRedisHealth() {
  const now = Date.now();
  
  // Return cached status if recent
  if (now - redisHealthCache.lastCheck < redisHealthCache.cacheDuration) {
    return redisHealthCache.status;
  }

  try {
    // Timeout the ping operation
    const pingPromise = redis.ping();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis ping timeout')), 3000)
    );
    
    await Promise.race([pingPromise, timeoutPromise]);
    redisHealthCache.status = 'connected';
  } catch (error) {
    redisHealthCache.status = 'error: ' + error.message;
  }
  
  redisHealthCache.lastCheck = now;
  return redisHealthCache.status;
}

// Health check endpoint with rate limiting and caching
app.get('/api/health', healthLimiter, async (req, res) => {
  try {
    const redisStatus = await getRedisHealth();
    
    // Basic health response without expensive operations
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      redis: redisStatus,
      activeConnections: connections.size,
      memoryUsage: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      }
    };
    
    // Set cache headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});


// Room info endpoint with strict rate limiting
app.get('/api/room/:roomId', strictLimiter, async (req, res) => {
  const { roomId } = req.params;
  
  // Input validation
  if (!roomId || !/^\d{9}$/.test(roomId)) {
    return res.status(400).json({ error: 'Invalid room ID format' });
  }
  
  try {
    const roomData = await redis.get(`room:${roomId}`);
    
    if (!roomData) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    
    const room = JSON.parse(roomData);
    res.json({
      roomId: room.roomId,
      created: room.created,
      participantCount: room.participants.length,
      active: true, 
      sessionStartTime: room.sessionStartTime,
      sharingStartTime: room.sharingStartTime,
      isSharing: room.isSharing || false 
    });
  } catch (error) {
    console.error('Room info error:', error);
    res.status(500).json({ error: 'Failed to get room info' });
  }
});

// WebRTC session stats endpoint
app.get('/api/stats', apiLimiter, (req, res) => {
  res.json({
    totalConnections: connections.size,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Connection rate limiting for Socket.IO
io.use((socket, next) => {
  const clientIP = socket.handshake.address;
  const now = Date.now();
  
  if (!connectionRates.has(clientIP)) {
    connectionRates.set(clientIP, { count: 1, resetTime: now + 60000 });
    return next();
  }
  
  const rateData = connectionRates.get(clientIP);
  
  if (now > rateData.resetTime) {
    // Reset the rate limit window
    rateData.count = 1;
    rateData.resetTime = now + 60000;
    return next();
  }
  
  if (rateData.count >= 10) { // Max 10 connections per minute per IP
    return next(new Error('Connection rate limit exceeded'));
  }
  
  rateData.count++;
  next();
});
 
// Socket.IO connection handling - COMPLETE VERSION 
io.on('connection', (socket) => {
  console.log(`✅ New socket connection: ${socket.id}`);

  // Test Redis connection on each socket connection
  socket.emit('server-status', { connected: true });

  // CREATE ROOM EVENT
  socket.on('create-room', async (callback) => {
    console.log(`🏠 Creating room for socket: ${socket.id}`);
    
    try {
      // Check if Redis is available (use cached status)
      const redisStatus = await getRedisHealth();
      if (redisStatus.includes('error')) {
        throw new Error('Redis not available');
      }

      const roomId = generateRoomId();
      const password = generatePassword();
      const now = Date.now();
      
      console.log(`🎲 Generated Room ID: ${roomId}, Password: ${password}`);
      
      const roomData = {
        hostId: socket.id,
        roomId,
        password,
        created: now,
        sessionStartTime: now,
        participants: [], // Boş array ile başla 
        lastActivity: now,
        isSharing: false,
        sharingStartTime: null 
      };

      // Store in Redis with expiration
      const key = `room:${roomId}`;
      await redis.setex(key, 3600, JSON.stringify(roomData));
      
      console.log(`💾 Room data stored in Redis with key: ${key}`);

      // Join socket room
      socket.join(roomId);
      connections.set(socket.id, { 
        roomId, 
        role: 'host', 
        connectedAt: now,
        sessionStartTime: now
      }); 

      console.log(`✅ Room created successfully: ${roomId}`);
      
      // Send response
      if (callback && typeof callback === 'function') {
        callback({ 
          success: true, 
          roomId, 
          password,
          sessionStartTime: now
        });
      } else {
        socket.emit('room-created', { 
          success: true, 
          roomId, 
          password,
          sessionStartTime: now
        });
      }

    } catch (error) {
      console.error('❌ Error creating room:', error);
      
      const errorResponse = { 
        success: false, 
        error: 'Failed to create room: ' + error.message 
      };
      
      if (callback && typeof callback === 'function') {
        callback(errorResponse);
      } else {
        socket.emit('room-creation-error', errorResponse);
      }
    }
  });

  // JOIN ROOM EVENT
  socket.on('join-room', async ({ roomId, password }, callback) => {
    console.log(`🚪 Joining room ${roomId} for socket: ${socket.id}`);
    
    // Input validation
    if (!roomId || !password || !/^\d{9}$/.test(roomId)) {
      callback({ success: false, error: 'Invalid room ID or password format' });
      return;
    }
    
    try {
      const roomData = await redis.get(`room:${roomId}`);
      
      if (!roomData) {
        console.log(`❌ Room not found: ${roomId}`);
        callback({ success: false, error: 'Room not found' });
        return;
      }

      const room = JSON.parse(roomData);
      
      if (room.password !== password) {
        console.log(`❌ Invalid password for room: ${roomId}`);
        callback({ success: false, error: 'Invalid password' });
        return;
      }

      // Check if room is full
      if (room.participants.length >= 10) {
        console.log(`❌ Room is full: ${roomId}`);
        callback({ success: false, error: 'Room is full' });
        return;
      }

      // Join room
      socket.join(roomId);
      connections.set(socket.id, { 
        roomId, 
        role: 'viewer', 
        connectedAt: Date.now() 
      }); 
      
      // Add to participants if not already there
      if (!room.participants.includes(socket.id)) {
        room.participants.push(socket.id);
        room.lastActivity = Date.now();
        await redis.setex(`room:${roomId}`, 3600, JSON.stringify(room));
        console.log(`👤 Added viewer ${socket.id} to room ${roomId}. Total participants: ${room.participants.length}`);
      }

      // Notify host about new viewer - CRITICAL!
      console.log(`📢 Notifying host ${room.hostId} about new viewer ${socket.id}`);
      socket.to(room.hostId).emit('viewer-joined', {
        viewerId: socket.id,
        roomId,
        requestStream: true,
        joinedAt: Date.now(),
        totalViewers: room.participants.length
      });

      // Also notify all participants in room
      socket.to(roomId).emit('participant-update', {
        type: 'joined',
        viewerId: socket.id,
        totalViewers: room.participants.length 
      });

      console.log(`✅ Viewer ${socket.id} joined room ${roomId}. Total viewers: ${room.participants.length}`);
      callback({ success: true, hostId: room.hostId });
      
    } catch (error) {
      console.error('❌ Error joining room:', error);
      callback({ success: false, error: 'Failed to join room: ' + error.message });
    }
  });

  // SHARING STARTED EVENT
  socket.on('sharing-started', async ({ roomId, startTime }) => {
    console.log(`🎥 Screen sharing started in room ${roomId} at ${new Date(startTime).toLocaleTimeString()}`);
    
    try {
      const roomData = await redis.get(`room:${roomId}`);
      if (roomData) {
        const room = JSON.parse(roomData);
        
        // Room data'ya sharing start time ekle
        room.sharingStartTime = startTime;
        room.isSharing = true;
        room.lastActivity = Date.now();
        
        await redis.setex(`room:${roomId}`, 3600, JSON.stringify(room));
        
        // Tüm viewer'lara sharing başladığını bildir
        socket.to(roomId).emit('host-started-sharing', {
          startTime,
          message: 'Host started sharing their screen'
        });
        
        console.log(`✅ Updated room ${roomId} with sharing start time`);
      }
    } catch (error) {
      console.error('❌ Error updating sharing start time:', error);
    }
  });

  // SHARING STOPPED EVENT
  socket.on('sharing-stopped', async ({ roomId, stopTime }) => {
    console.log(`🛑 Screen sharing stopped in room ${roomId} at ${new Date(stopTime).toLocaleTimeString()}`);
    
    try {
      const roomData = await redis.get(`room:${roomId}`);
      if (roomData) {
        const room = JSON.parse(roomData);
        
        // Calculate session duration
        const sessionDuration = room.sharingStartTime ? stopTime - room.sharingStartTime : 0;
        
        // Room data'yı güncelle
        room.sharingStopTime = stopTime;
        room.isSharing = false;
        room.sessionDuration = sessionDuration;
        room.lastActivity = Date.now();
        
        await redis.setex(`room:${roomId}`, 3600, JSON.stringify(room));
        
        // Tüm viewer'lara sharing durduğunu bildir
        socket.to(roomId).emit('host-stopped-sharing', {
          stopTime,
          sessionDuration,
          message: 'Host stopped sharing their screen'
        });
        
        console.log(`✅ Session duration: ${Math.floor(sessionDuration / 1000 / 60)}:${Math.floor((sessionDuration / 1000) % 60)} minutes`);
      }
    } catch (error) {
      console.error('❌ Error updating sharing stop time:', error);
    }
  });

  // WebRTC signaling with input validation
  socket.on('offer', ({ offer, to }) => {
    if (!offer || !to || typeof to !== 'string') return;
    
    console.log(`📡 Forwarding offer from ${socket.id} to ${to}`);
    socket.to(to).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ answer, to }) => {
    if (!answer || !to || typeof to !== 'string') return;
    
    console.log(`📡 Forwarding answer from ${socket.id} to ${to}`);
    socket.to(to).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    if (!candidate || !to || typeof to !== 'string') return;
    
    socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });
 
  // DEBUG: Get room status 
  socket.on('get-room-status', async (roomId, callback) => {
    try {
      const roomData = await redis.get(`room:${roomId}`);
      if (roomData) {
        const room = JSON.parse(roomData);
        callback({
          success: true,
          data: {
            roomId: room.roomId,
            participantCount: room.participants.length,
            participants: room.participants,
            created: room.created,
            sessionStartTime: room.sessionStartTime, 
            lastActivity: room.lastActivity,
            isSharing: room.isSharing || false,
            sharingStartTime: room.sharingStartTime 
          }
        });
      } else {
        callback({ success: false, error: 'Room not found' });
      }
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });
 
  // DEBUG: Get sharing stats
  socket.on('get-sharing-stats', async (roomId, callback) => {
    try {
      const roomData = await redis.get(`room:${roomId}`);
      if (roomData) {
        const room = JSON.parse(roomData);
        
        const stats = {
          roomId: room.roomId,
          isSharing: room.isSharing || false,
          sharingStartTime: room.sharingStartTime,
          sharingStopTime: room.sharingStopTime,
          sessionDuration: room.sessionDuration,
          participantCount: room.participants.length,
          created: room.created,
          lastActivity: room.lastActivity
        };
        
        // Eğer şu anda sharing aktifse, current duration'ı hesapla
        if (room.isSharing && room.sharingStartTime) {
          stats.currentDuration = Date.now() - room.sharingStartTime;
        }
        
        callback({ success: true, stats });
      } else {
        callback({ success: false, error: 'Room not found' });
      }
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  // PING endpoint for connection health
  socket.on('ping', (callback) => {
    if (callback && typeof callback === 'function') {
      callback({ pong: true, timestamp: Date.now() });
    }
  });

  // DISCONNECT EVENT 
  socket.on('disconnect', async () => {
    console.log(`👋 Socket disconnected: ${socket.id}`);
    
    const connection = connections.get(socket.id);
    if (!connection) return;

    const { roomId, role } = connection;
    
    try {
      if (role === 'host') {
        // Host disconnected, close room and notify all viewers
        console.log(`🏠 Host ${socket.id} disconnected from room ${roomId}`);
        
        // Get room data before deletion
        const roomData = await redis.get(`room:${roomId}`);
        if (roomData) {
          const room = JSON.parse(roomData);
          console.log(`📢 Notifying ${room.participants.length} viewers about host disconnect`);
        }
        
        // Delete room from Redis
        await redis.del(`room:${roomId}`);
        
        // Notify all viewers in the room
        socket.to(roomId).emit('host-disconnected');
        
        // Clean up all viewer connections from this room
        const roomConnections = Array.from(connections.entries())
          .filter(([_, conn]) => conn.roomId === roomId);
        
        roomConnections.forEach(([socketId]) => {
          connections.delete(socketId);
          console.log(`🧹 Cleaned up connection: ${socketId}`);
        });
        
        console.log(`🏠 Room ${roomId} closed completely`);
        
      } else if (role === 'viewer') {
        // Viewer disconnected, update room participants
        console.log(`👤 Viewer ${socket.id} disconnected from room ${roomId}`);
        
        const roomData = await redis.get(`room:${roomId}`);
        if (roomData) {
          const room = JSON.parse(roomData);
          
          // Remove from participants list
          const originalCount = room.participants.length;
          room.participants = room.participants.filter(id => id !== socket.id);
          room.lastActivity = Date.now();
          
          console.log(`📊 Participant count changed: ${originalCount} -> ${room.participants.length}`);
          
          // Update room in Redis
          await redis.setex(`room:${roomId}`, 3600, JSON.stringify(room));
          
          // Notify host about viewer disconnect - CRITICAL!
          console.log(`📢 Notifying host ${room.hostId} about viewer ${socket.id} disconnect`);
          socket.to(room.hostId).emit('viewer-disconnected', {
            viewerId: socket.id,
            totalViewers: room.participants.length
          });
          
          // Also notify room
          socket.to(roomId).emit('participant-update', {
            type: 'left',
            viewerId: socket.id,
            totalViewers: room.participants.length
          });
          
          console.log(`✅ Viewer ${socket.id} removed. Remaining viewers: ${room.participants.length}`);
        }
      }
    } catch (error) {
      console.error('❌ Error handling disconnect:', error);
    }
    
    connections.delete(socket.id);
  });

  // Ping endpoint for connection health
  socket.on('ping', (callback) => {
    if (callback && typeof callback === 'function') {
      callback({ pong: true, timestamp: Date.now() });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});


// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Cleanup function for connection rates
const connectionRateCleanup = setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of connectionRates.entries()) {
    if (data.resetTime < now) {
      connectionRates.delete(ip);
    }
  }
}, 60 * 1000); // Run every minute

// Cleanup expired connections periodically
setInterval(async () => {
  console.log('🧹 Running connection cleanup...');
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [socketId, connection] of connections.entries()) {
    // Clean up connections older than 2 hours
    if (now - connection.connectedAt > 2 * 60 * 60 * 1000) {
      connections.delete(socketId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired connections`);
  }
}, 10 * 60 * 1000); // Run every 10 minutes
 
// Session timeout checker - her 30 saniyede bir çalışır
setInterval(async () => {
  console.log('🕐 Checking for session timeouts...');
  
  try {
    // Tüm room'ları kontrol et
    const keys = await redis.keys('room:*');
    let timeoutCount = 0;
    
    for (const key of keys) {
      const roomData = await redis.get(key);
      if (roomData) {
        const room = JSON.parse(roomData);
        const now = Date.now();
        
        // Eğer sharing aktifse ve 1 saatten fazla olmuşsa
        if (room.isSharing && room.sharingStartTime) {
          const sharingDuration = now - room.sharingStartTime;
          const oneHour = 60 * 60 * 1000;
          
          if (sharingDuration > oneHour) {
            console.log(`⏰ Session timeout for room ${room.roomId}`);
            
            // Host'a timeout bildirimi gönder
            io.to(room.hostId).emit('session-timeout', {
              message: 'Your sharing session has expired after 1 hour',
              duration: sharingDuration
            });
            
            // Viewer'lara da bildir
            io.to(room.roomId).emit('session-ended', {
              reason: 'timeout',
              message: 'The sharing session has ended due to timeout'
            });
            
            // Room'u sil
            await redis.del(key);
            timeoutCount++;
          }
        }
      }
    }
    
    if (timeoutCount > 0) {
      console.log(`⏰ Cleaned up ${timeoutCount} expired sessions`);
    }
  } catch (error) {
    console.error('❌ Error in session timeout checker:', error);
  }
}, 30 * 1000); // Her 30 saniyede bir çalıştır
 

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 JustDesk backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 CORS origins: ${Array.isArray(corsOptions.origin) ? corsOptions.origin.join(', ') : corsOptions.origin}`);
  console.log(`🛡️ Security middleware enabled`);
  console.log(`📊 Active connections tracking: enabled`);
  console.log(`🧹 Automatic cleanup: enabled`); 
  console.log(`⏰ Session timeout checking: enabled (1 hour limit)`);
  console.log(`🎥 Sharing event tracking: enabled`);
 
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  clearInterval(connectionRateCleanup);
  httpServer.close(() => {
    redis.disconnect();
    console.log('🛑 Server closed');
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  clearInterval(connectionRateCleanup);
  httpServer.close(() => {
    redis.disconnect();
    console.log('🛑 Server closed');
  });
});