const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { get, insert, run, all } = require('../db/database');

const router = Router();

// GET /api/proofs - get my proofs
router.get('/', authMiddleware, async (req, res) => {
  const rows = await all('SELECT * FROM invite_proofs WHERE user_id = ? ORDER BY submitted_at DESC', [req.user.id]);
  res.json(rows);
});

// POST /api/proofs - submit proof
router.post('/', authMiddleware, async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'image required' });
  const result = await insert('INSERT INTO invite_proofs (user_id, image) VALUES (?, ?)', [req.user.id, image]);
  res.status(201).json({ id: result.id, status: 'pending' });
});

// === Admin routes ===

// GET /api/proofs/admin/list
router.get('/admin/list', authMiddleware, adminMiddleware, async (req, res) => {
  const rows = await all(
    'SELECT p.*, u.name as user_name, u.email as user_email FROM invite_proofs p JOIN users u ON u.id = p.user_id ORDER BY p.submitted_at DESC'
  );
  res.json(rows);
});

// PUT /api/proofs/admin/:id
router.put('/admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { status, admin_note } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  await run("UPDATE invite_proofs SET status = ?, admin_note = ?, reviewed_at = datetime('now') WHERE id = ?",
    [status, admin_note || '', req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
