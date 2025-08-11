const express = require('express');
const health = require('./health');
const room = require('./room');
const stats = require('./stats');
const analytics = require('./analytics');

const router = express.Router();

router.use(health);
router.use(room);
router.use(stats);
router.use(analytics);

module.exports = router;
