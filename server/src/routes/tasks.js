const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { all, get, run, tx, insert } = require('../db/database');

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
        const newP = await insert('INSERT INTO task_progress (user_id, task_type, current_count, current_value, period_key) VALUES (?,?,0,0,?)',
          [userId, task.task_type, key]);
        progress = { id: newP.id, current_count: 0, current_value: 0, completed: false, claimed: false };
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
  const t = await tx();
  try {
    const { taskType } = req.params;
    const userId = req.user.id;
    const task = await t.get('SELECT * FROM task_definitions WHERE task_type = ? AND active = TRUE', [taskType]);
    if (!task) { await t.rollback(); return res.status(404).json({ error: 'Task not found' }); }

    const key = periodKey(task.reset_period);
    const progress = await t.get(
      'SELECT * FROM task_progress WHERE user_id = ? AND task_type = ? AND period_key = ? FOR UPDATE',
      [userId, taskType, key]
    );
    if (!progress || !progress.completed) { await t.rollback(); return res.status(400).json({ error: 'Task not completed' }); }
    if (progress.claimed) { await t.rollback(); return res.status(400).json({ error: 'Already claimed' }); }

    await t.run("UPDATE task_progress SET claimed = TRUE, claimed_at = ? WHERE id = ?", [new Date().toISOString(), progress.id]);
    await t.run('INSERT INTO task_reward_log (user_id, task_type, task_title, amount, created_at) VALUES (?,?,?,?,?)',
      [userId, taskType, task.title, task.reward, new Date().toISOString()]);
    await t.run("INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, 'task_reward', 'delivered')",
      [userId, task.reward]);

    await t.commit();
    res.json({ message: 'Reward claimed', amount: Number(task.reward) });
  } catch (err) {
    await t.rollback().catch(() => {});
    console.error('Task claim error:', err);
    res.status(500).json({ error: 'Claim failed' });
  }
});

// Helper: update task progress (called from other routes)
// Uses atomic UPDATE to prevent lost increments from concurrent calls
async function updateTaskProgress(userId, taskType, increment, valueIncrement = 0) {
  try {
    const task = await get('SELECT * FROM task_definitions WHERE task_type = ?', [taskType]);
    if (!task || !task.active) return;
    const key = periodKey(task.reset_period);

    // Atomic increment — no read-increment-write race
    const updateResult = await run(
      'UPDATE task_progress SET current_count = current_count + ?, current_value = current_value + ? WHERE user_id = ? AND task_type = ? AND period_key = ?',
      [increment, valueIncrement, userId, taskType, key]
    );

    // If no row exists yet, insert initial row
    if (updateResult.changes === 0) {
      await run('INSERT INTO task_progress (user_id, task_type, current_count, current_value, period_key) VALUES (?,?,?,?,?)',
        [userId, taskType, increment, valueIncrement, key]);
    }

    // Read updated counts to check completion
    const progress = await get(
      'SELECT * FROM task_progress WHERE user_id = ? AND task_type = ? AND period_key = ?',
      [userId, taskType, key]
    );
    if (!progress) return;

    const countMet = task.target_count > 0 && (progress.current_count || 0) >= task.target_count;
    const valueMet = task.target_value > 0 && Number(progress.current_value || 0) >= task.target_value;
    if ((countMet || valueMet) && !progress.completed) {
      await run('UPDATE task_progress SET completed = TRUE WHERE id = ? AND completed = FALSE', [progress.id]);
    }
  } catch (err) {
    console.error('Task progress error:', err);
  }
}

// ===== CHECK-IN =====
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
      get("SELECT COALESCE(SUM(amount),0) as total FROM task_earnings WHERE user_id = ? AND type IN ('task_reward','checkin')", [req.user.id]),
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
  } catch (err) {
    try { await t.rollback(); } catch {}
    res.status(500).json({ error: 'Checkin failed' });
  }
});

