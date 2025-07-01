const config = require('../config');
const logger = require('../utils/logger');

class RoomService {
  constructor(redis) {
    this.redis = redis;
    this.roomPrefix = 'room:';
  }

  generateRoomId() {
    const min = Math.pow(10, config.room.idLength - 1);
    const max = Math.pow(10, config.room.idLength) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < config.room.passwordLength; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async createRoom(hostId) {
    const roomId = this.generateRoomId().toString();
    const password = this.generatePassword();
    
    const room = {
      roomId,
      hostId,
      password,
      participants: [],
      created: Date.now(),
      lastActivity: Date.now()
    };

    const key = `${this.roomPrefix}${roomId}`;
    await this.redis.set(key, room, config.room.sessionTimeout / 1000);
    
    logger.info(`Room created: ${roomId}`);
    return room;
  }

  async getRoom(roomId) {
    const key = `${this.roomPrefix}${roomId}`;
    const room = await this.redis.get(key);
    
    if (room) {
      // Update last activity
      room.lastActivity = Date.now();
      await this.redis.set(key, room, config.room.sessionTimeout / 1000);
    }
    
    return room;
  }

  async joinRoom(roomId, viewerId) {
    const key = `${this.roomPrefix}${roomId}`;
    const room = await this.redis.get(key);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.participants.length >= config.room.maxViewers) {
      return { success: false, error: 'Room is full' };
    }

    if (!room.participants.includes(viewerId)) {
      room.participants.push(viewerId);
      room.lastActivity = Date.now();
      await this.redis.set(key, room, config.room.sessionTimeout / 1000);
    }
    
    return { success: true };
  }

  async leaveRoom(roomId, viewerId) {
    const key = `${this.roomPrefix}${roomId}`;
    const room = await this.redis.get(key);
    
    if (!room) return;

    room.participants = room.participants.filter(id => id !== viewerId);
    room.lastActivity = Date.now();
    await this.redis.set(key, room, config.room.sessionTimeout / 1000);
  }

  async closeRoom(roomId) {
    const key = `${this.roomPrefix}${roomId}`;
    await this.redis.del(key);
    logger.info(`Room closed: ${roomId}`);
  }

  async getRoomStats(roomId) {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    return {
      roomId: room.roomId,
      created: new Date(room.created),
      lastActivity: new Date(room.lastActivity),
      participantCount: room.participants.length,
      duration: Date.now() - room.created
    };
  }

  async cleanupExpiredRooms() {
    // This would be called periodically to clean up expired rooms
    // Redis TTL handles this automatically, but this method could be used
    // for additional cleanup logic if needed
    logger.info('Running room cleanup...');
  }
}

module.exports = RoomService;