const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { get, insert, run, all, tx } = require('../db/database');

const router = Router();

const PLANS = {
  basic: { amount: 10, days: 30, bonus: 1.5 },
  pro:   { amount: 50, days: 30, bonus: 2.0 },
  max:   { amount: 200, days: 30, bonus: 3.0 },
};

// GET /api/staking - my active stake
router.get('/', authMiddleware, async (req, res) => {
  const s = await get('SELECT * FROM stakes WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!s) return res.json(null);
  const daysLeft = Math.max(0, Math.ceil((new Date(s.unlock_at) - Date.now()) / 86400000));
  res.json({ ...s, daysLeft, bonusMultiplier: PLANS[s.plan_id]?.bonus || 1.5 });
});

// POST /api/staking - lock stake (deduct from balance)
router.post('/', authMiddleware, async (req, res) => {
  const { plan_id } = req.body;
  const plan = PLANS[plan_id];
  if (!plan) return res.status(400).json({ error: 'Please select a staking plan: basic/pro/max' });

  const t = await tx();
  try {
    // Check for existing active stake within transaction
    const existing = await t.get('SELECT id FROM stakes WHERE user_id = ? AND status = ? FOR UPDATE', [req.user.id, 'active']);
    if (existing) { await t.rollback(); return res.status(400).json({ error: 'You already have an active stake, please unlock it first' }); }

    // Check balance
    const taskBal = await t.get(
      "SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?",
      [req.user.id, 'delivered']);
    const available = Number(taskBal?.total || 0);

    if (available < plan.amount) {
      await t.rollback();
      return res.status(400).json({ error: `Insufficient balance! Required: $${plan.amount}, available: $${available.toFixed(2)}` });
    }

    // Deduct from balance (FIFO)
    let remaining = plan.amount;
    const tasks = await t.all('SELECT id, amount FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC FOR UPDATE',
      [req.user.id, 'delivered']);
    for (const task of tasks) {
      if (remaining <= 0) break;
      const deduct = Math.min(Number(task.amount), remaining);
      await t.run('UPDATE task_earnings SET status = ? WHERE id = ?', ['withdrawn', task.id]);
      const rest = Number(task.amount) - deduct;
      if (rest > 0.001) {
        await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
          [req.user.id, rest, 'balance_split', 'delivered']);
      }
      remaining -= deduct;
    }

    if (remaining > 0.001) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient balance, staking failed' });
    }

    // Create stake record
    const unlockAt = new Date(Date.now() + plan.days * 86400000).toISOString();
    const result = await t.insert(
      'INSERT INTO stakes (user_id, amount, plan_id, bonus, unlock_at) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, plan.amount, plan_id, plan.bonus, unlockAt]
    );

    await t.commit();
    require('./notifications').notify(req.user.id, '🔒 Staked',
      `$${plan.amount} locked for ${plan.days} days, ${plan.bonus}x bonus`, 'success');
    res.status(201).json({ id: result.id, amount: plan.amount, bonus: plan.bonus, unlockAt, status: 'active' });
  } catch (err) {
    await t.rollback().catch(() => {});
    throw err;
  }
});

// POST /api/staking/unlock - unlock stake (return balance minus penalty)
router.post('/unlock', authMiddleware, async (req, res) => {
  const s = await get('SELECT * FROM stakes WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!s) return res.status(400).json({ error: 'No active stake' });

  const plan = PLANS[s.plan_id] || { days: 30, bonus: 1.5 };
  const t = await tx();
  try {
    const daysLeft = Math.max(0, Math.ceil((new Date(s.unlock_at) - Date.now()) / 86400000));
    const daysElapsed = Math.max(0, plan.days - daysLeft);
    const penalty = daysLeft > 0 ? Math.round(s.amount * 0.2 * 100) / 100 : 0;
    // Bonus: proportional to time locked (annualized)
    const bonusPayout = Math.round(s.amount * (Number(s.bonus) - 1.0) * (daysElapsed / 365) * 100) / 100;
    const refund = Math.round((s.amount + bonusPayout - penalty) * 100) / 100;

    // Return refund to balance
    if (refund > 0) {
      await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
        [req.user.id, refund, 'staking_refund', 'delivered']);
    }

    // Update status instead of deleting
    await t.run("UPDATE stakes SET status = 'unlocked' WHERE id = ?", [s.id]);

    await t.commit();
    require('./notifications').notify(req.user.id, '🔓 Stake Unlocked',
      `Refund $${refund}${penalty > 0 ? ` (penalty $${penalty})` : ''}`, 'success');
    res.json({ refund, penalty, amount: s.amount, daysLeft });
  } catch (err) {
    await t.rollback().catch(() => {});
    throw err;
  }
});

// === Admin ===
router.get('/admin/list', authMiddleware, adminMiddleware, async (req, res) => {
  const rows = await all('SELECT s.*, u.name, u.email FROM stakes s JOIN users u ON u.id = s.user_id ORDER BY s.locked_at DESC');
  res.json(rows);
});

module.exports = router;
