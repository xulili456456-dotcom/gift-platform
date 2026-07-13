const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const giftModel = require('../models/gift');
const invitationModel = require('../models/invitation');
const userGiftModel = require('../models/userGift');

const router = Router();

// GET /api/gifts/eligible - must be before /:id
router.get('/eligible', authMiddleware, (req, res) => {
  const gifts = giftModel.list(true);
  const { effective } = invitationModel.getEffectiveCount(req.user.id);

  const eligible = gifts.filter(g => {
    if (!g.is_active) return false;
    if (g.required_invites > effective) return false;
    const existing = userGiftModel.findByUserAndGift(req.user.id, g.id);
    return !existing;
  });

  res.json({ eligible, effective_invites: effective });
});

// GET /api/gifts - public list
router.get('/', (req, res) => {
  const gifts = giftModel.list(false);
  res.json(gifts);
});

// GET /api/gifts/:id
router.get('/:id', (req, res) => {
  const gift = giftModel.findById(parseInt(req.params.id));
  if (!gift) {
    return res.status(404).json({ error: '礼物不存在' });
  }
  res.json(gift);
});

module.exports = router;
