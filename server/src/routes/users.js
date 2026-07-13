const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const userModel = require('../models/user');
const invitationModel = require('../models/invitation');
const { hashPassword, verifyPassword } = require('../utils/password');

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// GET /api/users/me
router.get('/me', (req, res) => {
  const user = userModel.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json({
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    avatar_url: user.avatar_url,
    referral_code: user.referral_code,
    is_admin: user.is_admin,
    created_at: user.created_at,
  });
});

// PUT /api/users/me
router.put('/me', (req, res) => {
  const { name, phone } = req.body;
  const user = userModel.update(req.user.id, { name, phone });
  res.json(user);
});

// GET /api/users/me/stats
router.get('/me/stats', (req, res) => {
  const rawStats = invitationModel.getStats(req.user.id);
  const effective = invitationModel.getEffectiveCount(req.user.id);
  res.json({
    ...rawStats,
    effective: effective.effective,
    breakdown: effective.breakdown,
  });
});

// GET /api/users/me/invitees
router.get('/me/invitees', (req, res) => {
  const { level = 1, page = 1, limit = 20 } = req.query;
  const result = invitationModel.getInvitees(req.user.id, parseInt(level), parseInt(page), parseInt(limit));
  res.json(result);
});

// PUT /api/users/me/password
router.put('/me/password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请输入旧密码和新密码' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度不能少于6位' });
    }
    const user = userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const valid = await verifyPassword(oldPassword, user.password_hash);
    if (!valid) return res.status(403).json({ error: '旧密码错误' });

    const newHash = await hashPassword(newPassword);
    const { run } = require('../db/database');
    run('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?', [newHash, req.user.id]);
    res.json({ message: '密码修改成功' });
  } catch (err) {
    res.status(500).json({ error: '修改失败' });
  }
});

// PUT /api/users/me/contact
router.put('/me/contact', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (!password) return res.status(400).json({ error: '请输入当前密码确认身份' });

    const user = userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(403).json({ error: '密码错误' });

    const updates = {};
    if (email && email !== user.email) {
      const existing = userModel.findByEmail(email);
      if (existing) return res.status(409).json({ error: '该邮箱已被使用' });
      updates.email = email;
    }
    if (phone && phone !== user.phone) updates.phone = phone;
    if (Object.keys(updates).length === 0) return res.json({ message: '无需更改' });

    const { run } = require('../db/database');
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    run(`UPDATE users SET ${sets}, updated_at = datetime('now') WHERE id = ?`,
      [...Object.values(updates), req.user.id]);
    res.json({ message: '更新成功', ...updates });
  } catch (err) {
    res.status(500).json({ error: '更新失败' });
  }
});

module.exports = router;
