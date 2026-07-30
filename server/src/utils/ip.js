/**
 * Get the real client IP address.
 * Call AFTER app.set('trust proxy', 1) so req.ip is already correct.
 * Falls back to x-forwarded-for and x-real-ip headers as safety nets.
 */
function getClientIp(req) {
  // Express req.ip returns the correct IP when trust proxy is configured
  if (req.ip && req.ip !== '::1' && req.ip !== '127.0.0.1') {
    return req.ip.replace(/^::ffff:/, '');
  }

  // Fallback: parse X-Forwarded-For (first entry = real client)
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') {
    const first = xff.split(',')[0].trim();
    if (first) return first.replace(/^::ffff:/, '');
  }

  // Fallback: X-Real-IP
  const xri = req.headers['x-real-ip'];
  if (typeof xri === 'string' && xri.trim()) {
    return xri.trim().replace(/^::ffff:/, '');
  }

  // Last resort
  return (req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
}

module.exports = { getClientIp };
