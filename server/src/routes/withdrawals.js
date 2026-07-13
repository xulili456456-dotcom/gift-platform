const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { insert, all, get, run } = require('../db/database');

const router = Router();
router.use(authMiddleware);

// POST /api/withdrawals
router.post('/', async (req, res) => {
  const { amount, network, wallet_address } = req.body;
  if (!amount || amount < 0.01) return res.status(400).json({ error: '请输入有效金额' });
  if (!network || !wallet_address) return res.status(400).json({ error: 'wallet required' });

  // Check available balance
  const taskBal = await get('SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?',
    [req.user.id, 'delivered']);
  const giftBal = await get(`SELECT COALESCE(SUM(g.value), 0) as total FROM user_gifts ug JOIN gifts g ON g.id = ug.gift_id WHERE ug.user_id = ? AND ug.status = ?`,
    [req.user.id, 'delivered']);
  const available = (taskBal?.total || 0) + (giftBal?.total || 0);

  if (amount > available) return res.status(400).json({ error: 'insufficient balance' });

  // Deduct from task_earnings first
  let remaining = amount;
  const tasks = await all('SELECT id, amount, type FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC',
    [req.user.id, 'delivered']);
  const deductedIds = [];
  for (const t of tasks) {
    if (remaining <= 0) break;
    const deduct = Math.min(t.amount, remaining);
    deductedIds.push(t.id);
    const rest = t.amount - deduct;
    await run('UPDATE task_earnings SET status = ? WHERE id = ?', ['withdrawn', t.id]);
    if (rest > 0.001) {
      await insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
        [req.user.id, rest, t.type, 'delivered']);
    }
    remaining -= deduct;
  }

  const result = await insert(
    'INSERT INTO withdrawals (user_id, amount, network, wallet_address, status, deducted_ids) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, amount, network, wallet_address, 'pending', deductedIds.join(',')]
  );
  require('./notifications').notify(req.user.id, '提现申请已提交', `$${amount} 提现申请正在审核中`, 'info');
  res.status(201).json({ id: result.id, status: 'pending' });
});

// GET /api/withdrawals
router.get('/', async (req, res) => {
  const rows = await all(
    'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [req.user.id]
  );
  res.json(rows);
});

// DELETE /api/withdrawals/:id
router.delete('/:id', async (req, res) => {
  const w = await get('SELECT * FROM withdrawals WHERE id = ? AND user_id = ? AND status = ?',
    [req.params.id, req.user.id, 'pending']);
  if (!w) return res.status(404).json({ error: 'not found or already processed' });
  await run('UPDATE withdrawals SET status = ? WHERE id = ?', ['rejected', req.params.id]);

  // Precisely restore deducted earnings
  if (w.deducted_ids) {
    const ids = w.deducted_ids.split(',').filter(Boolean);
    for (const id of ids) {
      await run('UPDATE task_earnings SET status = ? WHERE id = ?', ['delivered', parseInt(id)]);
    }
  }
  res.json({ ok: true, message: '已取消，余额已退回' });
});

module.exports = router;
