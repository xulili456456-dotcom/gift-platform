const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { get, insert, run, all } = require('../db/database');
const { updateTaskProgress } = require('./tasks');
const { notify } = require('./notifications');
const { hashImage } = require('../utils/hashImage');

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
  if ((video || '').length > 10000000) {
    return res.status(400).json({ error: 'Video too large. Please upload a shorter video (max 10MB).' });
  }

  // Prevent the same ID card being used across multiple accounts — freeze both accounts
  const idNum = String(id_number || '').trim();
  const dup = await get("SELECT user_id FROM kyc_submissions WHERE id_number = ? AND user_id != ? AND status IN ('pending', 'approved', 'rejected') LIMIT 1", [idNum, req.user.id]);
  if (dup) {
    await run('UPDATE users SET frozen = TRUE WHERE (id = ? OR id = ?) AND is_admin = FALSE', [dup.user_id, req.user.id]);
    return res.status(403).json({ error: 'This ID number is already registered under another account. Both accounts have been frozen. Please contact support.' });
  }

  // Prevent the same ID photo being used across multiple accounts — freeze both accounts
  const fh = hashImage(front_image);
  const bh = hashImage(back_image);
  const dupPhoto = await get("SELECT user_id FROM kyc_submissions WHERE user_id != ? AND status IN ('pending', 'approved', 'rejected') AND ((front_hash = ? AND front_hash != '') OR (back_hash = ? AND back_hash != '')) LIMIT 1", [req.user.id, fh, bh]);
  if (dupPhoto) {
    await run('UPDATE users SET frozen = TRUE WHERE (id = ? OR id = ?) AND is_admin = FALSE', [dupPhoto.user_id, req.user.id]);
    return res.status(403).json({ error: 'The ID photo has already been used by another account. Both accounts have been frozen. Please contact support.' });
  }

  const existing = await get('SELECT id, status FROM kyc_submissions WHERE user_id = ?', [req.user.id]);
  if (existing) {
    if (existing.status === 'pending') return res.status(400).json({ error: 'Your verification is already under review' });
    // Rejected or approved — allow re-submit / re-verify
    await run('UPDATE kyc_submissions SET doc_type = ?, real_name = ?, id_number = ?, front_image = ?, back_image = ?, front_hash = ?, back_hash = ?, video = ?, status = ?, submitted_at = NOW(), reviewed_at = NULL, admin_note = NULL WHERE id = ?',
      [doc_type || 'driver_license', real_name, id_number, front_image || '', back_image || '', fh, bh, video || null, 'pending', existing.id]);
    return res.json({ id: existing.id, status: 'pending', message: 'Submitted for review' });
  }

  const result = await insert(
    'INSERT INTO kyc_submissions (user_id, doc_type, real_name, id_number, front_image, back_image, front_hash, back_hash, video) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, doc_type || 'driver_license', real_name, id_number, front_image || '', back_image || '', fh, bh, video || null]
  );
  res.status(201).json({ id: result.id, status: 'pending' });
});

