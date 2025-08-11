const express = require('express');
const { apiLimiter } = require('../middleware/rateLimit');
const connections = require('../utils/connections');

const router = express.Router();

router.get('/stats', apiLimiter, (req, res) => {
  res.json({
    totalConnections: connections.size,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
