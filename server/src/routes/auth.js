const { Router } = require('express');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateReferralCode } = require('../utils/referralCode');
const userModel = require('../models/user');
const invitationModel = require('../models/invitation');
const authMiddleware = require('../middleware/auth');

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, name, referral_code } = req.body;

    if (!email || !phone || !password) {
      return res.status(400).json({ error: '邮箱、手机号和密码为必填项' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度不能少于6位' });
    }
    if (!/^\d{7,15}$/.test(phone)) {
      return res.status(400).json({ error: '请输入有效的手机号码' });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }

    let parentId = null;
    let inviter = null;
    if (referral_code) {
      inviter = await userModel.findByReferralCode(referral_code);
      if (!inviter) {
        return res.status(400).json({ error: '邀请码无效' });
      }
      parentId = inviter.id;
    }

    let code;
    let attempts = 0;
    do {
      code = generateReferralCode();
      attempts++;
    } while (await userModel.findByReferralCode(code) && attempts < 10);

    const passwordHash = await hashPassword(password);
    const user = await userModel.create({
      email, phone, passwordHash,
      name: name || '',
      referralCode: code,
      parentId,
    });

    if (parentId && inviter) {
      await invitationModel.createChain(parentId, user.id);
    }

    const tokenPayload = { id: user.id, email: user.email, is_admin: user.is_admin };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    res.status(201).json({
      user: {
        id: user.id, email: user.email, phone: user.phone, name: user.name,
        referral_code: user.referral_code, is_admin: user.is_admin,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' });
    }
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    const tokenPayload = { id: user.id, email: user.email, is_admin: user.is_admin };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    res.json({
      user: {
        id: user.id, email: user.email, phone: user.phone, name: user.name,
        referral_code: user.referral_code, is_admin: user.is_admin,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: '缺少refresh_token' });
    }
    const decoded = verifyRefreshToken(refresh_token);
    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    const tokenPayload = { id: user.id, email: user.email, is_admin: user.is_admin };
    const accessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);
    res.json({ access_token: accessToken, refresh_token: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ error: 'refresh_token无效或已过期' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json({
    id: user.id, email: user.email, phone: user.phone, name: user.name,
    avatar_url: user.avatar_url, referral_code: user.referral_code,
    is_admin: user.is_admin, created_at: user.created_at,
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, phone, newPassword } = req.body;
    if (!email || !phone || !newPassword) return res.status(400).json({ error: '请填写所有字段' });
    if (newPassword.length < 6) return res.status(400).json({ error: '密码至少6位' });
    const user = await userModel.findByEmail(email);
    if (!user || user.phone !== phone) return res.status(400).json({ error: '邮箱或手机号不匹配' });
    const newHash = await hashPassword(newPassword);
    const { run } = require('../db/database');
    await run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?", [newHash, user.id]);
    res.json({ message: '密码重置成功' });
  } catch (err) {
    res.status(500).json({ error: '重置失败' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: '已退出登录' });
});

module.exports = router;
