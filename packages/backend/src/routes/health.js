const express = require('express');
const { healthLimiter } = require('../middleware/rateLimit');
const { getRedisHealth } = require('../utils/redis');
const connections = require('../utils/connections');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/health', healthLimiter, async (req, res) => {
  try {
    const redisStatus = await getRedisHealth();
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      redis: redisStatus,
      activeConnections: connections.size,
      memoryUsage: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    res.json(healthData);
    } catch (error) {
      logger.error('Health check error:', error);
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  });

module.exports = router;
