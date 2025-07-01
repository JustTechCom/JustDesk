const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const app = express();
const httpServer = createServer(app);

// Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
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

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Create a new room for screen sharing
  socket.on('create-room', async (callback) => {
    try {
      const roomId = generateRoomId();
      const password = generatePassword();
      
      const roomData = {
        hostId: socket.id,
        roomId,
        password,
        created: Date.now(),
        participants: []
      };

      // Store room data in Redis (expires in 1 hour)
      await redis.setex(`room:${roomId}`, 3600, JSON.stringify(roomData));
      
      // Join the room
      socket.join(roomId);
      connections.set(socket.id, { roomId, role: 'host' });

      console.log(`Room created: ${roomId}`);
      callback({ success: true, roomId, password });
    } catch (error) {
      console.error('Error creating room:', error);
      callback({ success: false, error: 'Failed to create room' });
    }
  });

  // Join an existing room
  socket.on('join-room', async ({ roomId, password }, callback) => {
    try {
      const roomData = await redis.get(`room:${roomId}`);
      
      if (!roomData) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      const room = JSON.parse(roomData);
      
      if (room.password !== password) {
        callback({ success: false, error: 'Invalid password' });
        return;
      }

      // Add to room
      socket.join(roomId);
      connections.set(socket.id, { roomId, role: 'viewer' });
      
      // Update room data
      room.participants.push(socket.id);
      await redis.setex(`room:${roomId}`, 3600, JSON.stringify(room));

      // Notify host
      socket.to(room.hostId).emit('viewer-joined', {
        viewerId: socket.id,
        roomId
      });

      console.log(`Viewer ${socket.id} joined room ${roomId}`);
      callback({ success: true, hostId: room.hostId });
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ success: false, error: 'Failed to join room' });
    }
  });

  // WebRTC signaling
  socket.on('offer', ({ offer, to }) => {
    console.log(`Sending offer from ${socket.id} to ${to}`);
    socket.to(to).emit('offer', {
      offer,
      from: socket.id
    });
  });

  socket.on('answer', ({ answer, to }) => {
    console.log(`Sending answer from ${socket.id} to ${to}`);
    socket.to(to).emit('answer', {
      answer,
      from: socket.id
    });
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    socket.to(to).emit('ice-candidate', {
      candidate,
      from: socket.id
    });
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`Disconnected: ${socket.id}`);
    
    const connection = connections.get(socket.id);
    if (!connection) return;

    const { roomId, role } = connection;
    
    if (role === 'host') {
      // Host disconnected, close the room
      await redis.del(`room:${roomId}`);
      io.to(roomId).emit('host-disconnected');
      console.log(`Room ${roomId} closed (host disconnected)`);
    } else {
      // Viewer disconnected, update room data
      const roomData = await redis.get(`room:${roomId}`);
      if (roomData) {
        const room = JSON.parse(roomData);
        room.participants = room.participants.filter(id => id !== socket.id);
        await redis.setex(`room:${roomId}`, 3600, JSON.stringify(room));
        
        // Notify host
        socket.to(room.hostId).emit('viewer-disconnected', {
          viewerId: socket.id
        });
      }
    }
    
    connections.delete(socket.id);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Room info endpoint (for debugging)
app.get('/api/room/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const roomData = await redis.get(`room:${roomId}`);
  
  if (!roomData) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  
  const room = JSON.parse(roomData);
  res.json({
    roomId: room.roomId,
    created: room.created,
    participantCount: room.participants.length
  });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`✅ JustDesk backend running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    redis.disconnect();
    console.log('Server closed');
  });
});