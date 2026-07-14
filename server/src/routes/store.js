const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, all, run, insert } = require('../db/database');

const router = Router();
router.use(authMiddleware);

const TIERS = {
  small:  { name: '小店', capital: 1,  dailyOrders: 10, minReward: 0.05, maxReward: 0.3 },
  medium: { name: '中店', capital: 3,  dailyOrders: 20, minReward: 0.1,  maxReward: 0.5 },
  large:  { name: '大店', capital: 10, dailyOrders: 40, minReward: 0.2,  maxReward: 1.0 },
};

// GET /api/store/tiers
router.get('/tiers', (req, res) => {
  res.json(TIERS);
});

// GET /api/store/status
router.get('/status', async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.json({ hasStore: false });

  const today = new Date().toISOString().slice(0, 10);
  const doneToday = await get(
    "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store.id, today]
  );
  const tier = TIERS[store.tier];

  const earnings = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store.id, today]
  );
  const totalOrders = await get("SELECT COUNT(*) as c FROM store_orders WHERE store_id = ?", [store.id]);
  const totalEarnings = await get("SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ?", [store.id]);

  // Check user balance for next order
  const taskBal = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?",
    [req.user.id, 'delivered']
  );
  const available = Number(taskBal?.total || 0);

  res.json({
    hasStore: true,
    store: {
      ...store,
      tierName: tier.name,
      capital: tier.capital,
      dailyOrders: tier.dailyOrders,
      minReward: tier.minReward,
      maxReward: tier.maxReward,
      doneToday: Number(doneToday?.c) || 0,
      todayEarnings: Number(earnings?.total) || 0,
      totalOrders: Number(totalOrders?.c) || 0,
      totalEarnings: Number(totalEarnings?.total) || 0,
      remaining: Math.max(0, tier.dailyOrders - (Number(doneToday?.c) || 0)),
      canAfford: available >= tier.capital,
      balance: available,
    },
  });
});

// POST /api/store/open — free to open
router.post('/open', async (req, res) => {
  const { tier } = req.body;
  const plan = TIERS[tier];
  if (!plan) return res.status(400).json({ error: '无效的店铺等级，可选: small, medium, large' });

  const existing = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (existing) return res.status(400).json({ error: '你已有一家店铺在运营中' });

  const result = await insert(
    'INSERT INTO stores (user_id, tier, deposit) VALUES (?, ?, ?)',
    [req.user.id, tier, 0]
  );

  require('./notifications').notify(req.user.id, '🏪 开店成功！',
    `${plan.name}已开业，每天可处理 ${plan.dailyOrders} 笔订单，每单需垫付 $${plan.capital} 货款`, 'success');
  res.status(201).json({ id: result.id, tier, capital: plan.capital, dailyOrders: plan.dailyOrders });
});

// POST /api/store/close
router.post('/close', async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: '你没有运营中的店铺' });

  await run("UPDATE stores SET status = 'closed', closed_at = NOW() WHERE id = ?", [store.id]);

  require('./notifications').notify(req.user.id, '🏪 店铺已关闭', '如有未结算订单已自动结算', 'info');
  res.json({ message: '店铺已关闭' });
});

// POST /api/store/orders/process — process order (needs capital)
router.post('/orders/process', async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: '请先开店' });

  const tier = TIERS[store.tier];
  const today = new Date().toISOString().slice(0, 10);

  const doneToday = await get(
    "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store.id, today]
  );

  if (Number(doneToday?.c || 0) >= tier.dailyOrders) {
    return res.status(400).json({ error: '今日订单已全部处理完毕！' });
  }

  // Check if user can afford the capital
  const taskBal = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?",
    [req.user.id, 'delivered']
  );
  const available = Number(taskBal?.total || 0);

  if (available < tier.capital) {
    return res.status(400).json({
      error: `余额不足！每单需垫付 $${tier.capital} 货款，当前可用 $${available.toFixed(2)}`,
      need: tier.capital,
      have: available
    });
  }

  // Deduct capital from balance
  let remaining = tier.capital;
  const tasks = await all(
    'SELECT id, amount FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC',
    [req.user.id, 'delivered']
  );
  for (const t of tasks) {
    if (remaining <= 0) break;
    const deduct = Math.min(Number(t.amount), remaining);
    await run('UPDATE task_earnings SET status = ? WHERE id = ?', ['withdrawn', t.id]);
    const rest = Number(t.amount) - deduct;
    if (rest > 0.001) {
      await insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
        [req.user.id, rest, 'bonus', 'delivered']);
    }
    remaining -= deduct;
  }

  // Random reward
  const profit = Math.round((tier.minReward + Math.random() * (tier.maxReward - tier.minReward)) * 100) / 100;
  const totalReturn = tier.capital + profit;

  // Create order record
  const result = await insert(
    "INSERT INTO store_orders (store_id, user_id, amount, status, processed_at) VALUES (?, ?, ?, 'done', NOW())",
    [store.id, req.user.id, profit]
  );

  // Return capital + profit
  await insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
    [req.user.id, totalReturn, 'bonus', 'delivered']);

  const left = Math.max(0, tier.dailyOrders - (Number(doneToday?.c || 0) + 1));

  res.json({
    id: result.id,
    capital: tier.capital,
    profit,
    totalReturn,
    remaining: left,
    totalDone: Number(doneToday?.c || 0) + 1,
    dailyOrders: tier.dailyOrders,
  });
});

module.exports = router;
