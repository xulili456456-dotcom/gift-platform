const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, all, run } = require('../db/database');

const router = Router();
router.use(authMiddleware);

// GET /api/notifications
router.get('/', (req, res) => {
  const rows = all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
    [req.user.id]
  );
  const unread = get(
    'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0',
    [req.user.id]
  );
  res.json({ notifications: rows, unread: unread?.c || 0 });
});

// PUT /api/notifications/read-all
router.put('/read-all', (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ ok: true });
});

// Helper: add notification
function notify(userId, title, body, type = 'info') {
  run('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)',
    [userId, title, body, type]);
}

module.exports = { router, notify };
