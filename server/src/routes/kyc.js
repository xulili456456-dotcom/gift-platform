const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { get, insert, run, all } = require('../db/database');
const { updateTaskProgress } = require('./tasks');
const { notify } = require('./notifications');

const router = Router();

// GET /api/kyc - get my KYC status
router.get('/', authMiddleware, async (req, res) => {
  const kyc = await get('SELECT * FROM kyc_submissions WHERE user_id = ?', [req.user.id]);
  res.json(kyc || null);
});

// POST /api/kyc - submit KYC
router.post('/', authMiddleware, async (req, res) => {
  const { doc_type, real_name, id_number, front_image, back_image, video } = req.body;
  if (!real_name || !id_number) return res.status(400).json({ error: 'name and id required' });
  if (!front_image || !back_image) return res.status(400).json({ error: 'Please upload both front and back images' });
  if (doc_type && !['driver_license', 'passport'].includes(doc_type)) return res.status(400).json({ error: 'Invalid document type' });
  // Limit image size to prevent DB bloat
  if ((front_image || '').length > 10000000 || (back_image || '').length > 10000000) {
    return res.status(400).json({ error: 'Image too large. Please compress or use a smaller file.' });
  }
  if (!video) return res.status(400).json({ error: 'Please upload a selfie video holding your ID' });
  if ((video || '').length > 7000000) {
    return res.status(400).json({ error: 'Video too large. Please upload a shorter video (max 5 seconds).' });
  }

  const existing = await get('SELECT id, status FROM kyc_submissions WHERE user_id = ?', [req.user.id]);
  if (existing) {
    if (existing.status !== 'rejected') return res.status(400).json({ error: 'already submitted' });
    // Rejected — allow resubmit by updating the existing record
    await run('UPDATE kyc_submissions SET doc_type = ?, real_name = ?, id_number = ?, front_image = ?, back_image = ?, video = ?, status = ?, submitted_at = NOW(), reviewed_at = NULL, admin_note = NULL WHERE id = ?',
      [doc_type || 'driver_license', real_name, id_number, front_image || '', back_image || '', video || null, 'pending', existing.id]);
    return res.json({ id: existing.id, status: 'pending', message: 'Resubmitted for review' });
  }

  const result = await insert(
    'INSERT INTO kyc_submissions (user_id, doc_type, real_name, id_number, front_image, back_image, video) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, doc_type || 'driver_license', real_name, id_number, front_image || '', back_image || '', video || null]
  );
  res.status(201).json({ id: result.id, status: 'pending' });
});

// POST /api/kyc/video — upload selfie video for existing KYC (without redoing photos)
router.post('/video', authMiddleware, async (req, res) => {
  const { video } = req.body;
  if (!video) return res.status(400).json({ error: 'Please upload a selfie video holding your ID' });
  if ((video || '').length > 7000000) {
    return res.status(400).json({ error: 'Video too large. Please upload a shorter video (max 5 seconds).' });
  }
  const existing = await get('SELECT id FROM kyc_submissions WHERE user_id = ?', [req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Please complete KYC verification first' });
  await run("UPDATE kyc_submissions SET video = ?, status = 'pending', submitted_at = NOW(), reviewed_at = NULL WHERE id = ?", [video, existing.id]);
  res.json({ ok: true, message: 'Selfie video uploaded, pending review' });
});

// === Admin routes ===

// GET /api/kyc/admin/list — metadata only (exclude images to avoid huge response)
router.get('/admin/list', authMiddleware, adminMiddleware, async (req, res) => {
  const rows = await all(
    'SELECT k.id, k.user_id, k.doc_type, k.real_name, k.id_number, k.status, k.admin_note, k.submitted_at, k.reviewed_at, u.name as user_name, u.email as user_email FROM kyc_submissions k JOIN users u ON u.id = k.user_id ORDER BY k.submitted_at DESC'
  );
  res.json(rows);
});

// GET /api/kyc/admin/:id/images — fetch document images on-demand
router.get('/admin/:id/images', authMiddleware, adminMiddleware, async (req, res) => {
  const row = await get('SELECT front_image, back_image, video FROM kyc_submissions WHERE id = ?', [req.params.id]);
  res.json(row || { front_image: null, back_image: null, video: null });
});

// PUT /api/kyc/admin/:id
router.put('/admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { status, admin_note } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  await run("UPDATE kyc_submissions SET status = ?, admin_note = ?, reviewed_at = NOW() WHERE id = ?",
    [status, admin_note || '', req.params.id]);

  // Send notification to user
  const kyc = await get('SELECT user_id, real_name FROM kyc_submissions WHERE id = ?', [req.params.id]);
  if (kyc) {
    if (status === 'approved') {
      await notify(kyc.user_id, 'KYC Approved', 'Congratulations, your identity verification has been approved! (Name: ' + (kyc.real_name || '') + ')', 'success');
    } else if (status === 'rejected') {
      const reason = admin_note ? 'Reason: ' + admin_note : 'Please resubmit valid identification information';
      await notify(kyc.user_id, 'KYC Rejected', 'Your identity verification was not approved. ' + reason, 'error');
    }
  }

  res.json({ ok: true });
  if (status === 'approved' && kyc) {
    updateTaskProgress(kyc.user_id, 'kyc_complete', 1).catch(()=>{});
    // Reward inviter's "invite 3 friends" (now requires KYC, not just registration)
    const kycUser = await get('SELECT parent_id FROM users WHERE id = ?', [kyc.user_id]);
    if (kycUser?.parent_id) {
      updateTaskProgress(kycUser.parent_id, 'invite_3_weekly', 1).catch(()=>{});
    }
    // Auto-confirm pending red envelope helps
    try { await require('./redEnvelope').confirmPendingHelps(kyc.user_id); } catch(e) { console.log('HELP confirm skipped:', e.message); }
  }
});

module.exports = router;
