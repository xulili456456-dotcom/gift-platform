const { Router } = require('express');
const QRCode = require('qrcode');
const authMiddleware = require('../middleware/auth');
const userModel = require('../models/user');
const invitationModel = require('../models/invitation');

const router = Router();
router.use(authMiddleware);

// GET /api/referral/code - get my referral info
router.get('/code', async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const shareLink = `${req.protocol}://${req.get('host')}/register?ref=${user.referral_code}`;

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(shareLink, {
      width: 300,
      margin: 2,
      color: { dark: '#C41E3A', light: '#FFFFFF' },
    });
  } catch (err) {
    console.error('QR generation error:', err);
  }

  res.json({
    referral_code: user.referral_code,
    share_link: shareLink,
    qr_code: qrDataUrl,
  });
});

// GET /api/referral/stats - detailed stats
router.get('/stats', async (req, res) => {
  const rawStats = await invitationModel.getStats(req.user.id);
  const effective = await invitationModel.getEffectiveCount(req.user.id);

  // Get recent invitees
  const level1Invitees = await invitationModel.getInvitees(req.user.id, 1, 1, 5);

  res.json({
    referral_code: user.referral_code,
    direct_count: rawStats.level1,
    level2_count: rawStats.level2,
    level3_count: rawStats.level3,
    total_invites: rawStats.total,
    effective_invites: effective.effective,
    breakdown: effective.breakdown,
    recent_invitees: level1Invitees.invitees,
  });
});

module.exports = router;
