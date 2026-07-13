const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, run } = require('../db/database');

const router = Router();
router.use(authMiddleware);

// GET /api/wallet
router.get('/', (req, res) => {
  const w = get('SELECT * FROM user_wallets WHERE user_id = ?', [req.user.id]);
  res.json(w ? { address: w.address, network: w.network, bound_at: w.created_at } : null);
});

// PUT /api/wallet
router.put('/', (req, res) => {
  const { address, network } = req.body;
  if (!address || !network) return res.status(400).json({ error: 'address and network required' });

  const existing = get('SELECT id FROM user_wallets WHERE user_id = ?', [req.user.id]);
  if (existing) {
    run('UPDATE user_wallets SET address = ?, network = ?, created_at = datetime(\'now\') WHERE user_id = ?',
      [address, network, req.user.id]);
  } else {
    run('INSERT INTO user_wallets (user_id, address, network) VALUES (?, ?, ?)',
      [req.user.id, address, network]);
  }
  res.json({ ok: true, address, network });
});

module.exports = router;
