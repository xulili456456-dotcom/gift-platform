const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, run } = require('../db/database');

const router = Router();
router.use(authMiddleware);

function validateAddress(address, network) {
  const addr = (address || '').trim();
  if (!addr) return '请输入钱包地址';
  if (network === 'trc20') {
    if (!/^T[A-Za-z0-9]{33}$/.test(addr)) return 'TRC20地址格式不正确（应以T开头，34位字符）';
  } else if (network === 'erc20' || network === 'bep20') {
    if (!/^0x[A-Fa-f0-9]{40}$/.test(addr)) return '地址格式不正确（应以0x开头，42位字符）';
  }
  return null; // valid
}

// GET /api/wallet
router.get('/', async (req, res) => {
  const w = await get('SELECT * FROM user_wallets WHERE user_id = ?', [req.user.id]);
  res.json(w ? { address: w.address, network: w.network, bound_at: w.created_at } : null);
});

// PUT /api/wallet
router.put('/', async (req, res) => {
  const { address, network } = req.body;
  const err = validateAddress(address, network);
  if (err) return res.status(400).json({ error: err });

  const addr = address.trim();
  const existing = await get('SELECT id FROM user_wallets WHERE user_id = ?', [req.user.id]);
  if (existing) {
    await run("UPDATE user_wallets SET address = ?, network = ?, created_at = NOW() WHERE user_id = ?",
      [addr, network, req.user.id]);
  } else {
    await run('INSERT INTO user_wallets (user_id, address, network) VALUES (?, ?, ?)',
      [req.user.id, addr, network]);
  }
  res.json({ ok: true, address: addr, network });
});

module.exports = router;
