const crypto = require('crypto');

// Compute a SHA-256 fingerprint of a base64 data-URI image (for duplicate-photo detection).
// Returns a hex string, or '' if the input is not a valid data URI.
function hashImage(dataUri) {
  if (!dataUri || typeof dataUri !== 'string') return '';
  const m = /^data:[^;]+;base64,(.*)$/s.exec(dataUri);
  if (!m) return '';
  return crypto.createHash('sha256').update(m[1]).digest('hex');
}

module.exports = { hashImage };
