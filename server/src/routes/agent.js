const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const userModel = require('../models/user');
const { get, all, run, insert, tx } = require('../db/database');

const router = Router();
router.use(authMiddleware);

// Agent balance adjust
router.post('/balance', async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || !user.is_agent) return res.status(403).json({ error: 'Agent only' });
    const { target_user_id, amount, note } = req.body;
    if (!target_user_id || !amount) return res.status(400).json({ error: 'target_user_id and amount required' });
    if (Math.abs(amount) > 100000) return res.status(400).json({ error: 'Amount exceeds agent limit' });
    // Verify target is in agent's team (via parent_id or invitations)
    const member = await get('SELECT id FROM users WHERE id = ? AND parent_id = ?', [target_user_id, req.user.id]);
    const invite = await get('SELECT id FROM invitations WHERE inviter_id = ? AND invitee_id = ?', [req.user.id, target_user_id]);
    if (!member && !invite) return res.status(403).json({ error: 'Not in your team' });

    const t = await tx();
    try {
      if (amount > 0) {
        await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [target_user_id, amount, 'agent_reward', 'delivered']);
      } else {
        let remaining = Math.abs(amount);
        const tasks = await t.all('SELECT id, amount FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC FOR UPDATE', [target_user_id, 'delivered']);
        for (const task of tasks) {
          if (remaining <= 0) break;
          const deduct = Math.min(Number(task.amount), remaining);
          await t.run('UPDATE task_earnings SET status = ? WHERE id = ?', ['withdrawn', task.id]);
          const rest = Number(task.amount) - deduct;
          if (rest > 0.001) await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [target_user_id, rest, 'balance_split', 'delivered']);
          remaining -= deduct;
        }
        if (remaining > 0.01) { await t.rollback(); return res.status(400).json({ error: `Insufficient balance. Shortfall: $${remaining.toFixed(2)}` }); }
      }

      await t.insert('INSERT INTO agent_operations (agent_id, target_user_id, action, amount, detail) VALUES (?,?,?,?,?)', [req.user.id, target_user_id, amount>0?'credit':'debit', amount, note||'']);
      await t.commit();
      const bal = await get('SELECT COALESCE(SUM(amount),0) as total FROM task_earnings WHERE user_id = ? AND status = ?', [target_user_id, 'delivered']);
      res.json({ ok: true, newBalance: Number(bal?.total || 0) });
    } catch (err) {
      await t.rollback().catch(() => {});
      throw err;
    }
  } catch(e) { console.error('Agent balance error:', e); res.status(500).json({ error: 'Failed: ' + e.message }); }
});

// Get team orders
router.get('/orders', async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || !user.is_agent) return res.status(403).json({ error: 'Agent only' });
    const rows = await all(
      `SELECT o.*, u.name as user_name, u.email as user_email FROM store_orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.user_id IN (SELECT id FROM users WHERE parent_id = ?)
       ORDER BY o.created_at DESC LIMIT 200`, [req.user.id]
    );
    res.json({ orders: rows });
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// Get team member detail
router.get('/member/:id', async (req, res) => {
  try {
    const agent = await userModel.findById(req.user.id);
    if (!agent || !agent.is_agent) return res.status(403).json({ error: 'Agent only' });
    const member = await get('SELECT id FROM users WHERE id = ? AND parent_id = ?', [req.params.id, req.user.id]);
    const invite = await get('SELECT id FROM invitations WHERE inviter_id = ? AND invitee_id = ?', [req.user.id, req.params.id]);
    if (!member && !invite) return res.status(403).json({ error: 'Not in your team' });
    const m = await userModel.findById(parseInt(req.params.id));
    const earnings = await all('SELECT * FROM task_earnings WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', [req.params.id]);
    const orders = await all('SELECT * FROM store_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', [req.params.id]);
    const deposits = await all('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [req.params.id]);
    const withdrawals = await all('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [req.params.id]);
    res.json({ member: m, earnings, orders, deposits, withdrawals });
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// Get own operations
router.get('/ops', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM agent_operations WHERE agent_id = ? ORDER BY created_at DESC LIMIT 100', [req.user.id]);
    res.json(rows);
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// Get team KYC list (view only)
router.get('/kyc', async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || !user.is_agent) return res.status(403).json({ error: 'Agent only' });
    const rows = await all(
      `SELECT k.*, u.name as user_name, u.email as user_email FROM kyc_submissions k
       JOIN users u ON u.id = k.user_id
       WHERE k.user_id IN (SELECT id FROM users WHERE parent_id = ?)
       ORDER BY k.submitted_at DESC LIMIT 50`, [req.user.id]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// Get team withdrawals (view only)
router.get('/withdrawals', async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || !user.is_agent) return res.status(403).json({ error: 'Agent only' });
    const rows = await all(
      `SELECT w.*, u.name as user_name, u.email as user_email FROM withdrawals w
       JOIN users u ON u.id = w.user_id
       WHERE w.user_id IN (SELECT id FROM users WHERE parent_id = ?)
       ORDER BY w.created_at DESC LIMIT 50`, [req.user.id]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

module.exports = router;
