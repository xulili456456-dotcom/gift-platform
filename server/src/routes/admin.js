const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const userModel = require('../models/user');
const giftModel = require('../models/gift');
const userGiftModel = require('../models/userGift');
const invitationModel = require('../models/invitation');
const settingsModel = require('../models/settings');
const { get, all, run, insert } = require('../db/database');

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

  const updated = await userGiftModel.updateStatus(id, status, admin_note || '');
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
  if (!status) return res.status(400).json({ error: 'status required' });
  const completedAt = status === 'completed' ? 'NOW()' : 'NULL';
  await run(
    `UPDATE withdrawals SET status = ?, admin_note = ?, completed_at = ${completedAt} WHERE id = ?`,
    [status, admin_note || '', id]
  );
  res.json({ ok: true });
});

// ========== Balance Adjustment ==========
router.post('/users/:id/balance', async (req, res) => {
  const id = parseInt(req.params.id);
  const amount = parseFloat(req.body.amount);
  const note = req.body.note || '';
  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Valid amount required' });

  const user = await userModel.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (amount > 0) {
    await insert(
      'INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
      [id, amount, 'bonus', 'delivered']
    );
    try { require('./notifications').notify(id, '💰 余额到账', `管理员已为您充值 $${amount.toFixed(2)}${note ? ' ('+note+')' : ''}`, 'success'); } catch {}
  } else {
    let remaining = Math.abs(amount);
    const tasks = await all(
      'SELECT id, amount FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC',
      [id, 'delivered']
    );
    for (const task of tasks) {
      if (remaining <= 0) break;
      const deduct = Math.min(Number(task.amount), remaining);
      await run('UPDATE task_earnings SET status = ? WHERE id = ?', ['withdrawn', task.id]);
      const rest = Number(task.amount) - deduct;
      if (rest > 0.001) await insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [id, rest, 'bonus', 'delivered']);
      remaining -= deduct;
    }
    if (remaining > 0.01) return res.status(400).json({ error: `Insufficient balance. Shortfall: $${remaining.toFixed(2)}` });
    try { require('./notifications').notify(id, '💰 余额调整', `管理员已从您的账户扣除 $${Math.abs(amount).toFixed(2)}${note ? ' ('+note+')' : ''}`, 'warning'); } catch {}
  }

  const bal = await get("SELECT COALESCE(SUM(amount),0) as total FROM task_earnings WHERE user_id = ? AND status = ?", [id, 'delivered']);
  res.json({ ok: true, newBalance: Number(bal?.total || 0) });
  // Audit log
  try { await insert('INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail) VALUES (?,?,?,?)', [req.user.id, amount>0?'credit':'debit', id, `$${Math.abs(amount).toFixed(2)} ${note}`]); } catch {}
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
  await run('UPDATE users SET admin_notes = ? WHERE id = ?', [req.body.notes || '', id]);
  try { await insert('INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail) VALUES (?,?,?,?)', [req.user.id, 'notes', id, '']); } catch {}
  res.json({ ok: true });
});

