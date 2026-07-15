const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const userModel = require('../models/user');
const invitationModel = require('../models/invitation');
const { hashPassword, verifyPassword } = require('../utils/password');

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// GET /api/users/me
router.get('/me', async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
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
router.put('/me', async (req, res) => {
  const { name, phone } = req.body;
  const user = await userModel.update(req.user.id, { name, phone });
  res.json(user);
});

// GET /api/users/me/stats
router.get('/me/stats', async (req, res) => {
  const rawStats = await invitationModel.getStats(req.user.id);
  const effective = await invitationModel.getEffectiveCount(req.user.id);
  res.json({
    ...rawStats,
    effective: effective.effective,
    breakdown: effective.breakdown,
  });
});

// GET /api/users/me/invitees
router.get('/me/invitees', async (req, res) => {
  const { level = 1, page = 1, limit = 20 } = req.query;
  const result = await invitationModel.getInvitees(req.user.id, parseInt(level), parseInt(page), parseInt(limit));
  res.json(result);
});

// PUT /api/users/me/password
router.put('/me/password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Please enter your old and new passwords' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await verifyPassword(oldPassword, user.password_hash);
    if (!valid) return res.status(403).json({ error: 'Old password is incorrect' });

    const newHash = await hashPassword(newPassword);
    const { run } = require('../db/database');
    await run("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [newHash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed' });
  }
});

// PUT /api/users/me/contact
router.put('/me/contact', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (!password) return res.status(400).json({ error: 'Please enter your current password to confirm your identity' });

    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(403).json({ error: 'Incorrect password' });

    const updates = {};
    if (email && email !== user.email) {
      const existing = await userModel.findByEmail(email);
      if (existing) return res.status(409).json({ error: 'This email is already in use' });
      updates.email = email;
    }
    if (phone && phone !== user.phone) updates.phone = phone;
    if (Object.keys(updates).length === 0) return res.json({ message: 'No changes needed' });

    const { run } = require('../db/database');
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await run(`UPDATE users SET ${sets}, updated_at = NOW() WHERE id = ?`,
      [...Object.values(updates), req.user.id]);
    res.json({ message: 'Updated successfully', ...updates });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;
