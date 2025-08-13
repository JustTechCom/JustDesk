const crypto = require('crypto');
const config = require('../config');
const { setValue, getValue, deleteValue } = require('../utils/redis');

class AuthService {
  constructor() {
    // Sessions are stored in Redis
  }

  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async createSession(userId, metadata = {}) {
    const token = this.generateSessionToken();
    const session = {
      userId,
      token,
      created: Date.now(),
      lastAccess: Date.now(),
      ...metadata,
    };

    await setValue(token, JSON.stringify(session), config.room.sessionTimeout);
    return token;
  }

  async validateSession(token) {
    const data = await getValue(token);

    if (!data) {
      return null;
    }

    const session = JSON.parse(data);
    session.lastAccess = Date.now();

    await setValue(token, JSON.stringify(session), config.room.sessionTimeout);
    return session;
  }

  async revokeSession(token) {
    const result = await deleteValue(token);
    return result > 0;
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

  // Generate a secure SHA-256 hash of the provided data using the session secret
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
