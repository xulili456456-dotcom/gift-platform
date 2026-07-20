const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { all, get, run } = require('../db/database');

const router = Router();
router.use(authMiddleware);

function periodKey(type) {
  const now = new Date();
  if (type === 'daily') return now.toISOString().slice(0, 10);
  if (type === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  }
  return 'all';
}

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await all('SELECT * FROM task_definitions WHERE active = TRUE ORDER BY sort_order');
    const userId = req.user.id;
    const result = [];

    for (const task of tasks) {
      const key = periodKey(task.reset_period);
      let progress = await get(
        'SELECT * FROM task_progress WHERE user_id = ? AND task_type = ? AND period_key = ?',
        [userId, task.task_type, key]
      );
      if (!progress) {
        await run('INSERT INTO task_progress (user_id, task_type, current_count, current_value, period_key) VALUES (?,?,0,0,?)',
          [userId, task.task_type, key]);
        progress = { current_count: 0, current_value: 0, completed: false, claimed: false };
      }
      const pct = task.target_count > 0
        ? Math.min(100, Math.round(progress.current_count / task.target_count * 100))
        : task.target_value > 0
          ? Math.min(100, Math.round(Number(progress.current_value) / task.target_value * 100))
          : 0;

      result.push({
        id: task.id, task_type: task.task_type, category: task.category,
        title: task.title, description: task.description,
        icon: task.icon, icon_bg: task.icon_bg,
        target_count: task.target_count, target_value: task.target_value,
        reward: Number(task.reward), reward_color: task.reward_color,
        reset_period: task.reset_period,
        current_count: progress.current_count,
        current_value: Number(progress.current_value),
        completed: !!progress.completed, claimed: !!progress.claimed, pct,
      });
    }

    const rewards = await all(
      'SELECT * FROM task_reward_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [userId]
    );

    res.json({
      tasks: result,
      rewards: rewards.map(r => ({ ...r, amount: Number(r.amount) })),
      summary: { completed: result.filter(t => t.claimed).length, total: result.length },
    });
  } catch (err) {
    console.error('Task list error:', err);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

// POST /api/tasks/:taskType/claim
router.post('/:taskType/claim', async (req, res) => {
  try {
    const { taskType } = req.params;
    const userId = req.user.id;
    const task = await get('SELECT * FROM task_definitions WHERE task_type = ?', [taskType]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const key = periodKey(task.reset_period);
    const progress = await get(
      'SELECT * FROM task_progress WHERE user_id = ? AND task_type = ? AND period_key = ?',
      [userId, taskType, key]
    );
    if (!progress || !progress.completed) return res.status(400).json({ error: 'Task not completed' });
    if (progress.claimed) return res.status(400).json({ error: 'Already claimed' });

    await run("UPDATE task_progress SET claimed = TRUE, claimed_at = ? WHERE id = ?", [new Date().toISOString(), progress.id]);
    await run('INSERT INTO task_reward_log (user_id, task_type, task_title, amount, created_at) VALUES (?,?,?,?,?)',
      [userId, taskType, task.title, task.reward, new Date().toISOString()]);

    res.json({ message: 'Reward claimed', amount: Number(task.reward) });
  } catch (err) {
    console.error('Task claim error:', err);
    res.status(500).json({ error: 'Claim failed' });
  }
});

// Helper: update task progress (called from other routes)
async function updateTaskProgress(userId, taskType, increment, valueIncrement = 0) {
  try {
    const task = await get('SELECT * FROM task_definitions WHERE task_type = ?', [taskType]);
    if (!task || !task.active) return;
    const key = periodKey(task.reset_period);
    let progress = await get(
      'SELECT * FROM task_progress WHERE user_id = ? AND task_type = ? AND period_key = ?',
      [userId, taskType, key]
    );
    if (!progress) {
      await run('INSERT INTO task_progress (user_id, task_type, current_count, current_value, period_key) VALUES (?,?,?,?,?)',
        [userId, taskType, increment, valueIncrement, key]);
      progress = { id: null, current_count: increment, current_value: valueIncrement };
    } else {
      const nc = (progress.current_count || 0) + increment;
      const nv = Number(progress.current_value || 0) + valueIncrement;
      await run('UPDATE task_progress SET current_count = ?, current_value = ? WHERE id = ?', [nc, nv, progress.id]);
      progress.current_count = nc;
      progress.current_value = nv;
    }
    const countMet = task.target_count > 0 && progress.current_count >= task.target_count;
    const valueMet = task.target_value > 0 && Number(progress.current_value) >= task.target_value;
    if ((countMet || valueMet) && !progress.completed) {
      await run('UPDATE task_progress SET completed = TRUE WHERE id = ?', [progress.id]);
    }
  } catch (err) {
    console.error('Task progress error:', err);
  }
}

// ===== CHECK-IN (preserved from original) =====
const { insert, tx } = require('../db/database');
const CHECKIN_REWARDS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];

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

// GET /api/tasks/balance
router.get('/balance', async (req, res) => {
  try {
    const [earningsRow, checkinRows, totalRow, availableRow] = await Promise.all([
      get("SELECT COALESCE(SUM(amount),0) as total FROM task_earnings WHERE user_id = ?", [req.user.id]),
      all("SELECT created_at FROM task_earnings WHERE user_id = ? AND type = 'checkin' ORDER BY id DESC LIMIT 7", [req.user.id]),
      get("SELECT COALESCE(SUM(amount),0) as total FROM task_earnings WHERE user_id = ? AND type = 'checkin'", [req.user.id]),
      get("SELECT COALESCE(SUM(amount),0) as total FROM task_earnings WHERE user_id = ? AND status = 'delivered'", [req.user.id]),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const checkedToday = checkinRows.length > 0 && new Date(checkinRows[0].created_at).toISOString().slice(0, 10) === today;
    const streak = calcStreak(checkinRows, false);
    const nextReward = streak < 7 ? CHECKIN_REWARDS[streak] : 0.7;
    res.json({
      available: Number(availableRow.total), total: Number(totalRow.total),
      checkedToday, streak,
      nextCheckinReward: nextReward,
      allTimeEarnings: Number(earningsRow.total),
    });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/tasks/checkin
router.post('/checkin', async (req, res) => {
  const t = await tx();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const last = await t.get(
      "SELECT id, created_at FROM task_earnings WHERE user_id = ? AND type = 'checkin' ORDER BY id DESC LIMIT 1",
      [req.user.id]);
    if (last) {
      const lastDate = new Date(last.created_at).toISOString().slice(0, 10);
      if (lastDate === today) { await t.rollback(); return res.status(400).json({ error: 'Already checked in today' }); }
    }
    const rows = await t.all(
      "SELECT created_at FROM task_earnings WHERE user_id = ? AND type = 'checkin' ORDER BY id DESC LIMIT 7",
      [req.user.id]);
    const streak = calcStreak(rows, true);
    const reward = CHECKIN_REWARDS[streak] || CHECKIN_REWARDS[0];
    await t.run("INSERT INTO task_earnings (user_id, amount, type) VALUES (?, ?, 'checkin')", [req.user.id, reward]);
    await t.commit();
    res.json({ amount: reward, streak: streak + 1 });
    // Update check-in task progress
    updateTaskProgress(req.user.id, 'daily_order_5', 0, 0).catch(()=>{});
  } catch (err) {
    try { await t.rollback(); } catch {}
    res.status(500).json({ error: 'Checkin failed' });
  }
});

// Admin: GET /api/tasks/definitions
router.get('/definitions', async (req, res) => {
  try {
    const tasks = await all('SELECT * FROM task_definitions ORDER BY sort_order');
    res.json(tasks);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Admin: PUT /api/tasks/definitions/:id
router.put('/definitions/:id', async (req, res) => {
  try {
    const { active, reward } = req.body;
    if (typeof active !== 'undefined') await run('UPDATE task_definitions SET active = ? WHERE id = ?', [active ? 1 : 0, req.params.id]);
    if (typeof reward !== 'undefined') await run('UPDATE task_definitions SET reward = ? WHERE id = ?', [Number(reward), req.params.id]);
    const updated = await get('SELECT * FROM task_definitions WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'Update failed' }); }
});

// Admin: POST /api/admin/notifications/send
router.post('/send-notification', async (req, res) => {
  try {
    const { target, user_email, title, body, type } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
    const notify = require('./notifications').notify;
    if (target === 'all') {
      const users = await all('SELECT id FROM users WHERE is_active = 1');
      for (const u of users) {
        try { await notify(u.id, title, body, type || 'info'); } catch {}
      }
      res.json({ message: `Sent to ${users.length} users` });
    } else if (target === 'specific' && user_email) {
      const u = await get('SELECT id FROM users WHERE email = ?', [user_email]);
      if (!u) return res.status(404).json({ error: 'User not found' });
      await notify(u.id, title, body, type || 'info');
      res.json({ message: 'Notification sent' });
    } else {
      res.status(400).json({ error: 'Invalid target' });
    }
  } catch (e) { res.status(500).json({ error: 'Send failed' }); }
});

module.exports = { router, updateTaskProgress };
