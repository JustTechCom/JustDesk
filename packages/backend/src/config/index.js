require('dotenv').config();
const Joi = require('joi');

// Validate and parse environment variables
const envSchema = Joi.object({
  NODE_ENV: Joi.string().default('development'),
  PORT: Joi.string().pattern(/^\d+$/).default('3001'),
  FRONTEND_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.string().pattern(/^\d+$/).default('6379'),
  REDIS_PASSWORD: Joi.string().allow(''),
  SESSION_SECRET: Joi.string().default('change-this-secret'),
  JWT_SECRET: Joi.string().default('change-this-jwt-secret'),
  RATE_LIMIT_WINDOW_MS: Joi.string().pattern(/^\d+$/).default(String(15 * 60 * 1000)),
  RATE_LIMIT_MAX_REQUESTS: Joi.string().pattern(/^\d+$/).default('100'),
  LOG_LEVEL: Joi.string().default('info'),
  LOG_FILE: Joi.string().default('logs/app.log')
}).unknown();

const { value: env, error } = envSchema.validate(process.env, { abortEarly: false });

if (error) {
  console.error('❌ Environment validation error:', error.details.map(d => d.message).join(', '));
  process.exit(1);
}

module.exports = {
  app: {
    env: env.NODE_ENV,
    port: parseInt(env.PORT, 10),
    frontendUrl: env.FRONTEND_URL
  },
  redis: {
    url: env.REDIS_URL,
    host: env.REDIS_HOST,
    port: parseInt(env.REDIS_PORT, 10),
    password: env.REDIS_PASSWORD,
    db: 0,
    keyPrefix: 'justdesk:'
  },
  security: {
    sessionSecret: env.SESSION_SECRET,
    jwtSecret: env.JWT_SECRET,
    bcryptRounds: 10
  },
  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10)
  },
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  room: {
    maxViewers: 10,
    sessionTimeout: 3600000, // 1 hour
    idLength: 9,
    passwordLength: 6
  },
  webrtc: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  },
  logging: {
    level: env.LOG_LEVEL,
    file: env.LOG_FILE
  }
};

