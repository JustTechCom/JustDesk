const express = require('express');
const { strictLimiter } = require('../middleware/rateLimit');
const { redis } = require('../utils/redis');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/room/:roomId', strictLimiter, async (req, res) => {
  const { roomId } = req.params;

  if (!roomId || !/^\d{9}$/.test(roomId)) {
    return res.status(400).json({ error: 'Invalid room ID format' });
  }

  try {
    const roomData = await redis.get(`room:${roomId}`);

    if (!roomData) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const room = JSON.parse(roomData);
    res.json({
      roomId: room.roomId,
      created: room.created,
      participantCount: room.participants.length,
      active: true,
      sessionStartTime: room.sessionStartTime,
      sharingStartTime: room.sharingStartTime,
      isSharing: room.isSharing || false,
    });
    } catch (error) {
      logger.error('Room info error:', error);
      res.status(500).json({ error: 'Failed to get room info' });
    }
  });

module.exports = router;
