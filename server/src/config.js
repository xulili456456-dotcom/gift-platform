const path = require('path');
const crypto = require('crypto');

function requireSecret(name) {
  const val = process.env[name];
  if (val && val.length >= 32) return val;
  if (process.env.NODE_ENV === 'production') {
    console.error(`FATAL: ${name} must be set to a random string (≥32 chars) in production.`);
  }
  // Dev fallback: auto-generate a random secret (never leaks in source)
  const fallback = crypto.randomBytes(64).toString('hex');
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`WARNING: ${name} not set — using auto-generated random value for dev.`);
  }
  return fallback;
}

const ALLOWED_ORIGINS = [
  'https://www.shopeetrade.com',
  'https://shopeetrade.com',
  'https://gift-platform-h6um.onrender.com',
  'https://gifthaven-shopee.surge.sh',
  'http://localhost:5173',
  'http://localhost:3001',
  // Capacitor Android WebView origin (no port)
  'http://localhost',
  'https://localhost',
];

function getAllowedOrigins() {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(s => s.trim());
  }
  return ALLOWED_ORIGINS;
}

module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: requireSecret('JWT_SECRET'),
  JWT_REFRESH_SECRET: requireSecret('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: '24h',
  JWT_REFRESH_EXPIRES_IN: '7d',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gift_platform',
  UPLOADS_DIR: path.join(__dirname, '..', 'uploads'),
  MAX_REFERRAL_LEVEL: 3,
  CORS_ORIGIN: getAllowedOrigins(),
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Latest app version + APK download URL (for in-app auto-update)
  APP_VERSION: '1.0.8',
  APP_APK_URL: 'https://github.com/xulili456456-dotcom/gift-platform/releases/download/v1.0.8/Shopping-release.apk',
};
