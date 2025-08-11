const express = require('express');
const { apiLimiter } = require('../middleware/rateLimit');
const RoomService = require('../services/room');
const { redis } = require('../utils/redis');
const logger = require('../utils/logger');

const router = express.Router();
const roomService = new RoomService(redis);

router.get('/rooms/:roomId/analytics', apiLimiter, async (req, res) => {
  const { roomId } = req.params;
  if (!roomId || !/^\d{9}$/.test(roomId)) {
    return res.status(400).json({ error: 'Invalid room ID format' });
  }
  try {
    const stats = await roomService.getViewerStats(roomId);
    res.json({ stats });
    } catch (error) {
      logger.error('Viewer analytics error:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  });

module.exports = router;