// POST /api/kyc/video — upload selfie video for existing KYC (without redoing photos)
router.post('/video', authMiddleware, async (req, res) => {
  const { video } = req.body;
  if (!video) return res.status(400).json({ error: 'Please upload a selfie video holding your ID' });
  if ((video || '').length > 10000000) {
    return res.status(400).json({ error: 'Video too large. Please upload a shorter video (max 10MB).' });
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
    'SELECT k.id, k.user_id, k.doc_type, k.real_name, k.id_number, k.front_hash, k.back_hash, k.status, k.admin_note, k.submitted_at, k.reviewed_at, u.name as user_name, u.email as user_email, u.referral_code as referral_code, u.frozen as frozen, COALESCE((SELECT SUM(te.amount) FROM task_earnings te WHERE te.user_id = k.user_id AND te.status = \'delivered\'), 0) as balance FROM kyc_submissions k JOIN users u ON u.id = k.user_id ORDER BY k.submitted_at DESC'
  );
  // Detect duplicate ID numbers across accounts (for admin review)
  const dupUsers = {};
  for (const r of rows) {
    const idn = String(r.id_number || '').trim();
    if (idn) {
      if (!dupUsers[idn]) dupUsers[idn] = new Set();
      dupUsers[idn].add(r.user_id);
    }
  }
  for (const r of rows) {
    const idn = String(r.id_number || '').trim();
    if (idn && dupUsers[idn] && dupUsers[idn].size > 1) r.dup_id = true;
  }
  // Detect duplicate ID photos across accounts
  const dupPhotos = {};
  for (const r of rows) {
    if (r.front_hash) {
      if (!dupPhotos['f:' + r.front_hash]) dupPhotos['f:' + r.front_hash] = new Set();
      dupPhotos['f:' + r.front_hash].add(r.user_id);
    }
    if (r.back_hash) {
      if (!dupPhotos['b:' + r.back_hash]) dupPhotos['b:' + r.back_hash] = new Set();
      dupPhotos['b:' + r.back_hash].add(r.user_id);
    }
  }
  for (const r of rows) {
    const fDup = r.front_hash && dupPhotos['f:' + r.front_hash] && dupPhotos['f:' + r.front_hash].size > 1;
    const bDup = r.back_hash && dupPhotos['b:' + r.back_hash] && dupPhotos['b:' + r.back_hash].size > 1;
    if (fDup || bDup) r.dup_photo = true;
  }
  // Detect duplicate names across accounts (same person, possibly different ID numbers)
  const dupNames = {};
  for (const r of rows) {
    const nm = String(r.real_name || '').trim();
    if (nm) {
      if (!dupNames[nm]) dupNames[nm] = new Set();
      dupNames[nm].add(r.user_id);
    }
  }
  for (const r of rows) {
    const nm = String(r.real_name || '').trim();
    if (nm && dupNames[nm] && dupNames[nm].size > 1) r.dup_name = true;
  }
  // Build duplicate groups: which referral codes share the same ID / photo / name
  const groupMap = {};
  const addToGroup = (type, key, r) => {
    const gk = type + '|' + key;
    if (!groupMap[gk]) groupMap[gk] = { type, key, accounts: [] };
    if (!groupMap[gk].accounts.some(a => a.user_id === r.user_id)) {
      groupMap[gk].accounts.push({ user_id: r.user_id, referral_code: r.referral_code || '-', name: r.real_name || r.user_name || r.email, status: r.status });
    }
  };
  for (const r of rows) {
    const idn = String(r.id_number || '').trim();
    if (idn && dupUsers[idn] && dupUsers[idn].size > 1) addToGroup('id', idn, r);
  }
  for (const r of rows) {
    if (r.front_hash && dupPhotos['f:' + r.front_hash] && dupPhotos['f:' + r.front_hash].size > 1) addToGroup('photo', r.front_hash, r);
    if (r.back_hash && dupPhotos['b:' + r.back_hash] && dupPhotos['b:' + r.back_hash].size > 1) addToGroup('photo', r.back_hash, r);
  }
  for (const r of rows) {
    const nm = String(r.real_name || '').trim();
    if (nm && dupNames[nm] && dupNames[nm].size > 1) addToGroup('name', nm, r);
  }
  const dupGroups = Object.values(groupMap).filter(g => g.accounts.length > 1);
  res.json({ rows, dupGroups });
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

// PUT /api/kyc/admin/:id/freeze — freeze account (suspected fake identity)
router.put('/admin/:id/freeze', authMiddleware, adminMiddleware, async (req, res) => {
  const { admin_note } = req.body;
  const kyc = await get('SELECT user_id, status FROM kyc_submissions WHERE id = ?', [req.params.id]);
  if (!kyc) return res.status(404).json({ error: 'KYC record not found' });

  // Freeze the user account
  await run('UPDATE users SET frozen = TRUE WHERE id = ?', [kyc.user_id]);

  // If KYC is still pending, mark it rejected so it leaves the pending queue
  if (kyc.status === 'pending') {
    await run("UPDATE kyc_submissions SET status = 'rejected', admin_note = ?, reviewed_at = NOW() WHERE id = ?",
      [admin_note || 'Suspected fake identity', req.params.id]);
  }

  // Audit log
  try {
    await insert('INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail) VALUES (?,?,?,?)',
      [req.user.id, 'freeze', kyc.user_id, 'KYC suspected fake: ' + (admin_note || '')]);
  } catch (e) { console.error('Audit log failed:', e.message); }

  // Notify user
  await notify(kyc.user_id, 'Account Suspended',
    'Your account has been suspended due to suspected fraudulent identity verification. Please contact support.', 'error');

  res.json({ ok: true, frozen: true });
});

// PUT /api/kyc/admin/:id/reset — clear verification, force user to re-submit
router.put('/admin/:id/reset', authMiddleware, adminMiddleware, async (req, res) => {
  const { admin_note } = req.body;
  const kyc = await get('SELECT user_id FROM kyc_submissions WHERE id = ?', [req.params.id]);
  if (!kyc) return res.status(404).json({ error: 'KYC record not found' });

  await run("UPDATE kyc_submissions SET status = 'rejected', admin_note = ?, reviewed_at = NOW() WHERE id = ?",
    [admin_note || 'Please resubmit your identity verification', req.params.id]);

  try {
    await insert('INSERT INTO admin_audit_log (admin_id, action, target_user_id, detail) VALUES (?,?,?,?)',
      [req.user.id, 'kyc_reset', kyc.user_id, admin_note || 'resubmit requested']);
  } catch (e) { console.error('Audit log failed:', e.message); }

  await notify(kyc.user_id, 'Verification Required',
    'Please resubmit your identity verification for review. ' + (admin_note || ''), 'warning');

  res.json({ ok: true });
});

module.exports = router;
