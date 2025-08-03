const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class SignalingService {
  constructor(io, redis, fileTransferService, roomService) {
    this.io = io;
    this.redis = redis;
    this.fileTransferService = fileTransferService;
    this.roomService = roomService;
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
    socket.on('file-transfer-init', (data, cb) => this.handleFileTransferInit(socket, data, cb));
    socket.on('file-transfer-chunk', (data) => this.handleFileTransferChunk(socket, data));
    socket.on('file-transfer-complete', (data) => this.handleFileTransferComplete(socket, data));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  async handleCreateRoom(socket, callback) {
    try {
      const room = await this.roomService.createRoom(socket.id);
      
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
      const room = await this.roomService.getRoom(roomId);
      
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

      const result = await this.roomService.joinRoom(roomId, socket.id);
      
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
      await this.roomService.leaveRoom(roomId, socket.id);
      
      // Notify host
      const room = await this.roomService.getRoom(roomId);
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

  async handleFileTransferInit(socket, data, callback) {
    try {
      const transferId = await this.fileTransferService.initTransfer({
        ...data,
        from: socket.id,
      });
      socket.to(data.to).emit('file-transfer-init', {
        transferId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        from: socket.id,
      });
      if (callback) callback({ success: true, transferId });
    } catch (error) {
      logger.error('File transfer init error:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  }

  async handleFileTransferChunk(socket, { transferId, chunk, to }) {
    try {
      await this.fileTransferService.storeChunk(transferId, chunk);
      socket.to(to).emit('file-transfer-chunk', {
        transferId,
        chunk,
        from: socket.id,
      });
    } catch (error) {
      logger.error('File transfer chunk error:', error);
      socket.emit('file-transfer-error', {
        transferId,
        error: error.message,
      });
    }
  }

  async handleFileTransferComplete(socket, { transferId, to }) {
    try {
      const { meta, data } = await this.fileTransferService.completeTransfer(transferId);
      socket.to(to).emit('file-transfer-complete', {
        transferId,
        from: socket.id,
        meta,
        data,
      });
    } catch (error) {
      logger.error('File transfer complete error:', error);
      socket.emit('file-transfer-error', {
        transferId,
        error: error.message,
      });
    }
  }

  async handleDisconnect(socket) {
    logger.info(`Socket disconnected: ${socket.id}`);
    
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    const { roomId, role } = connection;
    
    if (role === 'host') {
      // Host disconnected, close the room
      await this.roomService.closeRoom(roomId);
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
      await this.roomService.leaveRoom(roomId, socket.id);
      
      const room = await this.roomService.getRoom(roomId);
      if (room) {
        socket.to(room.hostId).emit('viewer-disconnected', {
          viewerId: socket.id
        });
      }
    }

    await this.fileTransferService.cleanupTransfers(socket.id);
    this.connections.delete(socket.id);
  }
}

module.exports = SignalingService;