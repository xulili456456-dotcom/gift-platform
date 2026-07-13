const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const giftModel = require('../models/gift');
const userGiftModel = require('../models/userGift');
const invitationModel = require('../models/invitation');

const router = Router();
router.use(authMiddleware);

// POST /api/claims - claim a gift
router.post('/', async (req, res) => {
  const { gift_id } = req.body;
  if (!gift_id) {
    return res.status(400).json({ error: '请指定礼物ID' });
  }

  const gift = await giftModel.findById(parseInt(gift_id));
  if (!gift || !gift.is_active) {
    return res.status(404).json({ error: '礼物不存在或已下架' });
  }

  // Check stock
  if (gift.stock === 0) {
    return res.status(400).json({ error: '该礼物已被领完' });
  }

  // Check eligibility
  const { effective } = await invitationModel.getEffectiveCount(req.user.id);
  if (effective < gift.required_invites) {
    return res.status(400).json({
      error: `邀请人数不足，当前有效邀请: ${effective}，需要: ${gift.required_invites}`,
      current: effective,
      required: gift.required_invites,
    });
  }

  // Check duplicate
  const existing = await userGiftModel.findByUserAndGift(req.user.id, gift.id);
  if (existing) {
    return res.status(409).json({ error: '您已领取过该礼物' });
  }

  // Create claim
  const claim = await userGiftModel.create(req.user.id, gift.id);

  // Decrement stock if limited
  if (gift.stock > 0) {
    await giftModel.update(gift.id, { stock: gift.stock - 1 });
  }

  res.status(201).json(claim);
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
    return res.status(404).json({ error: '领取记录不存在' });
  }
  if (claim.user_id !== req.user.id && !req.user.is_admin) {
    return res.status(403).json({ error: '无权查看' });
  }
  res.json(claim);
});

module.exports = router;
