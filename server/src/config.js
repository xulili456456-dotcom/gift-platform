const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'gift-platform-secret-change-in-production-2024',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'gift-platform-refresh-secret-change-2024',
  JWT_EXPIRES_IN: '24h',
  JWT_REFRESH_EXPIRES_IN: '7d',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gift_platform',
  UPLOADS_DIR: path.join(__dirname, '..', 'uploads'),
  MAX_REFERRAL_LEVEL: 3,
  CORS_ORIGIN: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173'),
  NODE_ENV: process.env.NODE_ENV || 'development',
};