// Admin: GET /api/tasks/user/:userId — view any user's task progress
router.get('/user/:userId', require('../middleware/admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const tasks = await all('SELECT * FROM task_definitions WHERE active = TRUE ORDER BY sort_order');
    const result = [];
    for (const task of tasks) {
      const key = periodKey(task.reset_period);
      let progress = await get(
        'SELECT * FROM task_progress WHERE user_id = ? AND task_type = ? AND period_key = ?',
        [userId, task.task_type, key]
      );
      if (!progress) {
        progress = { current_count: 0, current_value: 0, completed: false, claimed: false };
      }
      const pct = task.target_count > 0
        ? Math.min(100, Math.round((progress.current_count||0) / task.target_count * 100))
        : task.target_value > 0
          ? Math.min(100, Math.round(Number(progress.current_value||0) / task.target_value * 100))
          : 0;
      result.push({
        id: task.id, task_type: task.task_type, title: task.title,
        target_count: task.target_count, target_value: task.target_value,
        reward: Number(task.reward), reset_period: task.reset_period,
        current_count: progress.current_count||0, current_value: Number(progress.current_value||0),
        completed: !!progress.completed, claimed: !!progress.claimed, pct,
      });
    }
    const rewards = await all('SELECT * FROM task_reward_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]);
    res.json({ tasks: result, rewards: rewards.map(r => ({ ...r, amount: Number(r.amount) })) });
  } catch (e) { console.error('Task user error:', e); res.status(500).json({ error: 'Failed' }); }
});

// Admin: GET /api/tasks/definitions
router.get('/definitions', require('../middleware/admin'), async (req, res) => {
  try {
    const tasks = await all('SELECT * FROM task_definitions ORDER BY sort_order');
    res.json(tasks);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Admin: PUT /api/tasks/definitions/:id — update any fields
router.put('/definitions/:id', require('../middleware/admin'), async (req, res) => {
  try {
    const allowed = ['task_type','category','title','description','icon','icon_bg','target_count','target_value','reward','reward_color','reset_period','sort_order','active'];
    const sets = [];
    const vals = [];
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push(f === 'active' ? (req.body[f] ? 1 : 0) : req.body[f]);
      }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(req.params.id);
    await run(`UPDATE task_definitions SET ${sets.join(', ')} WHERE id = ?`, vals);
    const updated = await get('SELECT * FROM task_definitions WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'Update failed' }); }
});

// Admin: POST /api/tasks/definitions — create a task
router.post('/definitions', require('../middleware/admin'), async (req, res) => {
  try {
    const { task_type, title, reward } = req.body;
    if (!task_type || !title || reward === undefined) return res.status(400).json({ error: 'task_type, title and reward required' });
    const result = await insert('INSERT INTO task_definitions (task_type, category, title, description, icon, icon_bg, target_count, target_value, reward, reward_color, reset_period, sort_order, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [task_type, req.body.category || 'trading', title, req.body.description || '', req.body.icon || '📦', req.body.icon_bg || '#FFF5F0',
       req.body.target_count ? Number(req.body.target_count) : 0, req.body.target_value ? Number(req.body.target_value) : 0,
       Number(reward), req.body.reward_color || '#FF5000', req.body.reset_period || 'one_time', req.body.sort_order ? Number(req.body.sort_order) : 0,
       req.body.active === undefined ? 1 : (req.body.active ? 1 : 0)]);
    const created = await get('SELECT * FROM task_definitions WHERE id = ?', [result.id]);
    res.status(201).json(created);
  } catch (e) { res.status(500).json({ error: 'Create failed: ' + e.message }); }
});

// Admin: DELETE /api/tasks/definitions/:id
router.delete('/definitions/:id', require('../middleware/admin'), async (req, res) => {
  try {
    await run('DELETE FROM task_definitions WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Delete failed' }); }
});

// Admin: POST /api/admin/notifications/send
router.post('/send-notification', require('../middleware/admin'), async (req, res) => {
  try {
    const { target, user_email, title, body, type } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });
    const notify = require('./notifications').notify;
    if (target === 'all') {
      const users = await all('SELECT id FROM users WHERE is_active IS TRUE');
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
  } catch (e) { console.error('Notification send error:', e.message); res.status(500).json({ error: 'Send failed: ' + e.message }); }
});

// Admin: POST /api/tasks/admin/trigger — manually trigger a task for a user (e.g. deposit handled manually)
router.post('/admin/trigger', require('../middleware/admin'), async (req, res) => {
  try {
    const { userId, taskType } = req.body;
    if (!userId || !taskType) return res.status(400).json({ error: 'userId and taskType required' });
    await updateTaskProgress(parseInt(userId), taskType, 1);
    res.json({ ok: true, message: `Triggered ${taskType} for user ${userId}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = { router, updateTaskProgress };
