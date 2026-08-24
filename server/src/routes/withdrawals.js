const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { insert, all, get, run, tx } = require('../db/database');
const { updateTaskProgress } = require('./tasks');

const router = Router();
router.use(authMiddleware);

// POST /api/withdrawals/verify-code — generate a one-time random 6-digit liveness code
router.post('/verify-code', async (req, res) => {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  // Invalidate any previous unused code for this user
  await run("UPDATE withdrawal_codes SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [req.user.id]);
  await insert('INSERT INTO withdrawal_codes (user_id, code, expires_at) VALUES (?, ?, NOW() + INTERVAL \'10 minutes\')', [req.user.id, code]);
  res.json({ code, expires_in: 600 });
});

// POST /api/withdrawals — transaction-protected
router.post('/', async (req, res) => {
  let { amount, network, wallet_address, verify_code, verify_video } = req.body;
  amount = parseFloat(amount);
  if (!amount || amount < 50) return res.status(400).json({ error: 'Minimum withdrawal amount is $50' });
  if (!network || !wallet_address) return res.status(400).json({ error: 'Please provide the network and wallet address' });

  // KYC check
  const kyc = await get('SELECT status, video FROM kyc_submissions WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1', [req.user.id]);
  if (!kyc || kyc.status !== 'approved') {
    return res.status(400).json({ error: 'Please complete KYC verification before withdrawing. Go to Mine > KYC Verification to submit.' });
  }
  if (!kyc.video) {
    return res.status(400).json({ error: 'Please upload your selfie video to complete verification. Go to Mine > KYC Verification.' });
  }

  // Liveness video verification (random code read aloud)
  if (!verify_code) return res.status(400).json({ error: 'Verification code is required. Please get a code and record a video reading it.' });
  if (!verify_video) return res.status(400).json({ error: 'Please record a video reading your verification code.' });
  if ((verify_video || '').length > 10000000) return res.status(400).json({ error: 'Video too large (max 10MB)' });
  const codeStr = String(verify_code).trim();
  const codeRow = await get('SELECT id FROM withdrawal_codes WHERE user_id = ? AND code = ? AND used_at IS NULL AND expires_at > NOW()', [req.user.id, codeStr]);
  if (!codeRow) return res.status(400).json({ error: 'Verification code is invalid or expired. Please generate a new one.' });

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
    const fragmentIds = [];

    for (const task of tasks) {
      if (remaining <= 0) break;
      const deduct = Math.min(Number(task.amount), remaining);
      deductedIds.push(task.id);
      const rest = Number(task.amount) - deduct;
      await t.run('UPDATE task_earnings SET status = ? WHERE id = ?', ['withdrawn', task.id]);
      if (rest > 0.001) {
        const frag = await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
          [req.user.id, rest, task.type, 'delivered']);
        fragmentIds.push(frag.id);
      }
      remaining -= deduct;
    }

    // Shortfall check
    if (remaining > 0.001) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient balance, withdrawal failed' });
    }

    // Calculate fee: 1% of amount
    const fee = Math.round(amount * 0.01 * 100) / 100;
    const netAmount = Math.round((amount - fee) * 100) / 100;

    // Store deducted + fragment IDs separately for safe cancellation
    const result = await t.insert(
      'INSERT INTO withdrawals (user_id, amount, fee, net_amount, network, wallet_address, verify_code, verify_video, status, deducted_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, amount, fee, netAmount, network, addr, codeStr, verify_video, 'pending', JSON.stringify({ deducted: deductedIds, fragments: fragmentIds })]
    );
    await t.run('UPDATE withdrawal_codes SET used_at = NOW() WHERE id = ?', [codeRow.id]);

    await t.commit();
    try { require('./notifications').notify(req.user.id, '💸 Withdrawal Submitted', `$${amount} withdrawal is under review`, 'info'); } catch {}
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
    if (!w) { await t.rollback(); return res.status(404).json({ error: 'Withdrawal request not found or already processed' }); }

    await t.run('UPDATE withdrawals SET status = ? WHERE id = ?', ['rejected', req.params.id]);

    if (w.deducted_ids) {
      let parsed;
      try { parsed = JSON.parse(w.deducted_ids); } catch { parsed = null; }

      // New format: { deducted: [...], fragments: [...] }
      if (parsed && parsed.deducted) {
        // Restore original deducted rows
        for (const id of parsed.deducted) {
          await t.run(`UPDATE task_earnings SET status = 'delivered' WHERE id = $1 AND status = 'withdrawn'`, [parseInt(id)]);
        }
        // Delete fragments (remainders that duplicate restored originals)
        for (const id of (parsed.fragments || [])) {
          await t.run('DELETE FROM task_earnings WHERE id = $1', [parseInt(id)]);
        }
      } else {
        // Legacy format: flat array of all IDs — best-effort restore
        const ids = Array.isArray(parsed) ? parsed : String(w.deducted_ids).split(',').map(Number).filter(Boolean);
        for (const id of ids) {
          await t.run(`UPDATE task_earnings SET status = 'delivered' WHERE id = $1 AND status = 'withdrawn'`, [parseInt(id)]);
        }
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
