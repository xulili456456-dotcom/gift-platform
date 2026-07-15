const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { insert, all, get, tx } = require('../db/database');

const router = Router();
router.use(authMiddleware);

const CHECKIN_REWARDS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];

// Calculate streak: count consecutive days backwards
// skipToday=true: start from yesterday (for POST /checkin before today's record is inserted)
// skipToday=false: start from today (for GET /balance where today's record exists)
function calcStreak(rows, skipToday = false) {
  let streak = 0;
  const offset = skipToday ? 1 : 0;
  for (let i = 0; i < rows.length; i++) {
    const d = new Date(rows[i].created_at || rows[i].d).toISOString().slice(0, 10);
    const expected = new Date(Date.now() - (i + offset) * 86400000).toISOString().slice(0, 10);
    if (d === expected) streak++;
    else break;
  }
  return streak;
}

// POST /api/tasks/checkin — transaction-protected
router.post('/checkin', async (req, res) => {
  const t = await tx();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const last = await t.get(
      'SELECT id, created_at FROM task_earnings WHERE user_id = ? AND type = ? ORDER BY id DESC LIMIT 1',
      [req.user.id, 'checkin']);

    if (last) {
      const lastDate = new Date(last.created_at).toISOString().slice(0, 10);
      if (lastDate === today) { await t.rollback(); return res.status(400).json({ error: '今日已签到' }); }
    }

    // Calculate streak from checkin history
    const rows = await t.all(
      "SELECT created_at FROM task_earnings WHERE user_id = ? AND type = ? ORDER BY id DESC LIMIT 7",
      [req.user.id, 'checkin']);
    const streak = calcStreak(rows, true); // skip today — today's checkin not yet inserted

    const reward = CHECKIN_REWARDS[streak] || 0.1;
    const result = await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
      [req.user.id, reward, 'checkin', 'delivered']);

    await t.commit();
    try { require('./notifications').notify(req.user.id, '签到成功', `+$${reward} 已到账`, 'success'); } catch {}
    res.json({ id: result.id, amount: reward, streak: streak + 1 });
  } catch (err) {
    await t.rollback().catch(() => {});
    throw err;
  }
});

// GET /api/tasks/balance
router.get('/balance', async (req, res) => {
  const earnings = await get(
    "SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(CASE WHEN status = 'delivered' THEN amount ELSE 0 END), 0) as available FROM task_earnings WHERE user_id = ?",
    [req.user.id]);
  const today = new Date().toISOString().slice(0, 10);
  const checkins = await get('SELECT COUNT(*) as c FROM task_earnings WHERE user_id = ? AND type = ? AND created_at >= ?',
    [req.user.id, 'checkin', today]);
  // Calculate streak
  let streak = 0;
  let nextCheckinReward = CHECKIN_REWARDS[0];
  if (Number(checkins.c) > 0) {
    const rows = await all(
      'SELECT created_at FROM task_earnings WHERE user_id = ? AND type = ? ORDER BY id DESC LIMIT 7',
      [req.user.id, 'checkin']);
    streak = calcStreak(rows);
  }
  nextCheckinReward = CHECKIN_REWARDS[Math.min(streak, CHECKIN_REWARDS.length - 1)] || 0.1;

  const balanceAmount = Math.round((Number(earnings?.available) || 0) * 100) / 100;
  res.json({
    available: balanceAmount,
    total: balanceAmount,
    checkedToday: Number(checkins.c) > 0,
    streak,
    nextCheckinReward,
  });
});

module.exports = router;
