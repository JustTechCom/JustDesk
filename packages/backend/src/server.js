const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Redis connection with proper error handling
let redis;

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
    // Render internal Redis
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
  });

  redis.on('ready', () => {
    console.log('✅ Redis ready to accept commands');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
  });

  redis.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });

} catch (error) {
  console.error('❌ Redis initialization error:', error);
  process.exit(1);
}

// CORS - Frontend URL'leri dahil et
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
app.use(express.json());

// Socket.IO with proper CORS
const io = new Server(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'],
  allowEIO3: true
});

// Connection tracking
const connections = new Map();

// Helper functions
function generateRoomId() {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

function generatePassword() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Health check with Redis status
app.get('/api/health', async (req, res) => {
  let redisStatus = 'disconnected';
  
  try {
    await redis.ping();
    redisStatus = 'connected';
  } catch (error) {
    redisStatus = 'error: ' + error.message;
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    redis: redisStatus,
    activeConnections: connections.size
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ New socket connection: ${socket.id}`);

  // Test Redis connection on each socket connection
  socket.emit('server-status', { connected: true });

  socket.on('create-room', async (callback) => {
    console.log(`🏠 Creating room for socket: ${socket.id}`);
    
    try {
      // Test Redis first
      await redis.ping();
      console.log('✅ Redis ping successful');

      const roomId = generateRoomId();
      const password = generatePassword();
      
      console.log(`🎲 Generated Room ID: ${roomId}, Password: ${password}`);
      
      const roomData = {
        hostId: socket.id,
        roomId,
        password,
        created: Date.now(),
        participants: []
      };

      // Store in Redis with expiration
      const key = `room:${roomId}`;
      await redis.setex(key, 3600, JSON.stringify(roomData));
      
      console.log(`💾 Room data stored in Redis with key: ${key}`);

      // Join socket room
      socket.join(roomId);
      connections.set(socket.id, { roomId, role: 'host' });

      console.log(`✅ Room created successfully: ${roomId}`);
      
      // Send response
      if (callback && typeof callback === 'function') {
        callback({ success: true, roomId, password });
      } else {
        socket.emit('room-created', { success: true, roomId, password });
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

  socket.on('join-room', async ({ roomId, password }, callback) => {
    console.log(`🚪 Joining room ${roomId} for socket: ${socket.id}`);
    
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

      // Join room
      socket.join(roomId);
      connections.set(socket.id, { roomId, role: 'viewer' });
      
      // Update participants
      room.participants.push(socket.id);
      await redis.setex(`room:${roomId}`, 3600, JSON.stringify(room));

      // Notify host
      socket.to(room.hostId).emit('viewer-joined', {
        viewerId: socket.id,
        roomId
      });

      console.log(`✅ Viewer ${socket.id} joined room ${roomId}`);
      callback({ success: true, hostId: room.hostId });
      
    } catch (error) {
      console.error('❌ Error joining room:', error);
      callback({ success: false, error: 'Failed to join room: ' + error.message });
    }
  });

  // WebRTC signaling
  socket.on('offer', ({ offer, to }) => {
    console.log(`📡 Forwarding offer from ${socket.id} to ${to}`);
    socket.to(to).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ answer, to }) => {
    console.log(`📡 Forwarding answer from ${socket.id} to ${to}`);
    socket.to(to).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`👋 Socket disconnected: ${socket.id}`);
    
    const connection = connections.get(socket.id);
    if (!connection) return;

    const { roomId, role } = connection;
    
    try {
      if (role === 'host') {
        // Host disconnected, close room
        await redis.del(`room:${roomId}`);
        io.to(roomId).emit('host-disconnected');
        console.log(`🏠 Room ${roomId} closed (host disconnected)`);
      } else {
        // Viewer disconnected
        const roomData = await redis.get(`room:${roomId}`);
        if (roomData) {
          const room = JSON.parse(roomData);
          room.participants = room.participants.filter(id => id !== socket.id);
          await redis.setex(`room:${roomId}`, 3600, JSON.stringify(room));
          
          socket.to(room.hostId).emit('viewer-disconnected', {
            viewerId: socket.id
          });
        }
      }
    } catch (error) {
      console.error('❌ Error handling disconnect:', error);
    }
    
    connections.delete(socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 JustDesk backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 CORS origins: ${corsOptions.origin}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    redis.disconnect();
    console.log('🛑 Server closed');
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    redis.disconnect();
    console.log('🛑 Server closed');
  });
});