// ========== Login As User ==========
router.post('/users/:id/login-as', async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await userModel.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { signAccessToken } = require('../utils/jwt');
  const token = signAccessToken({ id: user.id, email: user.email, is_admin: false });
  try { await insert('INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail) VALUES (?,?,?,?)', [req.user.id, 'login_as', id, user.email]); } catch {}
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
  try { await insert('INSERT INTO admin_audit_log (admin_id, action, detail) VALUES (?,?,?)', [req.user.id, 'batch_'+action, `${affected} users: ${ids.join(',')}`]); } catch {}
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

// ========== Enhanced Users with Filters ==========
router.get('/users-filtered', async (req, res) => {
  const { page = 1, limit = 20, search = '', kyc = '', frozen = '', tier = '' } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (u.email ILIKE ? OR u.name ILIKE ? OR u.phone ILIKE ?)'; params.push('%'+search+'%', '%'+search+'%', '%'+search+'%'); }
  if (kyc) { where += kyc==='none' ? ' AND (k.status IS NULL OR k.status = ?)' : ' AND k.status = ?'; params.push(kyc==='none'?'rejected':kyc); }
  if (frozen === 'yes') { where += ' AND u.frozen = TRUE'; }
  else if (frozen === 'no') { where += ' AND u.frozen = FALSE'; }
  if (tier === 'none') { where += ' AND s.id IS NULL'; }
  else if (tier) { where += ' AND s.tier = ?'; params.push(tier); }

  const total = await get(`SELECT COUNT(*) as c FROM users u LEFT JOIN stores s ON s.user_id = u.id LEFT JOIN kyc_submissions k ON k.user_id = u.id ${where}`, params);
  const users = await all(
    `SELECT u.id, u.email, u.phone, u.name, u.referral_code, u.is_admin, u.is_active, u.frozen, u.created_at, u.ip_address, u.admin_notes,
            COALESCE(s.id, 0) as store_id, s.tier, s.deposit as store_deposit, s.status as store_status,
            COALESCE((SELECT SUM(amount) FROM task_earnings WHERE user_id = u.id AND status = 'delivered'), 0) as balance,
            COALESCE(k.status, '') as kyc_status
     FROM users u LEFT JOIN stores s ON s.user_id = u.id LEFT JOIN kyc_submissions k ON k.user_id = u.id
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
  const searchClause = search ? `WHERE u.email ILIKE $1 OR u.name ILIKE $1 OR u.phone ILIKE $1` : '';
  const countParams = search ? [`%${search}%`] : [];

  const total = await get(
    `SELECT COUNT(*) as c FROM users u ${searchClause.replace('$1','?')}`,
    countParams
  );

  const params = search ? [`%${search}%`, limit, offset] : [limit, offset];
  const rows = await all(
    `SELECT u.id, u.email, u.phone, u.name, u.referral_code, u.is_admin, u.is_active, u.frozen,
            u.created_at, u.ip_address,
            COALESCE(s.id, 0) as store_id, s.tier, s.deposit as store_deposit, s.status as store_status,
            COALESCE((SELECT SUM(amount) FROM task_earnings WHERE user_id = u.id AND status = 'delivered'), 0) as balance,
            COALESCE(k.status, '') as kyc_status
     FROM users u
     LEFT JOIN stores s ON s.user_id = u.id
     LEFT JOIN kyc_submissions k ON k.user_id = u.id
     ${searchClause}
     ORDER BY u.id DESC
     LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`,
    params
  );

  res.json({
    users: rows.map(r => ({ ...r, balance: Number(r.balance), store_deposit: Number(r.store_deposit || 0) })),
    total: Number(total?.c || 0),
    page, limit,
  });
});

// ========== Edit User ==========
router.put('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await userModel.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, phone } = req.body;
  if (name !== undefined || phone !== undefined) {
    await userModel.update(id, { name, phone });
  }
  res.json({ ok: true });
});

// ========== Freeze / Unfreeze User ==========
router.put('/users/:id/freeze', async (req, res) => {
  const id = parseInt(req.params.id);
  const { frozen } = req.body;
  await run('UPDATE users SET frozen = ? WHERE id = ?', [!!frozen, id]);
  try { await insert('INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail) VALUES (?,?,?,?)', [req.user.id, frozen?'freeze':'unfreeze', id, '']); } catch {}
  res.json({ ok: true, frozen: !!frozen });
});

// ========== Reset User Password ==========
router.post('/users/:id/reset-password', async (req, res) => {
  const id = parseInt(req.params.id);
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const { hashPassword } = require('../utils/password');
  const hash = await hashPassword(newPassword);
  await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
  try { await insert('INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail) VALUES (?,?,?,?)', [req.user.id, 'reset_pw', id, '']); } catch {}
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
  res.json(rows);
});

// ========== Enhanced Stats ==========
router.get('/enhanced-stats', async (req, res) => {
  const totalUsers = await get('SELECT COUNT(*) as c FROM users');
  const totalStores = await get("SELECT COUNT(*) as c FROM stores WHERE status = 'active'");
  const totalBalance = await get("SELECT COALESCE(SUM(amount),0) as total FROM task_earnings WHERE status = 'delivered'");
  const totalDeposit = await get("SELECT COALESCE(SUM(deposit),0) as total FROM stores");
  const ordersToday = await get("SELECT COUNT(*) as c FROM store_orders WHERE created_at::date = CURRENT_DATE");
  const pendingDeposits = await get("SELECT COUNT(*) as c FROM deposits WHERE status = 'pending'");
  const pendingWithdrawals = await get("SELECT COUNT(*) as c FROM withdrawals WHERE status = 'pending'");
  const pendingKyc = await get("SELECT COUNT(*) as c FROM kyc_submissions WHERE status = 'pending'");

  res.json({
    totalUsers: Number(totalUsers?.c || 0),
    totalStores: Number(totalStores?.c || 0),
    totalBalance: Number(totalBalance?.total || 0),
    totalDeposit: Number(totalDeposit?.total || 0),
    ordersToday: Number(ordersToday?.c || 0),
    pendingDeposits: Number(pendingDeposits?.c || 0),
    pendingWithdrawals: Number(pendingWithdrawals?.c || 0),
    pendingKyc: Number(pendingKyc?.c || 0),
  });
});

module.exports = router;
