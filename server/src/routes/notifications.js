const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, all, run } = require('../db/database');

const router = Router();
router.use(authMiddleware);

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

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
  await run('UPDATE notifications SET is_read = true WHERE user_id = ?', [req.user.id]);
  res.json({ ok: true });
});

// Helper: add notification
async function notify(userId, title, body, type = 'info') {
  await run('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)',
    [userId, title, body, type]);
}

module.exports = { router, notify };
