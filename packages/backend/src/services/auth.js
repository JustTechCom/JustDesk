const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.sessionStore = new Map();
  }

  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  createSession(userId, metadata = {}) {
    const token = this.generateSessionToken();
    const session = {
      userId,
      token,
      created: Date.now(),
      lastAccess: Date.now(),
      ...metadata
    };

    this.sessionStore.set(token, session);
    
    // Clean up expired sessions periodically
    setTimeout(() => {
      this.sessionStore.delete(token);
    }, config.room.sessionTimeout);

    return token;
  }

  validateSession(token) {
    const session = this.sessionStore.get(token);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (Date.now() - session.created > config.room.sessionTimeout) {
      this.sessionStore.delete(token);
      return null;
    }

    // Update last access time
    session.lastAccess = Date.now();
    return session;
  }

  revokeSession(token) {
    return this.sessionStore.delete(token);
  }

  // Rate limiting helper
  checkRateLimit(identifier, limit = 10, window = 60000) {
    // Simple in-memory rate limiting
    // In production, use Redis for distributed rate limiting
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    
    if (!this.rateLimitStore) {
      this.rateLimitStore = new Map();
    }

    let record = this.rateLimitStore.get(key);
    
    if (!record || now - record.windowStart > window) {
      record = {
        windowStart: now,
        count: 0
      };
    }

    record.count++;
    this.rateLimitStore.set(key, record);

    return record.count <= limit;
  }

  // Generate API key for future use
  generateApiKey() {
    const prefix = 'jd_';
    const key = crypto.randomBytes(24).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return `${prefix}${key}`;
  }

  // Hash sensitive data
  // Hash sensitive data
  hashData(data) {
    return crypto
      .createHash('sha256')
      .update(data + config.security.sessionSecret)
      .digest('hex');
  }

  // Verify hashed data
  verifyHash(data, hash) {
    return this.hashData(data) === hash;
  }
}

module.exports = new AuthService();