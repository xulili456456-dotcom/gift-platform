const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, all, insert, tx } = require('../db/database');

const router = Router();
const COMMISSION_RATE = 0.03; // 3% — lower than holding mode's 15%

// POST /api/commissions/claim — share a product and claim commission
router.post('/claim', authMiddleware, async (req, res) => {
  const { productPrice, productName } = req.body;
  const price = parseFloat(productPrice);
  if (!price || price <= 0) return res.status(400).json({ error: 'Invalid product price' });

  const commission = Math.round(price * COMMISSION_RATE * 100) / 100;

  const result = await insert(
    'INSERT INTO share_commissions (sharer_id, product_name, product_price, commission) VALUES (?, ?, ?, ?)',
    [req.user.id, productName || 'Unknown Product', price, commission]
  );

  // Simulate: randomly someone buys within 1-12 hours
  // In production, this would be triggered by an actual purchase event
  // For now, we credit immediately with a small random delay feel
  const delayMs = 3000 + Math.random() * 5000; // 3-8 seconds for demo

  setTimeout(async () => {
    try {
      const t = await tx();
      await t.run("UPDATE share_commissions SET status = 'credited' WHERE id = ?", [result.id]);
      await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
        [req.user.id, commission, 'bonus', 'delivered']);
      await t.commit();
    } catch (e) { /* silent */ }
  }, delayMs);

  res.json({
    id: result.id, productName: productName || 'Unknown', productPrice: price,
    commission, rate: '3%', status: 'pending',
    message: `Commission of $${commission} will be credited shortly!`
  });
});

// GET /api/commissions — user's commission history
router.get('/', authMiddleware, async (req, res) => {
  const rows = await all('SELECT * FROM share_commissions WHERE sharer_id = ? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
  res.json(rows.map(r => ({ ...r, commission: Number(r.commission), product_price: Number(r.product_price) })));
});

module.exports = router;
