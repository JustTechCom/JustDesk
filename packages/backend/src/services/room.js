const config = require('../config');
const logger = require('../utils/logger');

class RoomService {
  constructor(redis) {
    this.redis = redis;
    this.roomPrefix = 'room:';
    this.eventsSuffix = ':events';
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
      lastActivity: Date.now(),
    };

    const key = `${this.roomPrefix}${roomId}`;
    await this.redis.set(key, JSON.stringify(room), 'PX', config.room.sessionTimeout);

    logger.info(`Room created: ${roomId}`);
    return room;
  }

  async getRoom(roomId) {
    const key = `${this.roomPrefix}${roomId}`;
    const roomData = await this.redis.get(key);

    if (roomData) {
      const room = JSON.parse(roomData);
      // Update last activity
      room.lastActivity = Date.now();
      await this.redis.set(key, JSON.stringify(room), 'PX', config.room.sessionTimeout);
      return room;
    }

    return null;
  }

  async joinRoom(roomId, viewerId, nickname = '') {
    const key = `${this.roomPrefix}${roomId}`;
    const roomData = await this.redis.get(key);

    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    const room = JSON.parse(roomData);

    if (room.participants.length >= config.room.maxViewers) {
      return { success: false, error: 'Room is full' };
    }

    if (!room.participants.some((p) => p.id === viewerId)) {
      room.participants.push({ id: viewerId, name: nickname });
      room.lastActivity = Date.now();
      await this.redis.set(key, JSON.stringify(room), 'PX', config.room.sessionTimeout);
      await this.logViewerEvent(roomId, viewerId, nickname, 'join');
    }

    return { success: true };
  }

  async leaveRoom(roomId, viewerId, nickname = '') {
    const key = `${this.roomPrefix}${roomId}`;
    const roomData = await this.redis.get(key);

    if (!roomData) return;

    const room = JSON.parse(roomData);

    room.participants = room.participants.filter((p) => p.id !== viewerId);
    room.lastActivity = Date.now();
    await this.redis.set(key, JSON.stringify(room), 'PX', config.room.sessionTimeout);
    await this.logViewerEvent(roomId, viewerId, nickname, 'leave');
  }

  async logViewerEvent(roomId, viewerId, nickname, action) {
    const eventsKey = `${this.roomPrefix}${roomId}${this.eventsSuffix}`;
    const now = Date.now();
    const event = JSON.stringify({ viewerId, nickname, timestamp: now, action });
    await this.redis.zadd(eventsKey, now, event);
    await this.redis.expire(eventsKey, 2 * 60 * 60);
    const room = await this.getRoom(roomId);
    const cutoff = room && room.sharingStartTime ? room.sharingStartTime : now - 60 * 60 * 1000;
    await this.redis.zremrangebyscore(eventsKey, 0, cutoff);
  }

  async getViewerStats(roomId) {
    const eventsKey = `${this.roomPrefix}${roomId}${this.eventsSuffix}`;
    const room = await this.getRoom(roomId);
    if (!room || !room.sharingStartTime) return [];
    const sharingStartTime = room.sharingStartTime;
    const upperBound = sharingStartTime + 60 * 60 * 1000;
    const rawEvents = await this.redis.zrangebyscore(eventsKey, sharingStartTime, upperBound);
    const events = rawEvents.map((e) => JSON.parse(e)).sort((a, b) => a.timestamp - b.timestamp);

    let stats = [];
    let viewerCount = 0;
    let index = 0;
    for (let i = 0; i < 60; i++) {
      const end = sharingStartTime + (i + 1) * 60 * 1000;
      const minuteEvents = [];
      while (index < events.length && events[index].timestamp < end) {
        viewerCount += events[index].action === 'join' ? 1 : -1;
        minuteEvents.push({ nickname: events[index].nickname, action: events[index].action });
        index++;
      }
      stats.push({ timestamp: end, count: viewerCount, events: minuteEvents });
    }
    return stats;
  }

  async closeRoom(roomId) {
    const key = `${this.roomPrefix}${roomId}`;
    await this.redis.del(key);
    await this.redis.del(`${key}${this.eventsSuffix}`);
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
      duration: Date.now() - room.created,
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
