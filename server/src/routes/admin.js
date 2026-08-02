const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const userModel = require('../models/user');
const giftModel = require('../models/gift');
const userGiftModel = require('../models/userGift');
const invitationModel = require('../models/invitation');
const settingsModel = require('../models/settings');
const { get, all, run, insert, tx } = require('../db/database');
const { notify } = require('./notifications');
const { lookupIps } = require('../utils/geoip');

const router = Router();
router.use(authMiddleware);
router.use(adminMiddleware);

// ========== Dashboard Stats ==========

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  const totalUsers = await get('SELECT COUNT(*) as total FROM users');
  const totalInvites = await get('SELECT COUNT(*) as total FROM invitations');
  const pendingClaims = await get("SELECT COUNT(*) as total FROM user_gifts WHERE status = 'pending'");
  const totalGifts = await get('SELECT COUNT(*) as total FROM gifts WHERE is_active = true');
  const topInviters = await all(
    `SELECT u.id, u.name, u.email, COUNT(i.id) as invite_count
     FROM users u
     LEFT JOIN invitations i ON i.inviter_id = u.id AND i.level = 1
     WHERE u.is_admin = false
     GROUP BY u.id
     ORDER BY invite_count DESC
     LIMIT 10`
  );

  res.json({
    total_users: Number(totalUsers?.total) || 0,
    total_invites: Number(totalInvites?.total) || 0,
    pending_claims: Number(pendingClaims?.total) || 0,
    active_gifts: Number(totalGifts?.total) || 0,
    top_inviters: topInviters.map(u => ({ ...u, invite_count: Number(u.invite_count) })),
  });
});

// ========== User Management ==========

// GET /api/admin/users
router.get('/users', async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const result = await userModel.list({ page: parseInt(page), limit: parseInt(limit), search });
  res.json(result);
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  const user = await userModel.findById(parseInt(req.params.id));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const stats = await invitationModel.getStats(user.id);
  const effective = await invitationModel.getEffectiveCount(user.id);
  const claims = await userGiftModel.findByUser(user.id);
  const tree = await invitationModel.getDownlineTree(user.id);

  res.json({
    ...user,
    password_hash: undefined,
    stats,
    effective,
    claims,
    invite_tree: tree,
  });
});

// GET /api/admin/users/:id/tree
router.get('/users/:id/tree', async (req, res) => {
  const tree = await invitationModel.getDownlineTree(parseInt(req.params.id));
  res.json(tree);
});

// ========== Gift Management ==========

// GET /api/admin/gifts
router.get('/gifts', async (req, res) => {
  const gifts = await giftModel.list(true);
  res.json(gifts);
});

// POST /api/admin/gifts
router.post('/gifts', async (req, res) => {
  const { name, description, image_url, required_invites, gift_type, value, stock, sort_order } = req.body;

  if (!name || !gift_type || required_invites == null) {
    return res.status(400).json({ error: 'Name, type, and required invites are required' });
  }

  const gift = await giftModel.create({
    name,
    description,
    imageUrl: image_url,
    requiredInvites: required_invites,
    giftType: gift_type,
    value: value || 0,
    stock,
    sortOrder: sort_order,
  });

  res.status(201).json(gift);
});

// PUT /api/admin/gifts/:id
router.put('/gifts/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const gift = await giftModel.findById(id);
  if (!gift) {
    return res.status(404).json({ error: 'Gift not found' });
  }

  const fields = {};
  const allowed = ['name', 'description', 'image_url', 'required_invites', 'gift_type', 'value', 'stock', 'is_active', 'sort_order'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) fields[key] = req.body[key];
  }

  const updated = await giftModel.update(id, fields);
  res.json(updated);
});

// DELETE /api/admin/gifts/:id
router.delete('/gifts/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  await giftModel.deactivate(id);
  res.json({ message: 'Gift has been removed' });
});

// ========== Claim Management ==========

// GET /api/admin/claims
router.get('/claims', async (req, res) => {
  const { page = 1, limit = 20, status = '' } = req.query;
  const result = await userGiftModel.listAll({
    page: parseInt(page),
    limit: parseInt(limit),
    status,
  });
  res.json(result);
});

// PUT /api/admin/claims/:id
router.put('/claims/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, admin_note } = req.body;

  if (!status || !['claimed', 'delivered', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Valid options: claimed, delivered, rejected' });
  }

  const claim = await userGiftModel.findById(id);
  if (!claim) {
    return res.status(404).json({ error: 'Claim record not found' });
  }

  // Before approval, verify KYC of downline users
  if (status === 'delivered') {
    const gift = await giftModel.findById(claim.gift_id);
    if (gift && gift.required_invites > 0) {
      const kycCount = await get(
        `SELECT COUNT(*) as cnt FROM invitations i
         JOIN kyc_submissions k ON k.user_id = i.invitee_id AND k.status = 'approved'
         WHERE i.inviter_id = $1 AND i.level = 1`,
        [claim.user_id]
      );
      const validKyc = Number(kycCount?.cnt) || 0;
      if (validKyc < gift.required_invites) {
        return res.status(400).json({
          error: `下级实名不足：需要${gift.required_invites}人完成KYC，当前仅${validKyc}人`
        });
      }
    }
  }

  const updated = await userGiftModel.updateStatus(id, status, admin_note || '');

  // Send notification
  if (status === 'delivered') {
    await notify(claim.user_id, '礼物已发放', '您申请的礼物已通过审批并发放！奖励已到账。', 'success');
    const giftValue = claim.value || 0;
    if (giftValue > 0) {
      await insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [claim.user_id, giftValue, 'task_reward', 'delivered']);
    }
  } else if (status === 'rejected') {
    const reason = admin_note ? '原因：' + admin_note : '请确保邀请的好友已完成实名认证';
    await notify(claim.user_id, '领取申请未通过', '您的礼物领取申请已被拒绝。' + reason, 'error');
  }
  res.json(updated);
});

