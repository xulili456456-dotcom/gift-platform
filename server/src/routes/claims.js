const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const giftModel = require('../models/gift');
const userGiftModel = require('../models/userGift');
const invitationModel = require('../models/invitation');
const { tx } = require('../db/database');

const router = Router();
router.use(authMiddleware);

// POST /api/claims - claim a gift (transaction-protected)
router.post('/', async (req, res) => {
  const { gift_id } = req.body;
  if (!gift_id) {
    return res.status(400).json({ error: 'Please specify a gift ID' });
  }

  const gift = await giftModel.findById(parseInt(gift_id));
  if (!gift || !gift.is_active) {
    return res.status(404).json({ error: 'Gift not found or no longer available' });
  }

  // Check eligibility (read-only, outside tx)
  const { effective } = await invitationModel.getEffectiveCount(req.user.id);
  if (effective < gift.required_invites) {
    return res.status(400).json({
      error: `Not enough invites. Current valid invites: ${effective}, required: ${gift.required_invites}`,
      current: effective,
      required: gift.required_invites,
    });
  }

  // Transaction: stock check + duplicate check + create + stock decrement
  const t = await tx();
  try {
    // Re-read gift within transaction for stock check
    const g = await t.get('SELECT * FROM gifts WHERE id = ?', [gift.id]);
    if (!g || !g.is_active) { await t.rollback(); return res.status(404).json({ error: 'Gift not found or no longer available' }); }
    if (g.stock === 0) { await t.rollback(); return res.status(400).json({ error: 'This gift is out of stock' }); }

    // Check duplicate within transaction
    const existing = await t.get('SELECT id FROM user_gifts WHERE user_id = ? AND gift_id = ?',
      [req.user.id, gift.id]);
    if (existing) { await t.rollback(); return res.status(409).json({ error: 'You have already claimed this gift' }); }

    // Create claim
    const result = await t.insert(
      'INSERT INTO user_gifts (user_id, gift_id, status) VALUES (?, ?, ?)',
      [req.user.id, gift.id, 'pending']);

    // Decrement stock if limited
    if (g.stock > 0) {
      await t.run('UPDATE gifts SET stock = stock - 1 WHERE id = ? AND stock > 0', [gift.id]);
    }

    await t.commit();
    require('./notifications').notify(req.user.id, '🎁 Gift Claimed', `Claimed: ${g.name}`, 'success');
    res.status(201).json({ id: result.id, gift_id: gift.id, status: 'pending' });
  } catch (err) {
    await t.rollback().catch(() => {});
    throw err;
  }
});

// GET /api/claims - list user's claims
router.get('/', async (req, res) => {
  const claims = await userGiftModel.findByUser(req.user.id);
  res.json(claims);
});

// GET /api/claims/:id
router.get('/:id', async (req, res) => {
  const claim = await userGiftModel.findById(parseInt(req.params.id));
  if (!claim) {
    return res.status(404).json({ error: 'Claim record not found' });
  }
  if (claim.user_id !== req.user.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Not authorized to view this' });
  }
  res.json(claim);
});

module.exports = router;
