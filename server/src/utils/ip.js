/**
 * Get the real client IP address.
 * Render sits behind Cloudflare — CF-Connecting-IP is the real client IP.
 */
function getClientIp(req) {
  // 1. Cloudflare: CF-Connecting-IP (most reliable)
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.trim()) return cf.trim();

  // 2. Express req.ip (works if trust proxy is configured correctly)
  if (req.ip && req.ip !== '::1' && req.ip !== '127.0.0.1' && !req.ip.startsWith('::ffff:10.') && !req.ip.startsWith('10.') && !req.ip.startsWith('172.1') && !req.ip.startsWith('192.168.')) {
    return req.ip.replace(/^::ffff:/, '');
  }

  // 3. X-Forwarded-For (first entry = real client)
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') {
    const first = xff.split(',')[0].trim();
    if (first && !first.startsWith('10.') && !first.startsWith('172.1') && !first.startsWith('192.168.') && first !== '127.0.0.1') {
      return first.replace(/^::ffff:/, '');
    }
  }

  // 4. X-Real-IP
  const xri = req.headers['x-real-ip'];
  if (typeof xri === 'string' && xri.trim()) {
    const x = xri.trim();
    if (!x.startsWith('10.') && !x.startsWith('172.1') && !x.startsWith('192.168.')) return x;
  }

  // 5. True-Client-IP (Akamai / some Cloudflare setups)
  const tci = req.headers['true-client-ip'];
  if (typeof tci === 'string' && tci.trim()) return tci.trim();

  return '';
}

module.exports = { getClientIp };
