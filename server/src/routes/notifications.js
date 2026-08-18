const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, all, run } = require('../db/database');
const { sendPush } = require('../push');

const router = Router();
router.use(authMiddleware);

// POST /api/notifications/device — register device token for push notifications
router.post('/device', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });
  await run('DELETE FROM device_tokens WHERE token = ?', [token]);
  await run('INSERT INTO device_tokens (user_id, token) VALUES (?, ?)', [req.user.id, token]);
  res.json({ ok: true });
});

// GET /api/notifications
router.get('/', async (req, res) => {
  const rows = await all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
    [req.user.id]
  );
  const unread = await get(
    'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = false',
    [req.user.id]
  );
  res.json({ notifications: rows, unread: unread?.c || 0 });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  await run('UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
  await run('UPDATE notifications SET is_read = true WHERE user_id = ?', [req.user.id]);
  res.json({ ok: true });
});

// Helper: add notification
async function notify(userId, title, body, type = 'info') {
  await run('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)',
    [userId, title, body, type]);
  // Also push to the user's devices (no-op until FIREBASE_SERVICE_ACCOUNT is set)
  sendPush(userId, title, body).catch(() => {});
}

module.exports = { router, notify };
