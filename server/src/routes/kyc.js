const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { get, insert, run, all } = require('../db/database');

const router = Router();

// GET /api/kyc - get my KYC status
router.get('/', authMiddleware, async (req, res) => {
  const kyc = await get('SELECT * FROM kyc_submissions WHERE user_id = ?', [req.user.id]);
  res.json(kyc || null);
});

// POST /api/kyc - submit KYC
router.post('/', authMiddleware, async (req, res) => {
  const { doc_type, real_name, id_number, front_image, back_image } = req.body;
  if (!real_name || !id_number) return res.status(400).json({ error: 'name and id required' });

  const existing = await get('SELECT id FROM kyc_submissions WHERE user_id = ?', [req.user.id]);
  if (existing) return res.status(400).json({ error: 'already submitted' });

  const result = await insert(
    'INSERT INTO kyc_submissions (user_id, doc_type, real_name, id_number, front_image, back_image) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, doc_type || 'driver_license', real_name, id_number, front_image || '', back_image || '']
  );
  res.status(201).json({ id: result.id, status: 'pending' });
});

// === Admin routes ===

// GET /api/kyc/admin/list
router.get('/admin/list', authMiddleware, adminMiddleware, async (req, res) => {
  const rows = await all(
    'SELECT k.*, u.name as user_name, u.email as user_email FROM kyc_submissions k JOIN users u ON u.id = k.user_id ORDER BY k.submitted_at DESC'
  );
  res.json(rows);
});

// PUT /api/kyc/admin/:id
router.put('/admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { status, admin_note } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  await run("UPDATE kyc_submissions SET status = ?, admin_note = ?, reviewed_at = datetime('now') WHERE id = ?",
    [status, admin_note || '', req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
