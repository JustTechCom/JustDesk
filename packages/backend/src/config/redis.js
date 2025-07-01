const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
  }

  connect() {
    const redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      keyPrefix: config.redis.keyPrefix,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    };

    // Main client for general operations
    this.client = new Redis(redisConfig);

    // Separate clients for pub/sub
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    // Event handlers
    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    return this;
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      throw error;
    }
  }

  async set(key, value, ttl) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        return await this.client.setex(key, ttl, serialized);
      }
      return await this.client.set(key, serialized);
    } catch (error) {
      logger.error('Redis set error:', error);
      throw error;
    }
  }

  async del(key) {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis del error:', error);
      throw error;
    }
  }

  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis exists error:', error);
      throw error;
    }
  }

  async expire(key, seconds) {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis expire error:', error);
      throw error;
    }
  }

  async keys(pattern) {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis keys error:', error);
      throw error;
    }
  }

  // Pub/Sub methods
  async publish(channel, message) {
    try {
      return await this.publisher.publish(channel, JSON.stringify(message));
    } catch (error) {
      logger.error('Redis publish error:', error);
      throw error;
    }
  }

  async subscribe(channel, callback) {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          callback(JSON.parse(message));
        }
      });
    } catch (error) {
      logger.error('Redis subscribe error:', error);
      throw error;
    }
  }

  async unsubscribe(channel) {
    try {
      return await this.subscriber.unsubscribe(channel);
    } catch (error) {
      logger.error('Redis unsubscribe error:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) await this.client.quit();
      if (this.subscriber) await this.subscriber.quit();
      if (this.publisher) await this.publisher.quit();
      logger.info('Redis clients disconnected');
    } catch (error) {
      logger.error('Redis disconnect error:', error);
    }
  }
}

module.exports = new RedisClient();