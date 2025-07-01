const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Strict rate limiter for room creation
const roomCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 rooms per 5 minutes
  message: 'Too many rooms created, please try again later.',
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use socket ID if available, otherwise fall back to IP
    return req.socketId || req.ip;
  }
});

// Connection attempt limiter
const connectionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 attempts per minute
  message: 'Too many connection attempts, please try again later.'
});

module.exports = {
  generalLimiter,
  roomCreationLimiter,
  connectionLimiter
};