// GET /api/admin/notifications
router.get('/notifications', async (req, res) => {
  const rows = await all(
    'SELECT n.*, u.name as user_name, u.email as user_email FROM notifications n JOIN users u ON u.id = n.user_id ORDER BY n.created_at DESC LIMIT 50'
  );
  res.json(rows);
});

// ========== Withdrawal Management ==========

// GET /api/admin/withdrawals
router.get('/withdrawals', async (req, res) => {
  const { page = 1, limit = 20, status = '' } = req.query;
  const offset = (page - 1) * limit;
  let where = '';
  const params = [];
  if (status) {
    where = 'WHERE w.status = ?';
    params.push(status);
  }
  const rows = await all(
    `SELECT w.*, u.name as user_name, u.email as user_email, u.phone as user_phone
     FROM withdrawals w
     JOIN users u ON u.id = w.user_id
     ${where}
     ORDER BY w.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const countRow = await get('SELECT COUNT(*) as total FROM withdrawals w ' + where, params);
  res.json({
    withdrawals: rows,
    total: countRow ? countRow.total : 0,
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

// PUT /api/admin/withdrawals/:id
router.put('/withdrawals/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, admin_note } = req.body;
  if (!['completed', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status must be completed or rejected' });

  const t = await tx();
  try {
    const w = await t.get('SELECT * FROM withdrawals WHERE id = ? FOR UPDATE', [id]);
    if (!w) { await t.rollback(); return res.status(404).json({ error: 'Withdrawal not found' }); }
    if (w.status !== 'pending') { await t.rollback(); return res.status(400).json({ error: 'Already processed' }); }

    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    await t.run(
      'UPDATE withdrawals SET status = ?, admin_note = ?, completed_at = ? WHERE id = ?',
      [status, admin_note || '', completedAt, id]
    );
    await t.commit();
    res.json({ ok: true });
  } catch (err) {
    await t.rollback().catch(() => {});
    throw err;
  }
});

// ========== Balance Adjustment ==========
router.post('/users/:id/balance', async (req, res) => {
  const id = parseInt(req.params.id);
  const amount = parseFloat(req.body.amount);
  const note = req.body.note || '';
  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Valid amount required' });
  if (Math.abs(amount) > 1000000) return res.status(400).json({ error: 'Amount exceeds maximum limit' });

  const user = await userModel.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const t = await tx();
  try {
    if (amount > 0) {
      await t.insert(
        'INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
        [id, amount, 'admin_adjust', 'delivered']
      );
    } else {
      let remaining = Math.abs(amount);
      const tasks = await t.all(
        'SELECT id, amount FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC FOR UPDATE',
        [id, 'delivered']
      );
      for (const task of tasks) {
        if (remaining <= 0) break;
        const deduct = Math.min(Number(task.amount), remaining);
        await t.run('UPDATE task_earnings SET status = ? WHERE id = ?', ['withdrawn', task.id]);
        const rest = Number(task.amount) - deduct;
        if (rest > 0.001) await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [id, rest, 'balance_split', 'delivered']);
        remaining -= deduct;
      }
      if (remaining > 0.01) { await t.rollback(); return res.status(400).json({ error: `Insufficient balance. Shortfall: $${remaining.toFixed(2)}` }); }
    }

    await t.commit();
    const bal = await get("SELECT COALESCE(SUM(amount),0) as total FROM task_earnings WHERE user_id = ? AND status = ?", [id, 'delivered']);
    res.json({ ok: true, newBalance: Number(bal?.total || 0) });

    if (amount > 0) {
      try { require('./notifications').notify(id, '💰 余额到账', `管理员已为您充值 $${amount.toFixed(2)}${note ? ' ('+note+')' : ''}`, 'success'); } catch(e) { console.error('Audit log failed:', e.message); }
    } else {
      try { require('./notifications').notify(id, '💰 余额调整', `管理员已从您的账户扣除 $${Math.abs(amount).toFixed(2)}${note ? ' ('+note+')' : ''}`, 'warning'); } catch(e) { console.error('Audit log failed:', e.message); }
    }
    try { await insert('INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail) VALUES (?,?,?,?)', [req.user.id, amount>0?'credit':'debit', id, `$${Math.abs(amount).toFixed(2)} ${note}`]); } catch(e) { console.error('Audit log failed:', e.message); }
  } catch (err) {
    await t.rollback().catch(() => {});
    console.error('Balance adjust failed:', err);
    res.status(500).json({ error: 'Balance adjustment failed' });
  }
});

// ========== User Finance Summary ==========
router.get('/users/:id/finance', async (req, res) => {
  const id = parseInt(req.params.id);
  const earnings = await all("SELECT amount, type, created_at FROM task_earnings WHERE user_id = ? ORDER BY created_at DESC LIMIT 30", [id]);
  const orders = await all("SELECT o.*, o.product_name FROM store_orders o WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 30", [id]);
  const deposits = await all("SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", [id]);
  const withdrawals = await all("SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", [id]);
  res.json({ earnings, orders, deposits, withdrawals });
});

// ========== User Notes ==========
router.put('/users/:id/notes', async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await userModel.findById(id);
  const old = (user.admin_notes || '').trim();
  const now = new Date().toLocaleString();
  const entry = `[${now}] ${req.body.notes || ''}`;
  const newNotes = old ? old + '\n' + entry : entry;
  await run('UPDATE users SET admin_notes = ? WHERE id = ?', [newNotes, id]);
  try { await insert('INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail) VALUES (?,?,?,?)', [req.user.id, 'notes', id, req.body.notes || '']); } catch(e) { console.error('Audit log failed:', e.message); }
  res.json({ ok: true });
});

// ========== Login As User ==========
router.post('/users/:id/login-as', async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await userModel.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { signAccessToken } = require('../utils/jwt');
  const token = signAccessToken({ id: user.id, email: user.email, is_admin: false });
  try { await insert('INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail) VALUES (?,?,?,?)', [req.user.id, 'login_as', id, user.email]); } catch(e) { console.error('Audit log failed:', e.message); }
  res.json({ token, redirect: '/store?token=' + token });
});

// ========== Batch Operations ==========
router.post('/users/batch', async (req, res) => {
  const { ids, action } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'No users selected' });
  let affected = 0;
  for (const id of ids) {
    const user = await userModel.findById(parseInt(id));
    if (!user || user.is_admin) continue;
    if (action === 'freeze') { await run('UPDATE users SET frozen = TRUE WHERE id = ?', [id]); affected++; }
    else if (action === 'unfreeze') { await run('UPDATE users SET frozen = FALSE WHERE id = ?', [id]); affected++; }
    else if (action === 'delete') { await run('DELETE FROM users WHERE id = ?', [id]); affected++; }
  }
  try { await insert('INSERT INTO admin_audit_log (admin_id, action, detail) VALUES (?,?,?)', [req.user.id, 'batch_'+action, `${affected} users: ${ids.join(',')}`]); } catch(e) { console.error('Audit log failed:', e.message); }
  res.json({ ok: true, affected });
});

// ========== Audit Log ==========
router.get('/audit-log', async (req, res) => {
  const rows = await all(
    `SELECT a.*, u.name as admin_name, u.email as admin_email
     FROM admin_audit_log a JOIN users u ON u.id = a.admin_id
     ORDER BY a.created_at DESC LIMIT 100`
  );
  res.json(rows);
});

// ========== Convert referral codes to numeric ==========
router.post('/convert-referral-codes', async (req, res) => {
  const users = await all("SELECT id FROM users WHERE NOT (referral_code ~ '^[0-9]+$') ORDER BY id");
  // Find the max existing numeric code to avoid conflicts
  const maxRow = await get("SELECT MAX(referral_code::int) as m FROM users WHERE referral_code ~ '^[0-9]+$'");
  let start = Math.max(100001, (parseInt(maxRow?.m) || 0) + 1);
  let count = 0;
  for (const u of users) {
    await run('UPDATE users SET referral_code = ? WHERE id = ?', [String(start + count), u.id]);
    count++;
  }
  await run("INSERT INTO admin_settings (key, value) VALUES ('referral_counter', ?) ON CONFLICT (key) DO UPDATE SET value = ?", [String(start + count - 1), String(start + count - 1)]);
  try { await insert('INSERT INTO admin_audit_log (admin_id, action, detail) VALUES (?,?,?)', [req.user.id, 'convert_codes', count+' users']); } catch(e) { console.error('Audit log failed:', e.message); }
  res.json({ ok: true, converted: count });
});

// ========== Enhanced Users with Filters ==========
router.get('/users-filtered', async (req, res) => {
  const { page = 1, limit = 20, search = '', kyc = '', frozen = '', tier = '' } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (u.email ILIKE ? OR u.name ILIKE ? OR u.phone ILIKE ? OR u.referral_code ILIKE ?)'; params.push('%'+search+'%', '%'+search+'%', '%'+search+'%', '%'+search+'%'); }
  if (kyc) { where += kyc==='none' ? ' AND (k.status IS NULL OR k.status = ?)' : ' AND k.status = ?'; params.push(kyc==='none'?'rejected':kyc); }
  if (frozen === 'yes') { where += ' AND u.frozen = TRUE'; }
  else if (frozen === 'no') { where += ' AND u.frozen = FALSE'; }
  if (tier === 'none') { where += ' AND s.id IS NULL'; }
  else if (tier) { where += ' AND s.tier = ?'; params.push(tier); }

  const total = await get(`SELECT COUNT(*) as c FROM users u LEFT JOIN stores s ON s.user_id = u.id LEFT JOIN kyc_submissions k ON k.user_id = u.id ${where}`, params);
  const users = await all(
    `SELECT u.id, u.email, u.phone, u.phone_prefix, u.name, u.referral_code, u.is_admin, u.is_active, u.frozen, u.created_at, u.ip_address, u.admin_notes, u.last_active_at, u.risk_tags,
            COALESCE(s.id, 0) as store_id, s.tier, s.deposit as store_deposit, s.status as store_status,
            COALESCE((SELECT SUM(amount) FROM task_earnings WHERE user_id = u.id AND status = 'delivered'), 0) as balance,
            COALESCE(k.status, '') as kyc_status,
            p.name as parent_name, p.email as parent_email, p.referral_code as parent_code, p.id as parent_id
     FROM users u
     LEFT JOIN stores s ON s.user_id = u.id
     LEFT JOIN kyc_submissions k ON k.user_id = u.id
     LEFT JOIN users p ON p.id = u.parent_id
     ${where} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json({ users: users.map(u => ({ ...u, balance: Number(u.balance), store_deposit: Number(u.store_deposit || 0) })), total: Number(total?.c || 0), page, limit });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await userModel.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.is_admin) return res.status(400).json({ error: 'Cannot delete admin accounts' });
  await run('DELETE FROM users WHERE id = ?', [id]);
  res.json({ ok: true, message: 'User deleted' });
});

