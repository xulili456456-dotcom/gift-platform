const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { get, all, run, insert, tx } = require('../db/database');
const { updateTaskProgress } = require('./tasks');

const router = Router();

// POST /api/deposits — submit deposit request
router.post('/', authMiddleware, async (req, res) => {
  const { network, amount, tx_hash } = req.body;
  const amt = parseFloat(amount);
  if (!amt || amt < 1) return res.status(400).json({ error: 'Minimum deposit is $1' });
  if (!network || !tx_hash) return res.status(400).json({ error: 'Network and transaction hash are required' });
  if (!['trc20','erc20','bep20'].includes(network)) return res.status(400).json({ error: 'Invalid network' });

  const result = await insert(
    'INSERT INTO deposits (user_id, network, amount, tx_hash) VALUES (?, ?, ?, ?)',
    [req.user.id, network, amt, tx_hash.trim()]
  );
  try { require('./notifications').notify(req.user.id, '💵 Deposit Submitted', `$${amt} deposit pending review`, 'info'); } catch {}
  res.status(201).json({ id: result.id, network, amount: amt, tx_hash: tx_hash.trim(), status: 'pending' });
});

// GET /api/deposits — user's deposit history
router.get('/', authMiddleware, async (req, res) => {
  const rows = await all('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]);
  res.json(rows);
});

// GET /api/deposits/addresses — get platform deposit addresses
router.get('/addresses', authMiddleware, async (req, res) => {
  const settings = require('../models/settings');
  res.json({
    trc20: await settings.get('deposit_address_trc20', ''),
    erc20: await settings.get('deposit_address_erc20', ''),
    bep20: await settings.get('deposit_address_bep20', ''),
  });
});

// Admin: list all deposits
router.get('/admin', authMiddleware, adminMiddleware, async (req, res) => {
  const rows = await all('SELECT d.*, u.name, u.email, u.referral_code, k.id as kyc_id FROM deposits d JOIN users u ON u.id = d.user_id LEFT JOIN kyc_submissions k ON k.user_id = d.user_id ORDER BY d.created_at DESC LIMIT 100');
  res.json(rows);
});

// Admin: confirm deposit
router.put('/:id/confirm', authMiddleware, adminMiddleware, async (req, res) => {
  const t = await tx();
  try {
    const d = await t.get('SELECT * FROM deposits WHERE id = ? AND status = ? FOR UPDATE', [req.params.id, 'pending']);
    if (!d) { await t.rollback(); return res.status(404).json({ error: 'Deposit not found or already processed' }); }

    const result = await t.run("UPDATE deposits SET status = 'confirmed', confirmed_at = NOW(), admin_note = ? WHERE id = ? AND status = 'pending'",
      [req.body.note || '', d.id]);
    if (result.rowCount === 0) { await t.rollback(); return res.status(400).json({ error: 'Already confirmed' }); }

    await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
      [d.user_id, Number(d.amount), 'deposit', 'delivered']);
    await t.commit();
    try { require('./notifications').notify(d.user_id, '💵 Deposit Confirmed', `$${Number(d.amount)} has been credited to your account`, 'success'); } catch {}
    res.json({ ok: true, message: 'Deposit confirmed' });
    updateTaskProgress(d.user_id, 'first_deposit', 1).catch(()=>{});
    updateTaskProgress(d.user_id, 'deposit_500', 0, Number(d.amount)).catch(()=>{});
    // Reward inviter's "referral makes first deposit" on the user's first deposit
    const depCount = await get("SELECT COUNT(*)::int as c FROM deposits WHERE user_id = ? AND status = 'confirmed'", [d.user_id]);
    if (Number(depCount?.c || 0) === 1) {
      const parentRow = await get('SELECT parent_id FROM users WHERE id = ?', [d.user_id]);
      if (parentRow?.parent_id) {
        updateTaskProgress(parentRow.parent_id, 'referral_first_deposit', 1).catch(()=>{});
      }
    }
  } catch (err) { await t.rollback().catch(() => {}); throw err; }
});

// Admin: list all deposits
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  const rows = await all('SELECT d.*, u.name as user_name, u.email as user_email FROM deposits d JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC LIMIT 100');
  res.json(rows);
});

// Admin: reject deposit
router.put('/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  const d = await get('SELECT * FROM deposits WHERE id = ? AND status = ?', [req.params.id, 'pending']);
  if (!d) return res.status(404).json({ error: 'Deposit not found or already processed' });

  await run("UPDATE deposits SET status = 'rejected', admin_note = ? WHERE id = ?",
    [req.body.note || '', d.id]);
  try { require('./notifications').notify(d.user_id, '💵 Deposit Rejected', `$${Number(d.amount)} deposit was rejected`, 'warning'); } catch {}
  res.json({ ok: true, message: 'Deposit rejected' });
});

module.exports = router;
