const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { insert, all, get, run, tx } = require('../db/database');
const { updateTaskProgress } = require('./tasks');

const router = Router();
router.use(authMiddleware);

// POST /api/withdrawals — transaction-protected
router.post('/', async (req, res) => {
  let { amount, network, wallet_address } = req.body;
  amount = parseFloat(amount);
  if (!amount || amount < 1) return res.status(400).json({ error: 'Minimum withdrawal amount is $1' });
  if (!network || !wallet_address) return res.status(400).json({ error: 'Please provide the network and wallet address' });

  // Wallet address format validation
  const addr = wallet_address.trim();
  if (network === 'trc20' && !/^T[A-Za-z0-9]{33}$/.test(addr)) {
    return res.status(400).json({ error: 'Invalid TRC20 address: must start with T and be 34 characters' });
  }
  if ((network === 'erc20' || network === 'bep20') && !/^0x[A-Fa-f0-9]{40}$/.test(addr)) {
    return res.status(400).json({ error: 'Invalid address: must start with 0x and be 42 characters' });
  }

  const t = await tx();
  try {
    // Check available balance (within transaction)
    const taskBal = await t.get('SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?',
      [req.user.id, 'delivered']);
    const available = Number(taskBal?.total || 0);

    if (amount > available) {
      await t.rollback();
      return res.status(400).json({ error: `Insufficient balance! Available: $${available.toFixed(2)}, requested: $${amount.toFixed(2)}` });
    }

    // Deduct from task_earnings (FIFO, within transaction)
    let remaining = amount;
    const tasks = await t.all('SELECT id, amount, type FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC FOR UPDATE',
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
        deductedIds.push(frag.id); // Track fragment for cancellation
      }
      remaining -= deduct;
    }

    // Shortfall check
    if (remaining > 0.001) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient balance, withdrawal failed' });
    }

    // Store all deducted IDs (original + fragments) as JSON array
    const result = await t.insert(
      'INSERT INTO withdrawals (user_id, amount, network, wallet_address, status, deducted_ids) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, amount, network, addr, 'pending', JSON.stringify(deductedIds)]
    );

    await t.commit();
    try { require('./notifications').notify(req.user.id, '💸 Withdrawal Submitted', `$${amount} withdrawal is under review`, 'info'); } catch {}
    res.status(201).json({ id: result.id, status: 'pending' });
    updateTaskProgress(req.user.id, 'first_withdrawal', 1).catch(()=>{});
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
    if (!w) { await t.rollback(); return res.status(404).json({ error: 'Withdrawal request not found or already processed' }); }

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
        // Only restore if still withdrawn (prevents double-spend via fragment reuse)
        await t.run(`UPDATE task_earnings SET status = 'delivered' WHERE id = $1 AND status = 'withdrawn'`, [parseInt(id)]);
      }
    }
    await t.commit();
    res.json({ ok: true, message: 'Cancelled, balance has been refunded' });
  } catch (err) {
    await t.rollback().catch(() => {});
    throw err;
  }
});

module.exports = router;
