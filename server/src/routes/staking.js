const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { get, insert, run, all } = require('../db/database');

const router = Router();

const PLANS = {
  basic: { amount: 10, days: 30, bonus: 1.5 },
  pro: { amount: 50, days: 30, bonus: 2.0 },
  max: { amount: 200, days: 30, bonus: 3.0 },
};

// GET /api/staking - my stake
router.get('/', authMiddleware, (req, res) => {
  const s = get('SELECT * FROM stakes WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  res.json(s || null);
});

// POST /api/staking - lock stake
router.post('/', authMiddleware, (req, res) => {
  const { plan_id, amount } = req.body;
  const plan = PLANS[plan_id];
  const amt = plan ? plan.amount : (parseFloat(amount) || 0);
  const bonus = plan ? plan.bonus : 1.5;
  const days = 30;

  if (!amt || isNaN(amt) || amt < 10) return res.status(400).json({ error: '最低锁仓金额为 $10' });

  const existing = get('SELECT id FROM stakes WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (existing) return res.status(400).json({ error: 'already staking' });

  const unlockAt = new Date(Date.now() + days * 86400000).toISOString();
  const result = insert(
    'INSERT INTO stakes (user_id, amount, plan_id, bonus, unlock_at) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, amt, plan_id || 'custom', bonus, unlockAt]
  );
  res.status(201).json({ id: result.id, amount: amt, bonus, unlockAt, status: 'active' });
});

// POST /api/staking/unlock - force unlock
router.post('/unlock', authMiddleware, (req, res) => {
  const s = get('SELECT * FROM stakes WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!s) return res.status(400).json({ error: 'no active stake' });

  const daysLeft = Math.ceil((new Date(s.unlock_at) - Date.now()) / 86400000);
  const penalty = daysLeft > 0 ? Number((s.amount * 0.2).toFixed(0)) : 0;
  const refund = s.amount;

  run('DELETE FROM stakes WHERE id = ?', [s.id]);
  res.json({ refund, penalty, amount: s.amount });
});

// === Admin ===
router.get('/admin/list', authMiddleware, adminMiddleware, (req, res) => {
  const rows = all('SELECT s.*, u.name, u.email FROM stakes s JOIN users u ON u.id = s.user_id ORDER BY s.locked_at DESC');
  res.json(rows);
});

module.exports = router;
