const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, all, insert, run, tx } = require('../db/database');
const config = require('../config');

const router = Router();
const COMMISSION_RATE = 0.03;

// POST /api/commissions/claim — share a product, get a unique tracking link
router.post('/claim', authMiddleware, async (req, res) => {
  const { productId, productPrice, productName, productImg } = req.body;
  const price = parseFloat(productPrice);
  if (!price || price <= 0) return res.status(400).json({ error: 'Invalid product price' });

  const commission = Math.round(price * COMMISSION_RATE * 100) / 100;

  // Create a pending commission record with image
  const img = productImg || `/products/${productId || 1}.jpg`;
  const result = await insert(
    'INSERT INTO share_commissions (sharer_id, product_name, product_price, commission) VALUES (?, ?, ?, ?)',
    [req.user.id, productName || 'Unknown', price, commission]
  );

  // Generate share link with tracking — include image path
  const user = await get('SELECT referral_code FROM users WHERE id = ?', [req.user.id]);
  const baseUrl = process.env.BASE_URL || 'https://amashopstore.com';
  const imgParam = encodeURIComponent(productImg || `/products/${productId || 1}.jpg`);
  const shareUrl = `${baseUrl}/buy?ref=${user.referral_code}&pid=${result.id}&img=${imgParam}`;

  res.json({
    id: result.id, productName, productPrice: price, productImg: img,
    commission, rate: '3%', status: 'pending',
    shareUrl,
    message: `Share this link! When someone buys, you earn $${commission}`
  });
});

// GET /api/commissions/public-product/:pid — public product info for buyers
router.get('/public-product/:pid', async (req, res) => {
  const record = await get(
    'SELECT sc.*, u.name as sharer_name FROM share_commissions sc JOIN users u ON u.id = sc.sharer_id WHERE sc.id = ? AND sc.status = ?',
    [req.params.pid, 'pending']
  );
  if (!record) return res.status(404).json({ error: 'Product not found or already sold' });

  // Use image from share link params
  const img = req.query.img || `/products/1.jpg`;

  res.json({
    productName: record.product_name,
    productPrice: Number(record.product_price),
    productImg: decodeURIComponent(img),
    commission: Number(record.commission),
    sharerName: record.sharer_name,
    status: 'available'
  });
});

// POST /api/commissions/buy/:pid — someone buys through the share link
router.post('/buy/:pid', authMiddleware, async (req, res) => {
  const t = await tx();
  try {
    // Read inside transaction with FOR UPDATE to prevent double-credit
    const record = await t.get('SELECT * FROM share_commissions WHERE id = ? AND status = ? FOR UPDATE', [req.params.pid, 'pending']);
    if (!record) { await t.rollback(); return res.status(404).json({ error: 'Product not available or already sold' }); }

    const result = await t.run("UPDATE share_commissions SET status = 'credited' WHERE id = ? AND status = 'pending'", [record.id]);
    if (result.rowCount === 0) { await t.rollback(); return res.status(400).json({ error: 'Already sold' }); }

    await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
      [record.sharer_id, Number(record.commission), 'commission', 'delivered']);
    await t.commit();

    try { require('./notifications').notify(record.sharer_id, '💰 Commission Earned!', `$${Number(record.commission)} from ${record.product_name}`, 'success'); } catch {}

    res.json({ ok: true, commission: Number(record.commission), message: 'Purchase successful! Commission credited to sharer.' });
  } catch (err) { await t.rollback().catch(() => {}); throw err; }
});

// GET /api/commissions — user's commission history
router.get('/', authMiddleware, async (req, res) => {
  const rows = await all('SELECT * FROM share_commissions WHERE sharer_id = ? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
  res.json(rows.map(r => ({ ...r, commission: Number(r.commission), product_price: Number(r.product_price) })));
});

module.exports = router;
