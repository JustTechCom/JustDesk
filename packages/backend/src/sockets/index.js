const crypto = require('crypto');
const RoomService = require('../services/room');
const { redis, getRedisHealth } = require('../utils/redis');
const connections = require('../utils/connections');
const logger = require('../utils/logger');

const roomService = new RoomService(redis);

function generateRoomId() {
  return crypto.randomInt(100000000, 999999999).toString();
}

function generatePassword() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

module.exports = (io) => {
  return (socket) => {
      logger.info(`✅ New socket connection: ${socket.id}`);

    socket.emit('server-status', { connected: true });

    socket.on('create-room', async (callback) => {
        logger.info(`🏠 Creating room for socket: ${socket.id}`);

      try {
        const redisStatus = await getRedisHealth();
        if (redisStatus.includes('error')) {
          throw new Error('Redis not available');
        }

        const roomId = generateRoomId();
        const password = generatePassword();
        const now = Date.now();

        const roomData = {
          hostId: socket.id,
          roomId,
          password,
          created: now,
          sessionStartTime: now,
          participants: [],
          lastActivity: now,
          isSharing: false,
          sharingStartTime: null,
        };

        const key = `room:${roomId}`;
        await redis.setex(key, 3600, JSON.stringify(roomData));

        socket.join(roomId);
        connections.set(socket.id, {
          roomId,
          role: 'host',
          connectedAt: now,
          sessionStartTime: now,
        });

        if (callback && typeof callback === 'function') {
          callback({
            success: true,
            roomId,
            password,
            sessionStartTime: now,
          });
        } else {
          socket.emit('room-created', {
            success: true,
            roomId,
            password,
            sessionStartTime: now,
          });
        }
      } catch (error) {
          logger.error('❌ Error creating room:', error);
        const errorResponse = {
          success: false,
          error: 'Failed to create room: ' + error.message,
        };
        if (callback && typeof callback === 'function') {
          callback(errorResponse);
        } else {
          socket.emit('room-creation-error', errorResponse);
        }
      }
    });

    socket.on('join-room', async ({ roomId, password, nickname }, callback) => {
        logger.info(`🚪 Joining room ${roomId} for socket: ${socket.id}`);

      if (!roomId || !password || !/^\d{9}$/.test(roomId)) {
        callback({ success: false, error: 'Invalid room ID or password format' });
        return;
      }

      try {
        const room = await roomService.getRoom(roomId);
        if (!room) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        if (room.password !== password) {
          callback({ success: false, error: 'Invalid password' });
          return;
        }

        const result = await roomService.joinRoom(roomId, socket.id, nickname);
        if (!result.success) {
          callback({ success: false, error: result.error });
          return;
        }

        socket.join(roomId);
        connections.set(socket.id, {
          roomId,
          role: 'viewer',
          connectedAt: Date.now(),
          nickname: nickname || '',
        });

        const updatedRoom = await roomService.getRoom(roomId);

        socket.to(updatedRoom.hostId).emit('viewer-joined', {
          viewerId: socket.id,
          nickname: nickname || '',
          roomId,
          requestStream: true,
          joinedAt: Date.now(),
          totalViewers: updatedRoom.participants.length,
        });

        socket.to(roomId).emit('participant-update', {
          type: 'joined',
          viewerId: socket.id,
          nickname: nickname || '',
          totalViewers: updatedRoom.participants.length,
        });

        const stats = await roomService.getViewerStats(roomId);
        io.to(roomId).emit('viewer-stats', stats);

        callback({ success: true, hostId: updatedRoom.hostId });
      } catch (error) {
        logger.error('❌ Error joining room:', error);
        callback({ success: false, error: 'Failed to join room: ' + error.message });
      }
    });

    socket.on('sharing-started', async ({ roomId, startTime }) => {
      try {
        const roomData = await redis.get(`room:${roomId}`);
        if (roomData) {
          const room = JSON.parse(roomData);
          room.sharingStartTime = startTime;
          room.isSharing = true;
          room.lastActivity = Date.now();
          await redis.setex(`room:${roomId}`, 3600, JSON.stringify(room));
          socket.to(roomId).emit('host-started-sharing', {
            startTime,
            message: 'Host started sharing their screen',
          });
        }
      } catch (error) {
        logger.error('❌ Error updating sharing start time:', error);
      }
    });

    socket.on('sharing-stopped', async ({ roomId, stopTime }) => {
      try {
        const roomData = await redis.get(`room:${roomId}`);
        if (roomData) {
          const room = JSON.parse(roomData);
          const sessionDuration = room.sharingStartTime ? stopTime - room.sharingStartTime : 0;
          room.sharingStopTime = stopTime;
          room.isSharing = false;
          room.sessionDuration = sessionDuration;
          room.lastActivity = Date.now();
          await redis.setex(`room:${roomId}`, 3600, JSON.stringify(room));
          socket.to(roomId).emit('host-stopped-sharing', {
            stopTime,
            sessionDuration,
            message: 'Host stopped sharing their screen',
          });
        }
      } catch (error) {
        logger.error('❌ Error updating sharing stop time:', error);
      }
    });

    socket.on('offer', ({ offer, to }) => {
      if (!offer || !to || typeof to !== 'string') return;
      socket.to(to).emit('offer', { offer, from: socket.id });
    });

    socket.on('answer', ({ answer, to }) => {
      if (!answer || !to || typeof to !== 'string') return;
      socket.to(to).emit('answer', { answer, from: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, to }) => {
      if (!candidate || !to || typeof to !== 'string') return;
      socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

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
              sharingStartTime: room.sharingStartTime,
            },
          });
        } else {
          callback({ success: false, error: 'Room not found' });
        }
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

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
            lastActivity: room.lastActivity,
          };
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

    socket.on('ping', (callback) => {
      if (callback && typeof callback === 'function') {
        callback({ pong: true, timestamp: Date.now() });
      }
    });

    socket.on('disconnect', async () => {
        logger.info(`👋 Socket disconnected: ${socket.id}`);

      const connection = connections.get(socket.id);
      if (!connection) return;

      const { roomId, role } = connection;

      try {
        if (role === 'host') {
          const roomData = await redis.get(`room:${roomId}`);
          if (roomData) {
            const room = JSON.parse(roomData);
              logger.info(`📢 Notifying ${room.participants.length} viewers about host disconnect`);
          }
          await roomService.closeRoom(roomId);
          socket.to(roomId).emit('host-disconnected');
          const roomConnections = Array.from(connections.entries()).filter(
            ([_, conn]) => conn.roomId === roomId
          );
          roomConnections.forEach(([socketId]) => {
            connections.delete(socketId);
          });
        } else if (role === 'viewer') {
          const nick = connection.nickname || '';
          await roomService.leaveRoom(roomId, socket.id, nick);
          const room = await roomService.getRoom(roomId);
          if (room) {
            socket.to(room.hostId).emit('viewer-disconnected', {
              viewerId: socket.id,
              nickname: nick,
              totalViewers: room.participants.length,
            });
            socket.to(roomId).emit('participant-update', {
              type: 'left',
              viewerId: socket.id,
              nickname: nick,
              totalViewers: room.participants.length,
            });
            const stats = await roomService.getViewerStats(roomId);
            io.to(roomId).emit('viewer-stats', stats);
          }
        }
      } catch (error) {
          logger.error('❌ Error handling disconnect:', error);
      }

      connections.delete(socket.id);
    });
  };
};
