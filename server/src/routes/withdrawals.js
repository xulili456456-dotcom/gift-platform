const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { insert, all, get, run, tx } = require('../db/database');

const router = Router();
router.use(authMiddleware);

// POST /api/withdrawals — transaction-protected
router.post('/', async (req, res) => {
  let { amount, network, wallet_address } = req.body;
  amount = parseFloat(amount);
  if (!amount || amount < 1) return res.status(400).json({ error: '最低提现金额为 $1' });
  if (!network || !wallet_address) return res.status(400).json({ error: '请填写网络和钱包地址' });

  // Wallet address format validation
  const addr = wallet_address.trim();
  if (network === 'trc20' && !/^T[A-Za-z0-9]{33}$/.test(addr)) {
    return res.status(400).json({ error: 'TRC20地址格式不正确，应以T开头，34位' });
  }
  if ((network === 'erc20' || network === 'bep20') && !/^0x[A-Fa-f0-9]{40}$/.test(addr)) {
    return res.status(400).json({ error: '地址格式不正确，应以0x开头，42位' });
  }

  const t = await tx();
  try {
    // Check available balance (within transaction)
    const taskBal = await t.get('SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?',
      [req.user.id, 'delivered']);
    const available = Number(taskBal?.total || 0);

    if (amount > available) {
      await t.rollback();
      return res.status(400).json({ error: `余额不足！可用 $${available.toFixed(2)}，申请 $${amount.toFixed(2)}` });
    }

    // Deduct from task_earnings (FIFO, within transaction)
    let remaining = amount;
    const tasks = await t.all('SELECT id, amount, type FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC',
      [req.user.id, 'delivered']);
    const deductedIds = [];

    for (const task of tasks) {
      if (remaining <= 0) break;
      const deduct = Math.min(Number(task.amount), remaining);
      deductedIds.push(task.id);
      const rest = Number(task.amount) - deduct;
      await t.run('UPDATE task_earnings SET status = ? WHERE id = ?', ['withdrawn', task.id]);
      if (rest > 0.001) {
        const frag = await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
          [req.user.id, rest, task.type, 'delivered']);
        deductedIds.push(frag.id); // Track fragment for cancel
      }
      remaining -= deduct;
    }

    // Shortfall check
    if (remaining > 0.001) {
      await t.rollback();
      return res.status(400).json({ error: '余额不足，提现失败' });
    }

    // Store all deducted IDs (original + fragments) as JSON array
    const result = await t.insert(
      'INSERT INTO withdrawals (user_id, amount, network, wallet_address, status, deducted_ids) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, amount, network, addr, 'pending', JSON.stringify(deductedIds)]
    );

    await t.commit();
    try { require('./notifications').notify(req.user.id, '提现申请已提交', `$${amount} 提现申请正在审核中`, 'info'); } catch {}
    res.status(201).json({ id: result.id, status: 'pending' });
  } catch (err) {
    await t.rollback().catch(() => {});
    throw err;
  }
});

// GET /api/withdrawals
router.get('/', async (req, res) => {
  const rows = await all(
    'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
    [req.user.id]
  );
  res.json(rows);
});

// DELETE /api/withdrawals/:id — cancel withdrawal, restore all deducted rows
router.delete('/:id', async (req, res) => {
  const t = await tx();
  try {
    const w = await t.get('SELECT * FROM withdrawals WHERE id = ? AND user_id = ? AND status = ?',
      [req.params.id, req.user.id, 'pending']);
    if (!w) { await t.rollback(); return res.status(404).json({ error: '未找到该提现申请或已处理' }); }

    await t.run('UPDATE withdrawals SET status = ? WHERE id = ?', ['rejected', req.params.id]);

    // Restore ALL deducted rows (original + fragments)
    if (w.deducted_ids) {
      let ids;
      try {
        ids = JSON.parse(w.deducted_ids);
      } catch {
        ids = w.deducted_ids.split(',').map(Number).filter(Boolean);
      }
      for (const id of ids) {
        await t.run('UPDATE task_earnings SET status = ? WHERE id = ?', ['delivered', parseInt(id)]);
      }
    }
    await t.commit();
    res.json({ ok: true, message: '已取消，余额已退回' });
  } catch (err) {
    await t.rollback().catch(() => {});
    throw err;
  }
});

module.exports = router;
