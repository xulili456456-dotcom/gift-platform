const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const userModel = require('../models/user');
const giftModel = require('../models/gift');
const userGiftModel = require('../models/userGift');
const invitationModel = require('../models/invitation');
const settingsModel = require('../models/settings');
const { get, all, run } = require('../db/database');

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
    return res.status(404).json({ error: '用户不存在' });
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
    return res.status(400).json({ error: '名称、类型和所需邀请人数为必填' });
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
    return res.status(404).json({ error: '礼物不存在' });
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
  res.json({ message: '礼物已下架' });
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
    return res.status(400).json({ error: '状态值无效，可选: claimed, delivered, rejected' });
  }

  const claim = await userGiftModel.findById(id);
  if (!claim) {
    return res.status(404).json({ error: '领取记录不存在' });
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
  const completedAt = status === 'completed' ? "datetime('now')" : 'NULL';
  await run(
    `UPDATE withdrawals SET status = ?, admin_note = ?, completed_at = ${completedAt} WHERE id = ?`,
    [status, admin_note || '', id]
  );
  res.json({ ok: true });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (id === 1) return res.status(400).json({ error: '不能删除主管理员' });
  const user = await userModel.findById(id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  await run('DELETE FROM users WHERE id = ?', [id]);
  res.json({ ok: true, message: '用户已删除' });
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
    todayEarnings: 0, // lazy: could compute from store_orders
  })));
});

module.exports = router;
