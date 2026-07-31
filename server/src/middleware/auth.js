const { verifyAccessToken } = require('../utils/jwt');
const { get, run } = require('../db/database');
const { getClientIp } = require('../utils/ip');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not logged in, please log in first' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired, please log in again', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid login credentials' });
  }

  // Verify account is still active (not frozen / deactivated)
  try {
    const user = await get('SELECT id, frozen, is_active FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ error: 'Account not found' });
    }
    if (user.frozen) {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support for details.', code: 'ACCOUNT_FROZEN' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated.', code: 'ACCOUNT_INACTIVE' });
    }
  } catch (dbErr) {
    // DB error — don't block auth, log and proceed with JWT claims
    console.error('Auth DB check failed:', dbErr.message);
  }

  req.user = decoded; // { id, email, is_admin }

  // Log real client IP periodically (throttled: once per hour per user)
  // + update last_active_at
  try {
    const ip = getClientIp(req);
    const now = new Date().toISOString();
    if (ip) {
      const lastLog = await get(
        "SELECT ip_address, created_at FROM ip_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        [decoded.id]
      );
      const isNewIp = !lastLog || lastLog.ip_address !== ip;
      const isStale = !lastLog || (new Date() - new Date(lastLog.created_at)) > 3600000;
      if (isNewIp || isStale) {
        await run('INSERT INTO ip_log (user_id, ip_address) VALUES (?, ?)', [decoded.id, ip]);
      }
    }
    // Update last active (throttled: every 5 min to avoid write storms)
    const lastActive = await get('SELECT last_active_at FROM users WHERE id = ?', [decoded.id]);
    if (!lastActive?.last_active_at || (new Date(now) - new Date(lastActive.last_active_at)) > 300000) {
      await run('UPDATE users SET last_active_at = ? WHERE id = ?', [now, decoded.id]);
    }
  } catch {} // silent

  next();
}

module.exports = authMiddleware;
