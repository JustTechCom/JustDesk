const logger = require('../utils/logger');
const roomService = require('./room');

class SignalingService {
  constructor(io, redis) {
    this.io = io;
    this.redis = redis;
    this.connections = new Map();
  }

  handleConnection(socket) {
    logger.info(`New socket connection: ${socket.id}`);
    
    socket.on('create-room', (callback) => this.handleCreateRoom(socket, callback));
    socket.on('join-room', (data, callback) => this.handleJoinRoom(socket, data, callback));
    socket.on('leave-room', () => this.handleLeaveRoom(socket));
    socket.on('offer', (data) => this.handleOffer(socket, data));
    socket.on('answer', (data) => this.handleAnswer(socket, data));
    socket.on('ice-candidate', (data) => this.handleIceCandidate(socket, data));
    socket.on('chat-message', (message) => this.handleChatMessage(socket, message));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  async handleCreateRoom(socket, callback) {
    try {
      const room = await roomService.createRoom(socket.id);
      
      socket.join(room.roomId);
      this.connections.set(socket.id, {
        roomId: room.roomId,
        role: 'host'
      });

      logger.info(`Room created: ${room.roomId} by ${socket.id}`);
      
      callback({
        success: true,
        roomId: room.roomId,
        password: room.password
      });
    } catch (error) {
      logger.error('Error creating room:', error);
      callback({
        success: false,
        error: 'Failed to create room'
      });
    }
  }

  async handleJoinRoom(socket, { roomId, password }, callback) {
    try {
      const room = await roomService.getRoom(roomId);
      
      if (!room) {
        callback({
          success: false,
          error: 'Room not found'
        });
        return;
      }

      if (room.password !== password) {
        callback({
          success: false,
          error: 'Invalid password'
        });
        return;
      }

      const result = await roomService.joinRoom(roomId, socket.id);
      
      if (!result.success) {
        callback({
          success: false,
          error: result.error
        });
        return;
      }

      socket.join(roomId);
      this.connections.set(socket.id, {
        roomId,
        role: 'viewer'
      });

      // Notify host
      socket.to(room.hostId).emit('viewer-joined', {
        viewerId: socket.id,
        roomId
      });

      logger.info(`Viewer ${socket.id} joined room ${roomId}`);
      
      callback({
        success: true,
        hostId: room.hostId
      });
    } catch (error) {
      logger.error('Error joining room:', error);
      callback({
        success: false,
        error: 'Failed to join room'
      });
    }
  }

  async handleLeaveRoom(socket) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    const { roomId, role } = connection;
    
    if (role === 'viewer') {
      await roomService.leaveRoom(roomId, socket.id);
      
      // Notify host
      const room = await roomService.getRoom(roomId);
      if (room) {
        socket.to(room.hostId).emit('viewer-left', {
          viewerId: socket.id
        });
      }
    }

    socket.leave(roomId);
    this.connections.delete(socket.id);
    
    logger.info(`${role} ${socket.id} left room ${roomId}`);
  }

  handleOffer(socket, { offer, to }) {
    logger.debug(`Forwarding offer from ${socket.id} to ${to}`);
    socket.to(to).emit('offer', {
      offer,
      from: socket.id
    });
  }

  handleAnswer(socket, { answer, to }) {
    logger.debug(`Forwarding answer from ${socket.id} to ${to}`);
    socket.to(to).emit('answer', {
      answer,
      from: socket.id
    });
  }

  handleIceCandidate(socket, { candidate, to }) {
    logger.debug(`Forwarding ICE candidate from ${socket.id} to ${to}`);
    socket.to(to).emit('ice-candidate', {
      candidate,
      from: socket.id
    });
  }

  handleChatMessage(socket, message) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    const { roomId } = connection;
    logger.debug(`Broadcasting chat message from ${socket.id} to room ${roomId}`);
    this.io.to(roomId).emit('chat-message', {
      message,
      from: socket.id
    });
  }

  async handleDisconnect(socket) {
    logger.info(`Socket disconnected: ${socket.id}`);
    
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    const { roomId, role } = connection;
    
    if (role === 'host') {
      // Host disconnected, close the room
      await roomService.closeRoom(roomId);
      this.io.to(roomId).emit('host-disconnected');
      
      // Disconnect all viewers
      const roomSockets = await this.io.in(roomId).fetchSockets();
      roomSockets.forEach(s => {
        if (s.id !== socket.id) {
          s.leave(roomId);
          this.connections.delete(s.id);
        }
      });
      
      logger.info(`Room ${roomId} closed due to host disconnect`);
    } else if (role === 'viewer') {
      // Viewer disconnected
      await roomService.leaveRoom(roomId, socket.id);
      
      const room = await roomService.getRoom(roomId);
      if (room) {
        socket.to(room.hostId).emit('viewer-disconnected', {
          viewerId: socket.id
        });
      }
    }
    
    this.connections.delete(socket.id);
  }
}

module.exports = SignalingService;