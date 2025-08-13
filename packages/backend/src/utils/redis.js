const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

let redis;
const redisHealthCache = {
  status: 'unknown',
  lastCheck: 0,
  cacheDuration: 30000, // 30 seconds cache
};

try {
  if (config.redis.url) {
    redis = new Redis(config.redis.url, {
      retryStrategy: (times) => {
          logger.warn(`Redis retry attempt ${times}`);
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });
  } else {
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => {
          logger.warn(`Redis retry attempt ${times}`);
        return Math.min(times * 50, 2000);
      },
    });
  }

    redis.on('connect', () => {
      logger.info('✅ Redis connected successfully');
      redisHealthCache.status = 'connected';
      redisHealthCache.lastCheck = Date.now();
    });

    redis.on('ready', () => {
      logger.info('✅ Redis ready to accept commands');
    });

    redis.on('error', (err) => {
      logger.error('❌ Redis connection error:', err.message);
      redisHealthCache.status = 'error: ' + err.message;
      redisHealthCache.lastCheck = Date.now();
    });

    redis.on('reconnecting', () => {
      logger.warn('🔄 Redis reconnecting...');
      redisHealthCache.status = 'reconnecting';
      redisHealthCache.lastCheck = Date.now();
    });
  } catch (error) {
    logger.error('❌ Redis initialization error:', error);
    redisHealthCache.status = 'initialization error';
  }

async function getRedisHealth() {
  const now = Date.now();

  if (now - redisHealthCache.lastCheck < redisHealthCache.cacheDuration) {
    return redisHealthCache.status;
  }

  try {
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

async function setValue(key, value, ttl) {
  if (ttl) {
    return redis.set(key, value, 'PX', ttl);
  }
  return redis.set(key, value);
}

async function getValue(key) {
  return redis.get(key);
}

async function deleteValue(key) {
  return redis.del(key);
}

module.exports = { redis, getRedisHealth, setValue, getValue, deleteValue };
