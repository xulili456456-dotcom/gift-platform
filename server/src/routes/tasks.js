const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { insert, all, get, run } = require('../db/database');

const router = Router();
router.use(authMiddleware);

// Check-in reward amounts per day
const CHECKIN_REWARDS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];

// POST /api/tasks/checkin
router.post('/checkin', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const last = get('SELECT id, created_at FROM task_earnings WHERE user_id = ? AND type = ? ORDER BY id DESC LIMIT 1',
    [req.user.id, 'checkin']);

  if (last) {
    const lastDate = last.created_at.slice(0, 10);
    if (lastDate === today) return res.status(400).json({ error: '今日已签到' });
  }

  // Calculate streak: count consecutive days backwards from yesterday
  let streak = 0;
  const rows = all('SELECT DISTINCT substr(created_at,1,10) as d FROM task_earnings WHERE user_id = ? AND type = ? ORDER BY d DESC LIMIT 7',
    [req.user.id, 'checkin']);
  for (let i = 0; i < rows.length; i++) {
    const expected = new Date(Date.now() - (i + 1) * 86400000).toISOString().slice(0, 10);
    if (rows[i].d === expected) streak++;
    else break;
  }

  const reward = CHECKIN_REWARDS[streak] || 0.1;
  const result = insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
    [req.user.id, reward, 'checkin', 'delivered']);
  try { require('./notifications').notify(req.user.id, '签到成功', `+$${reward} 已到账`, 'success'); } catch {}
  res.json({ id: result.id, amount: reward, streak: streak + 1 });
});

// POST /api/tasks/ad
router.post('/ad', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const count = get('SELECT COUNT(*) as c FROM task_earnings WHERE user_id = ? AND type = ? AND created_at >= ?',
    [req.user.id, 'ad', today]);

  if (count.c >= 3) return res.status(400).json({ error: '今日广告已完成' });

  const result = insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
    [req.user.id, 0.5, 'ad', 'delivered']);
  res.json({ id: result.id, amount: 0.5, remaining: 3 - count.c - 1 });
});

// GET /api/tasks/balance
router.get('/balance', (req, res) => {
  const earnings = get(
    'SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(CASE WHEN status = \'delivered\' THEN amount ELSE 0 END), 0) as available FROM task_earnings WHERE user_id = ?',
    [req.user.id]
  );
  const checkins = get('SELECT COUNT(*) as c FROM task_earnings WHERE user_id = ? AND type = ? AND created_at >= ?',
    [req.user.id, 'checkin', new Date().toISOString().slice(0, 10)]);
  const ads = get('SELECT COUNT(*) as c FROM task_earnings WHERE user_id = ? AND type = ? AND created_at >= ?',
    [req.user.id, 'ad', new Date().toISOString().slice(0, 10)]);

  // Get streak
  let streak = 0;
  if (checkins.c > 0) {
    const rows = all('SELECT created_at FROM task_earnings WHERE user_id = ? AND type = ? ORDER BY id DESC LIMIT 7',
      [req.user.id, 'checkin']);
    for (let i = 0; i < rows.length; i++) {
      const d = rows[i].created_at.slice(0, 10);
      const expected = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      if (d === expected) streak++;
      else break;
    }
  }
  const balanceAmount = Math.round((earnings?.available || 0) * 100) / 100;
  res.json({
    available: balanceAmount,
    total: balanceAmount,
    checkedToday: checkins.c > 0,
    adsToday: ads.c,
    streak,
  });
});

module.exports = router;
