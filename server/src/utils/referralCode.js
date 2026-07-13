const crypto = require('crypto');

function generateReferralCode(length = 8) {
  // Generate a URL-safe random string
  return crypto.randomBytes(length)
    .toString('base64url')
    .slice(0, length)
    .toUpperCase();
}

module.exports = { generateReferralCode };