// ========== Settings ==========

// GET /api/admin/settings
router.get('/settings', async (req, res) => {
  const settings = await settingsModel.getAll();
  res.json(settings);
});

// PUT /api/admin/settings
router.put('/settings', async (req, res) => {
  await settingsModel.setMultiple(req.body);
  const settings = await settingsModel.getAll();
  res.json(settings);
});

// ========== Store Management ==========

// GET /api/admin/stores
router.get('/stores', async (req, res) => {
  const rows = await all(
    `SELECT s.*, u.name as user_name, u.email as user_email
     FROM stores s JOIN users u ON u.id = s.user_id
     ORDER BY s.opened_at DESC`
  );
  res.json(rows.map(r => ({
    ...r,
    todayEarnings: 0,
  })));
});

// ========== Enhanced User List (with store + KYC) ==========
router.get('/users-enhanced', async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const offset = (page - 1) * limit;
  const hasSearch = !!search;

  if (hasSearch) {
    const searchTerm = `%${search}%`;
    const total = await get(
      `SELECT COUNT(*) as c FROM users u WHERE u.email ILIKE $1 OR u.name ILIKE $1 OR u.phone ILIKE $1`,
      [searchTerm]
    );
    const rows = await all(
      `SELECT u.id, u.email, u.phone, u.name, u.referral_code, u.is_admin, u.is_active, u.frozen,
              u.created_at, u.ip_address,
              COALESCE(s.id, 0) as store_id, s.tier, s.deposit as store_deposit, s.status as store_status,
              COALESCE((SELECT SUM(amount) FROM task_earnings WHERE user_id = u.id AND status = 'delivered'), 0) as balance,
              COALESCE(k.status, '') as kyc_status
       FROM users u
       LEFT JOIN stores s ON s.user_id = u.id
       LEFT JOIN kyc_submissions k ON k.user_id = u.id
       WHERE u.email ILIKE $1 OR u.name ILIKE $1 OR u.phone ILIKE $1
       ORDER BY u.id DESC
       LIMIT $2 OFFSET $3`,
      [searchTerm, limit, offset]
    );
    res.json({
      users: rows.map(r => ({ ...r, balance: Number(r.balance), store_deposit: Number(r.store_deposit || 0) })),
      total: Number(total?.c || 0), page, limit,
    });
  } else {
    const total = await get('SELECT COUNT(*) as c FROM users u');
    const rows = await all(
      `SELECT u.id, u.email, u.phone, u.name, u.referral_code, u.is_admin, u.is_active, u.frozen,
              u.created_at, u.ip_address,
              COALESCE(s.id, 0) as store_id, s.tier, s.deposit as store_deposit, s.status as store_status,
              COALESCE((SELECT SUM(amount) FROM task_earnings WHERE user_id = u.id AND status = 'delivered'), 0) as balance,
              COALESCE(k.status, '') as kyc_status
       FROM users u
       LEFT JOIN stores s ON s.user_id = u.id
       LEFT JOIN kyc_submissions k ON k.user_id = u.id
       ORDER BY u.id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({
      users: rows.map(r => ({ ...r, balance: Number(r.balance), store_deposit: Number(r.store_deposit || 0) })),
      total: Number(total?.c || 0), page, limit,
    });
  }
});

// ========== Edit User ==========
router.put('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await userModel.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, phone, parent_id } = req.body;
  if (name !== undefined || phone !== undefined) {
    await userModel.update(id, { name, phone });
  }
  if (parent_id !== undefined) {
    if (parent_id === null || parent_id === 0 || parent_id === '0') {
      await run('UPDATE users SET parent_id = NULL WHERE id = ?', [id]);
      await run('DELETE FROM invitations WHERE invitee_id = ?', [id]);
    } else {
      // Accept both DB id and referral code
      let parent;
      const numId = parseInt(parent_id);
      if (!isNaN(numId) && numId > 0) {
        parent = await userModel.findById(numId);
      }
      if (!parent) {
        parent = await userModel.findByReferralCode(String(parent_id));
      }
      if (!parent) return res.status(400).json({ error: 'Parent with invite code #'+parent_id+' not found' });
      await run('UPDATE users SET parent_id = ? WHERE id = ?', [parent.id, id]);
      // Ensure invitation record exists
      const inv = await get('SELECT id FROM invitations WHERE inviter_id = ? AND invitee_id = ?', [parent.id, id]);
      if (!inv) await insert('INSERT INTO invitations (inviter_id, invitee_id, level) VALUES (?, ?, 1)', [parent.id, id]);
    }
  }
  res.json({ ok: true });
});

// ========== Freeze / Unfreeze User ==========
router.put('/users/:id/freeze', async (req, res) => {
  const id = parseInt(req.params.id);
  const { frozen } = req.body;
  await run('UPDATE users SET frozen = ? WHERE id = ?', [!!frozen, id]);
  try { await insert('INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail) VALUES (?,?,?,?)', [req.user.id, frozen?'freeze':'unfreeze', id, '']); } catch(e) { console.error('Audit log failed:', e.message); }
  res.json({ ok: true, frozen: !!frozen });
});

// ========== Reset User Password ==========
router.post('/users/:id/reset-password', async (req, res) => {
  const id = parseInt(req.params.id);
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return res.status(400).json({ error: 'Password must contain both letters and numbers' });

  const { hashPassword } = require('../utils/password');
  const hash = await hashPassword(newPassword);
  await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
  try { await insert('INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail) VALUES (?,?,?,?)', [req.user.id, 'reset_pw', id, '']); } catch(e) { console.error('Audit log failed:', e.message); }
  res.json({ ok: true });
});

// ========== All Orders ==========
router.get('/orders', async (req, res) => {
  const { page = 1, limit = 30, user_id = '', status = '' } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE 1=1';
  const params = [];
  if (user_id) { where += ' AND o.user_id = ?'; params.push(user_id); }
  if (status) { where += ' AND o.status = ?'; params.push(status); }

  const total = await get(`SELECT COUNT(*) as c FROM store_orders o ${where}`, params);
  const rows = await all(
    `SELECT o.*, u.name as user_name, u.email as user_email
     FROM store_orders o JOIN users u ON u.id = o.user_id
     ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json({ orders: rows, total: Number(total?.c || 0), page, limit });
});

// ========== All Holdings ==========
router.get('/holdings', async (req, res) => {
  const { user_id = '' } = req.query;
  let where = "WHERE o.status = 'holding'";
  const params = [];
  if (user_id) { where += ' AND o.user_id = ?'; params.push(user_id); }

  const rows = await all(
    `SELECT o.*, u.name as user_name, u.email as user_email
     FROM store_orders o JOIN users u ON u.id = o.user_id
     ${where} ORDER BY o.created_at DESC LIMIT 200`,
    params
  );
  res.json({ holdings: rows });
});

// ========== Enhanced Stats ==========
router.get('/enhanced-stats', async (req, res) => {
  const totalUsers = await get('SELECT COUNT(*) as c FROM users');
  const totalStores = await get("SELECT COUNT(*) as c FROM stores WHERE status = 'active'");
  const todayVolume = await get("SELECT COALESCE(SUM(amount),0) as total FROM store_orders WHERE created_at::date = CURRENT_DATE");
  const newUsersMonth = await get("SELECT COUNT(*) as c FROM users WHERE created_at >= date_trunc('month', CURRENT_DATE)");
  const ordersToday = await get("SELECT COUNT(*) as c FROM store_orders WHERE created_at::date = CURRENT_DATE");
  const pendingDeposits = await get("SELECT COUNT(*) as c FROM deposits WHERE status = 'pending'");
  const pendingWithdrawals = await get("SELECT COUNT(*) as c FROM withdrawals WHERE status = 'pending'");
  const pendingKyc = await get("SELECT COUNT(*) as c FROM kyc_submissions WHERE status = 'pending'");

  res.json({
    totalUsers: Number(totalUsers?.c || 0),
    totalStores: Number(totalStores?.c || 0),
    todayVolume: Number(todayVolume?.total || 0),
    newUsersMonth: Number(newUsersMonth?.c || 0),
    ordersToday: Number(ordersToday?.c || 0),
    pendingDeposits: Number(pendingDeposits?.c || 0),
    pendingWithdrawals: Number(pendingWithdrawals?.c || 0),
    pendingKyc: Number(pendingKyc?.c || 0),
  });
});

// ========== Daily Cash Flow ==========
router.get('/daily-flow', async (req, res) => {
  try {
    const deposits = await get("SELECT COALESCE(SUM(amount),0) as t FROM deposits WHERE created_at::date = CURRENT_DATE AND status = 'confirmed'");
    const withdrawals = await get("SELECT COALESCE(SUM(amount),0) as t FROM withdrawals WHERE created_at::date = CURRENT_DATE");
    const checkins = await get("SELECT COALESCE(SUM(amount),0) as t FROM task_earnings WHERE created_at::date = CURRENT_DATE AND type = 'checkin'");
    const bonuses = await get("SELECT COALESCE(SUM(amount),0) as t FROM task_earnings WHERE created_at::date = CURRENT_DATE AND type = 'bonus'");
    const orders = await get("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as t FROM store_orders WHERE created_at::date = CURRENT_DATE");
    const settled = await get("SELECT COUNT(*) as c FROM store_orders WHERE created_at::date = CURRENT_DATE AND status = 'done'");
    res.json({ date: new Date().toISOString().slice(0,10), deposits: Number(deposits?.t||0), withdrawals: Number(withdrawals?.t||0), checkins: Number(checkins?.t||0), bonuses: Number(bonuses?.t||0), orders_count: Number(orders?.c||0), orders_volume: Number(orders?.t||0), settled: Number(settled?.c||0) });
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// ========== Top Inviters ==========
router.get('/top-inviters', async (req, res) => {
  try {
    const rows = await all('SELECT u.id, u.email, u.name, u.referral_code, COUNT(i.id) as invite_count FROM users u LEFT JOIN invitations i ON i.inviter_id = u.id GROUP BY u.id ORDER BY invite_count DESC LIMIT 20');
    res.json(rows.map(r => ({...r, invite_count: Number(r.invite_count)})));
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// ========== IP Duplicates Detection ==========
router.get('/ip-duplicates', async (req, res) => {
  try {
    const rows = await all("SELECT ip_address, COUNT(*) as user_count, ARRAY_AGG(email) as emails, ARRAY_AGG(id) as ids FROM users WHERE ip_address IS NOT NULL AND ip_address != '' GROUP BY ip_address HAVING COUNT(*) > 1 ORDER BY user_count DESC LIMIT 30");
    res.json(rows);
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// ========== Rapid Orders Detection ==========
router.get('/rapid-orders', async (req, res) => {
  try {
    const rows = await all("SELECT u.id, u.email, u.name, COUNT(*) as order_count, MAX(o.created_at) as last_order FROM store_orders o JOIN users u ON u.id = o.user_id WHERE o.created_at > NOW() - INTERVAL '1 hour' GROUP BY u.id, u.email, u.name HAVING COUNT(*) >= 3 ORDER BY order_count DESC LIMIT 20");
    res.json(rows.map(r => ({...r, order_count: Number(r.order_count)})));
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// ========== All User IPs ==========
router.get('/user-ips', async (req, res) => {
  try {
    const { user_id } = req.query;
    let query, params;
    const baseSelect = "SELECT u.id, u.email, u.name, u.created_at, u.ip_address as reg_ip, (SELECT ARRAY_AGG(DISTINCT ip_address) FROM ip_log WHERE user_id = u.id) as login_ips FROM users u";
    if (user_id) {
      query = baseSelect + " WHERE u.id = $1";
      params = [parseInt(user_id)];
    } else {
      query = baseSelect + " ORDER BY u.id DESC LIMIT 100";
      params = [];
    }
    const rows = await all(query, params);
    // Include the IP fix timestamp so the frontend can show trust status
    const fixRow = await get("SELECT value FROM admin_settings WHERE key = 'ip_fix_deployed_at'");
    res.json({ users: rows, ip_fix_deployed_at: fixRow?.value || null });
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// ========== Risk Assessment ==========
router.get('/risk-assessment', async (req, res) => {
  try {
    const risks = [];
    // 1. Shared IP detection (same registration IP used by multiple users)
    const sharedReg = await all(
      "SELECT ip_address, ARRAY_AGG(id) as ids, COUNT(*) as cnt FROM users WHERE ip_address != '' AND ip_address IS NOT NULL GROUP BY ip_address HAVING COUNT(*) > 1"
    );
    for (const r of sharedReg) {
      for (const id of (r.ids || [])) {
        risks.push({ user_id: id, tag: 'shared_reg_ip', detail: r.ip_address + ' shared by ' + r.cnt + ' users' });
      }
    }
    // 2. Shared login IP (same login IP used by multiple users)
    const sharedLogin = await all(
      "SELECT ip_address, ARRAY_AGG(DISTINCT user_id) as ids, COUNT(DISTINCT user_id) as cnt FROM ip_log WHERE ip_address != '' AND ip_address NOT LIKE '10.%' AND ip_address NOT LIKE '172.1%' AND ip_address NOT LIKE '192.168.%' GROUP BY ip_address HAVING COUNT(DISTINCT user_id) > 1"
    );
    for (const r of sharedLogin) {
      for (const id of (r.ids || [])) {
        if (!risks.some(x => x.user_id === id && x.tag === 'shared_login_ip')) {
          risks.push({ user_id: id, tag: 'shared_login_ip', detail: r.ip_address + ' shared by ' + r.cnt + ' users' });
        }
      }
    }
    // 3. Rapid orders (3+ orders in 1 hour today)
    const rapid = await all(
      "SELECT user_id, COUNT(*) as cnt FROM store_orders WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY user_id HAVING COUNT(*) >= 3"
    );
    for (const r of rapid) {
      risks.push({ user_id: r.user_id, tag: 'rapid_orders', detail: r.cnt + ' orders in 1 hour' });
    }
    // 4. No KYC with activity (has store/deposits but no KYC)
    const noKyc = await all(
      "SELECT u.id FROM users u LEFT JOIN kyc_submissions k ON k.user_id = u.id WHERE k.id IS NULL AND u.id IN (SELECT DISTINCT user_id FROM stores WHERE status='active' UNION SELECT DISTINCT user_id FROM deposits)"
    );
    for (const r of noKyc) {
      risks.push({ user_id: r.id, tag: 'no_kyc_active', detail: 'Store/deposit activity without KYC' });
    }
    // 5. Many IPs (5+ unique login IPs = possible VPN/proxy hopping)
    const manyIps = await all(
      "SELECT user_id, COUNT(DISTINCT ip_address) as cnt FROM ip_log GROUP BY user_id HAVING COUNT(DISTINCT ip_address) >= 5"
    );
    for (const r of manyIps) {
      risks.push({ user_id: r.user_id, tag: 'multi_ip', detail: r.cnt + ' different login IPs' });
    }

    // Group by user and update risk_tags
    const byUser = {};
    for (const r of risks) {
      if (!byUser[r.user_id]) byUser[r.user_id] = [];
      byUser[r.user_id].push({ tag: r.tag, detail: r.detail });
    }
    for (const [uid, tags] of Object.entries(byUser)) {
      await run('UPDATE users SET risk_tags = ? WHERE id = ?', [JSON.stringify(tags), parseInt(uid)]);
    }
    // Clear risk tags for users with no risks
    const riskedIds = Object.keys(byUser).map(Number);
    if (riskedIds.length > 0) {
      await run('UPDATE users SET risk_tags = ? WHERE id NOT IN (' + riskedIds.join(',') + ')', ['']);
    } else {
      await run("UPDATE users SET risk_tags = ''", []);
    }

    res.json({ assessed: risks.length, users_flagged: Object.keys(byUser).length, breakdown: byUser });
  } catch(e) { res.status(500).json({ error: 'Failed: ' + e.message }); }
});

// ========== User Geo Distribution ==========
router.get('/user-geo-stats', async (req, res) => {
  try {
    // Collect all unique IPs from users (reg_ip + login_ips)
    const regIps = await all("SELECT ip_address FROM users WHERE ip_address != '' AND ip_address IS NOT NULL");
    const loginIps = await all("SELECT DISTINCT ip_address FROM ip_log");
    const allIps = [...new Set([...regIps.map(r => r.ip_address), ...loginIps.map(r => r.ip_address)])];

    // Look up geo for all IPs
    const { lookupIps } = require('../utils/geoip');
    const geoMap = await lookupIps(allIps);

    // Count users by country
    const byCountry = {};
    for (const u of regIps) {
      const g = geoMap[u.ip_address];
      if (g && g.country) {
        byCountry[g.country] = (byCountry[g.country] || 0) + 1;
      }
    }
    // Also count users with login IPs in each country (but don't double count)
    const regUsersWithIp = new Set(regIps.map(r => r.ip_address));
    // Count unique user logins by country
    const loginUsers = await all(
      "SELECT DISTINCT user_id, ip_address FROM ip_log WHERE ip_address NOT LIKE '10.%' AND ip_address NOT LIKE '172.1%' AND ip_address NOT LIKE '192.168.%'"
    );
    for (const l of loginUsers) {
      const g = geoMap[l.ip_address];
      if (g && g.country && !regIps.some(r => r.ip_address === l.ip_address)) {
        byCountry[g.country] = (byCountry[g.country] || 0) + 1;
      }
    }

    // Convert to sorted array
    const stats = Object.entries(byCountry)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ total: regIps.length + (loginUsers.length > 0 ? 1 : 0), byCountry: stats, countries: stats.length });
  } catch(e) { res.status(500).json({ error: 'Failed: ' + e.message }); }
});

// ========== Funnel Analytics (temporary public access for analysis) ==========
router.get('/funnel-public', async (req, res) => {
  try {
    const total = await get('SELECT COUNT(*) as c FROM users');
    const withStore = await get("SELECT COUNT(DISTINCT user_id) as c FROM stores WHERE status = 'active'");
    const withDeposit = await get("SELECT COUNT(DISTINCT user_id) as c FROM stores WHERE deposit > 0");
    const withOrder = await get("SELECT COUNT(DISTINCT user_id) as c FROM store_orders");
    const withMultipleOrders = await get("SELECT COUNT(*) as c FROM (SELECT user_id, COUNT(*) as cnt FROM store_orders GROUP BY user_id HAVING COUNT(*) >= 3) t");
    const withKyc = await get("SELECT COUNT(*) as c FROM kyc_submissions WHERE status = 'approved'");
    const withWithdrawal = await get("SELECT COUNT(DISTINCT user_id) as c FROM withdrawals");
    const active7d = await get("SELECT COUNT(*) as c FROM users WHERE last_active_at > NOW() - INTERVAL '7 days'");
    const active24h = await get("SELECT COUNT(*) as c FROM users WHERE last_active_at > NOW() - INTERVAL '24 hours'");

    // By country (from users with IPs)
    const byCountry = await all(
      "SELECT phone_prefix, COUNT(*) as cnt FROM users GROUP BY phone_prefix ORDER BY cnt DESC LIMIT 10"
    );

    // Orders per user distribution
    const orderDistribution = await all(
      "SELECT CASE WHEN cnt = 1 THEN '1 order' WHEN cnt <= 5 THEN '2-5 orders' WHEN cnt <= 20 THEN '6-20 orders' ELSE '20+ orders' END as bucket, COUNT(*) as users FROM (SELECT user_id, COUNT(*) as cnt FROM store_orders GROUP BY user_id) t GROUP BY bucket ORDER BY MIN(cnt)"
    );

    // Referral effectiveness
    const withInvites = await get("SELECT COUNT(DISTINCT inviter_id) as c FROM invitations");
    const totalInvites = await get("SELECT COUNT(*) as c FROM invitations");
    const topReferrer = await get("SELECT u.name, u.email, COUNT(*) as cnt FROM invitations i JOIN users u ON u.id = i.inviter_id GROUP BY u.id, u.name, u.email ORDER BY cnt DESC LIMIT 1");

    // Daily active trend (last 7 days)
    const dailyActive = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const r = await get("SELECT COUNT(*) as c FROM users WHERE last_active_at::date = $1", [d]);
      dailyActive.push({ date: d.slice(5), active: Number(r?.c || 0) });
    }

    res.json({
      funnel: {
        total_users: Number(total?.c || 0),
        opened_store: Number(withStore?.c || 0),
        made_deposit: Number(withDeposit?.c || 0),
        placed_order: Number(withOrder?.c || 0),
        repeat_orders: Number(withMultipleOrders?.c || 0),
        completed_kyc: Number(withKyc?.c || 0),
        withdrew: Number(withWithdrawal?.c || 0),
      },
      active: { last_24h: Number(active24h?.c || 0), last_7d: Number(active7d?.c || 0) },
      by_country: byCountry,
      order_distribution: orderDistribution,
      invites: { inviters: Number(withInvites?.c || 0), total: Number(totalInvites?.c || 0), top: topReferrer },
      daily_active: dailyActive,
    });
  } catch(e) { res.status(500).json({ error: 'Failed: ' + e.message }); }
});

// ========== IP Geolocation Batch ==========
router.get('/ip-geo', async (req, res) => {
  try {
    const ips = (req.query.ips || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!ips.length) return res.json({});
    const geo = await lookupIps(ips);
    res.json(geo);
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// ========== Agent Management ==========
router.get('/agents', async (req, res) => {
  try {
    const rows = await all('SELECT u.id, u.email, u.name, u.referral_code, u.is_agent, u.agent_commission, u.agent_quota, COALESCE((SELECT COUNT(*) FROM invitations WHERE inviter_id = u.id), 0) as team_size FROM users u WHERE u.is_agent = TRUE ORDER BY u.id');
    const ops = await all('SELECT * FROM agent_operations ORDER BY created_at DESC LIMIT 100');
    res.json({ agents: rows, operations: ops });
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

router.put('/agents/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { is_agent, agent_commission, agent_quota } = req.body;
    if (typeof is_agent !== 'undefined') await run('UPDATE users SET is_agent = ? WHERE id = ?', [!!is_agent, id]);
    if (typeof agent_commission !== 'undefined') await run('UPDATE users SET agent_commission = ? WHERE id = ?', [Number(agent_commission), id]);
    if (typeof agent_quota !== 'undefined') await run('UPDATE users SET agent_quota = ? WHERE id = ?', [Number(agent_quota), id]);
    const user = await get('SELECT id, email, name, referral_code, is_agent, agent_commission, agent_quota FROM users WHERE id = ?', [id]);
    res.json(user);
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// Agent: get team orders
router.get('/agent-orders', async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || !user.is_agent) return res.status(403).json({ error: 'Agent only' });
    const rows = await all(
      `SELECT o.*, u.name as user_name, u.email as user_email FROM store_orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.user_id IN (SELECT invitee_id FROM invitations WHERE inviter_id = ?)
       ORDER BY o.created_at DESC LIMIT 200`, [req.user.id]
    );
    res.json({ orders: rows });
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// Agent: get team member detail (orders + finance)
router.get('/agent-member/:id', async (req, res) => {
  try {
    const agent = await userModel.findById(req.user.id);
    if (!agent || !agent.is_agent) return res.status(403).json({ error: 'Agent only' });
    // Verify this member is in agent's team
    const invite = await get('SELECT id FROM invitations WHERE inviter_id = ? AND invitee_id = ?', [req.user.id, req.params.id]);
    if (!invite) return res.status(403).json({ error: 'Not in your team' });
    const member = await userModel.findById(parseInt(req.params.id));
    const earnings = await all('SELECT * FROM task_earnings WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', [req.params.id]);
    const orders = await all('SELECT * FROM store_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', [req.params.id]);
    const deposits = await all('SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [req.params.id]);
    const withdrawals = await all('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [req.params.id]);
    res.json({ member, earnings, orders, deposits, withdrawals });
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// Agent balance adjust (requires is_agent, not admin)
router.post('/agent-balance', async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || !user.is_agent) return res.status(403).json({ error: 'Agent only' });
    const { target_user_id, amount, note } = req.body;
    if (!target_user_id || !amount) return res.status(400).json({ error: 'target_user_id and amount required' });
    if (Math.abs(amount) > 100000) return res.status(400).json({ error: 'Amount exceeds agent limit' });
    // Verify target is in agent's downline
    const invitee = await get('SELECT i.id FROM invitations i WHERE i.inviter_id = ? AND i.invitee_id = ?', [req.user.id, target_user_id]);
    if (!invitee) return res.status(403).json({ error: 'Not in your team' });

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
          if (rest > 0.001) {
            await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [target_user_id, rest, 'balance_split', 'delivered']);
          }
          remaining -= deduct;
        }
        if (remaining > 0.01) { await t.rollback(); return res.status(400).json({ error: `Insufficient balance. Shortfall: $${remaining.toFixed(2)}` }); }
      }
      await t.insert('INSERT INTO agent_operations (agent_id, target_user_id, action, amount, detail) VALUES (?,?,?,?,?)',
        [req.user.id, target_user_id, amount>0?'credit':'debit', amount, note||'']);
      await t.commit();
      const bal = await get('SELECT COALESCE(SUM(amount),0) as total FROM task_earnings WHERE user_id = ? AND status = ?', [target_user_id, 'delivered']);
      res.json({ ok: true, newBalance: Number(bal?.total || 0) });
    } catch (err) {
      await t.rollback().catch(() => {});
      throw err;
    }
  } catch(e) { console.error('Agent balance error:', e); res.status(500).json({ error: 'Failed: ' + e.message }); }
});

// Agent operations list & record
router.get('/agent-ops', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM agent_operations ORDER BY created_at DESC LIMIT 200');
    res.json(rows);
  } catch(e) { res.status(500).json({error:'Failed'}); }
});
router.post('/agent-ops', async (req, res) => {
  try {
    const { agent_id, target_user_id, action, amount, detail } = req.body;
    await insert('INSERT INTO agent_operations (agent_id, target_user_id, action, amount, detail) VALUES (?,?,?,?,?)',
      [agent_id, target_user_id, action||'adjust', amount||0, detail||'']);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

router.post('/agents/:id/quota', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    await run('UPDATE users SET agent_quota = agent_quota + ? WHERE id = ?', [amount, id]);
    const user = await get('SELECT id, agent_quota FROM users WHERE id = ?', [id]);
    await insert('INSERT INTO agent_operations (agent_id, action, amount, detail) VALUES (?,?,?,?)', [id, 'quota_add', amount, 'Admin added quota']);
    res.json({ agent_quota: Number(user.agent_quota) });
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// ========== Agent Team Detail ==========
router.get('/agent-team/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const agent = await get('SELECT id, email, name FROM users WHERE id = ? AND is_agent = TRUE', [id]);
    if (!agent) return res.status(404).json({ error: 'Not an agent' });
    const members = await all(
      `SELECT u.id, u.email, u.phone, u.name, u.referral_code, u.created_at, u.frozen,
        COALESCE(k.status, '') as kyc_status,
        COALESCE((SELECT SUM(amount) FROM task_earnings WHERE user_id = u.id AND status = 'delivered'), 0) as balance
      FROM invitations i JOIN users u ON u.id = i.invitee_id
      LEFT JOIN kyc_submissions k ON k.user_id = u.id
      WHERE i.inviter_id = ? ORDER BY i.created_at DESC LIMIT 200`, [id]
    );
    res.json({ agent, members: members.map(m => ({...m, balance: Number(m.balance)})) });
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// ========== All Transaction Ledger ==========
router.get('/ledger', async (req, res) => {
  try {
    const { page = 1, limit = 50, type = '', user_id = '' } = req.query;
    const offset = (page - 1) * limit;
    let where = user_id ? 'WHERE te.user_id = ?' : 'WHERE 1=1';
    let params = user_id ? [user_id] : [];
    if (type) { where += ' AND te.type = ?'; params.push(type); }
    const total = await get(`SELECT COUNT(*) as c FROM task_earnings te ${where}`, params);
    const rows = await all(
      `SELECT te.*, u.email, u.name FROM task_earnings te
       JOIN users u ON u.id = te.user_id ${where}
       ORDER BY te.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ rows: rows.map(r => ({...r, amount: Number(r.amount)})), total: Number(total?.c||0), page, limit });
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

// ========== Agent Financial Summary ==========
router.get('/agent-summary', async (req, res) => {
  try {
    const rows = await all(
      `WITH agent_teams AS (
        SELECT u.id, u.email, u.name, u.referral_code,
          COALESCE((SELECT COUNT(*) FROM invitations WHERE inviter_id = u.id), 0) as team_size
        FROM users u WHERE u.is_agent = TRUE
      )
      SELECT a.*,
        COALESCE((SELECT SUM(d.amount) FROM deposits d JOIN invitations i ON i.invitee_id = d.user_id WHERE i.inviter_id = a.id AND d.status = 'confirmed'), 0) as team_deposits,
        COALESCE((SELECT SUM(w.amount) FROM withdrawals w JOIN invitations i ON i.invitee_id = w.user_id WHERE i.inviter_id = a.id), 0) as team_withdrawals
      FROM agent_teams a ORDER BY team_size DESC LIMIT 30`
    );
    res.json(rows.map(r => ({
      ...r, team_size: Number(r.team_size),
      team_deposits: Number(r.team_deposits),
      team_withdrawals: Number(r.team_withdrawals),
      net_flow: Number(r.team_deposits) - Number(r.team_withdrawals),
    })));
  } catch(e) { res.status(500).json({error:'Failed'}); }
});

module.exports = router;
