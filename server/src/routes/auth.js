const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateReferralCode } = require('../utils/referralCode');
const userModel = require('../models/user');
const invitationModel = require('../models/invitation');
const authMiddleware = require('../middleware/auth');

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many login attempts, please try again in 15 minutes' } });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many registration attempts, please try again in 1 hour' } });
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many password reset attempts, please try again in 1 hour' } });

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const phone = (req.body.phone || '').trim();
    const password = req.body.password || '';
    const name = (req.body.name || '').trim();
    const referral_code = (req.body.referral_code || '').trim();

    if (!email || !phone || !password) {
      return res.status(400).json({ error: 'Email, phone number, and password are required' });
    }
    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    // Password: min 8 chars, must contain letter + digit
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain both letters and numbers' });
    }
    // Phone: 10-15 digits
    if (!/^\d{10,15}$/.test(phone)) {
      return res.status(400).json({ error: 'Please enter a valid phone number' });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) {
      // Don't leak email existence — return generic message
      return res.status(200).json({ message: 'Registration successful, please log in' });
    }

    let parentId = null;
    let inviter = null;
    if (referral_code) {
      inviter = await userModel.findByReferralCode(referral_code);
      if (!inviter) {
        return res.status(400).json({ error: 'Invalid referral code' });
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
    res.status(500).json({ error: 'Registration failed, please try again later' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter your email and password' });
    }
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect email or password' });
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
    res.status(500).json({ error: 'Login failed, please try again later' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'Missing refresh_token' });
    }
    const decoded = verifyRefreshToken(refresh_token);
    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const tokenPayload = { id: user.id, email: user.email, is_admin: user.is_admin };
    const accessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);
    res.json({ access_token: accessToken, refresh_token: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ error: 'refresh_token is invalid or expired' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    id: user.id, email: user.email, phone: user.phone, name: user.name,
    avatar_url: user.avatar_url, referral_code: user.referral_code,
    is_admin: user.is_admin, created_at: user.created_at,
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', resetLimiter, async (req, res) => {
  try {
    const { email, phone, newPassword } = req.body;
    if (!email || !phone || !newPassword) return res.status(400).json({ error: 'Please fill in all fields' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const user = await userModel.findByEmail(email);
    if (!user || user.phone !== phone) return res.status(400).json({ error: 'Email or phone number does not match' });
    const newHash = await hashPassword(newPassword);
    const { run } = require('../db/database');
    await run("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [newHash, user.id]);
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: 'Reset failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out' });
});

module.exports = router;
