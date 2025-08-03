const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class FileTransferService {
  constructor(redis, options = {}) {
    this.redis = redis;
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.allowedTypes = options.allowedTypes || ['image/', 'application/pdf', 'text/'];
    this.prefix = 'file:';
  }

  async initTransfer({ fileName, fileSize, fileType, from, to }) {
    if (!fileName || !fileSize || !fileType || !from || !to) {
      throw new Error('Invalid transfer data');
    }
    if (fileSize > this.maxFileSize) {
      throw new Error('File too large');
    }
    if (!this.allowedTypes.some((t) => fileType.startsWith(t))) {
      throw new Error('Unsupported file type');
    }

    const transferId = uuidv4();
    const key = `${this.prefix}${transferId}`;

    await this.redis.hmset(key, {
      fileName,
      fileSize,
      fileType,
      from,
      to,
      received: 0,
    });
    await this.redis.expire(key, 60 * 60); // 1 hour TTL
    await this.redis.del(`${key}:chunks`); // ensure empty list
    await this.redis.sadd(`${this.prefix}socket:${from}`, transferId);
    await this.redis.expire(`${this.prefix}socket:${from}`, 60 * 60);

    logger.debug(`File transfer initialized: ${transferId} from ${from} to ${to}`);
    return transferId;
  }

  async storeChunk(transferId, chunk) {
    const key = `${this.prefix}${transferId}`;
    const meta = await this.redis.hgetall(key);
    if (!meta || !meta.fileSize) {
      throw new Error('Transfer not found');
    }
    const buffer = Buffer.from(chunk, 'base64');
    const received = parseInt(meta.received || '0', 10) + buffer.length;
    if (received > parseInt(meta.fileSize, 10)) {
      await this.cleanupTransfer(transferId, meta.from);
      throw new Error('File size mismatch');
    }

    await this.redis.rpush(`${key}:chunks`, chunk);
    await this.redis.hset(key, 'received', received);
  }

  async completeTransfer(transferId) {
    const key = `${this.prefix}${transferId}`;
    const meta = await this.redis.hgetall(key);
    if (!meta) {
      throw new Error('Transfer not found');
    }

    const chunks = await this.redis.lrange(`${key}:chunks`, 0, -1);
    await this.cleanupTransfer(transferId, meta.from);

    return { meta, data: chunks.join('') };
  }

  async cleanupTransfer(transferId, socketId) {
    const key = `${this.prefix}${transferId}`;
    await this.redis.del(key);
    await this.redis.del(`${key}:chunks`);
    if (socketId) {
      await this.redis.srem(`${this.prefix}socket:${socketId}`, transferId);
    }
  }

  async cleanupTransfers(socketId) {
    const setKey = `${this.prefix}socket:${socketId}`;
    const ids = await this.redis.smembers(setKey);
    for (const id of ids) {
      await this.cleanupTransfer(id);
    }
    await this.redis.del(setKey);
  }

  async cleanup() {
    const keys = await this.redis.keys(`${this.prefix}*`);
    if (keys.length) {
      await this.redis.del(keys);
    }
  }
}

module.exports = FileTransferService;
