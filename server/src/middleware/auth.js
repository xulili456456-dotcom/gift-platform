const { verifyAccessToken } = require('../utils/jwt');
const { get } = require('../db/database');

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
  next();
}

module.exports = authMiddleware;
