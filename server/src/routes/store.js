const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, all, run, insert } = require('../db/database');

const router = Router();
router.use(authMiddleware);

// Tier definitions + upgrade thresholds
const TIERS = {
  small:  { name: '小店', capital: 1,  dailyOrders: 10, minReward: 0.05, maxReward: 0.3,  threshold: 0 },
  medium: { name: '中店', capital: 3,  dailyOrders: 20, minReward: 0.1,  maxReward: 0.5,  threshold: 50 },
  large:  { name: '大店', capital: 10, dailyOrders: 40, minReward: 0.2,  maxReward: 1.0,  threshold: 200 },
};

function getTier(totalOrders) {
  if (totalOrders >= TIERS.large.threshold) return 'large';
  if (totalOrders >= TIERS.medium.threshold) return 'medium';
  return 'small';
}

function nextTier(currentTier) {
  if (currentTier === 'small') return { tier: 'medium', ...TIERS.medium };
  if (currentTier === 'medium') return { tier: 'large', ...TIERS.large };
  return null;
}

// GET /api/store/tiers
router.get('/tiers', (req, res) => {
  res.json(TIERS);
});

// GET /api/store/status
router.get('/status', async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.json({ hasStore: false });

  const today = new Date().toISOString().slice(0, 10);

  // Total orders for tier determination
  const totalOrdersRow = await get("SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done'", [store.id]);
  const totalOrders = Number(totalOrdersRow?.c) || 0;

  // Auto-upgrade tier based on total orders
  const newTier = getTier(totalOrders);
  if (newTier !== store.tier) {
    await run('UPDATE stores SET tier = ? WHERE id = ?', [newTier, store.id]);
    store.tier = newTier;
  }

  const tier = TIERS[store.tier];
  const next = nextTier(store.tier);

  const doneToday = await get(
    "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store.id, today]
  );
  const earningsToday = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store.id, today]
  );
  const totalEarnings = await get("SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ?", [store.id]);

  const taskBal = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?",
    [req.user.id, 'delivered']
  );

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
      todayEarnings: Number(earningsToday?.total) || 0,
      totalOrders,
      totalEarnings: Number(totalEarnings?.total) || 0,
      remaining: Math.max(0, tier.dailyOrders - (Number(doneToday?.c) || 0)),
      canAfford: Number(taskBal?.total || 0) >= tier.capital,
      balance: Number(taskBal?.total || 0),
      nextTier: next ? { name: next.name, threshold: next.threshold, remaining: next.threshold - totalOrders } : null,
    },
  });
});

// POST /api/store/open — always starts as small
router.post('/open', async (req, res) => {
  const existing = await get('SELECT * FROM stores WHERE user_id = ?', [req.user.id]);
  if (existing) {
    if (existing.status === 'active') {
      return res.status(400).json({ error: '你已有一家店铺在运营中' });
    }
    await run("UPDATE stores SET status = 'active', tier = 'small', deposit = 0, opened_at = NOW(), closed_at = NULL WHERE id = ?",
      [existing.id]);
    const tier = TIERS.small;
    require('./notifications').notify(req.user.id, '🏪 店铺已重开！',
      `小店已开业，每单垫付 $${tier.capital}，完成50单可升级中店`, 'success');
    return res.status(200).json({ id: existing.id, tier: 'small', capital: tier.capital, dailyOrders: tier.dailyOrders });
  }

  const result = await insert(
    'INSERT INTO stores (user_id, tier, deposit) VALUES (?, ?, ?)',
    [req.user.id, 'small', 0]
  );
  const tier = TIERS.small;
  require('./notifications').notify(req.user.id, '🏪 开店成功！',
    `小店已开业，每单垫付 $${tier.capital}，完成50单可升级中店`, 'success');
  res.status(201).json({ id: result.id, tier: 'small', capital: tier.capital, dailyOrders: tier.dailyOrders });
});

// POST /api/store/close
router.post('/close', async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: '你没有运营中的店铺' });
  await run("UPDATE stores SET status = 'closed', closed_at = NOW() WHERE id = ?", [store.id]);
  require('./notifications').notify(req.user.id, '🏪 店铺已关闭', '随时可以重开，订单数据保留', 'info');
  res.json({ message: '店铺已关闭' });
});

// POST /api/store/orders/process
router.post('/orders/process', async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: '请先开店' });

  // Auto-upgrade tier
  const totalOrdersRow = await get("SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done'", [store.id]);
  const totalOrders = Number(totalOrdersRow?.c) || 0;
  const newTier = getTier(totalOrders);
  if (newTier !== store.tier) {
    await run('UPDATE stores SET tier = ? WHERE id = ?', [newTier, store.id]);
    store.tier = newTier;
  }

  const tier = TIERS[store.tier];
  const today = new Date().toISOString().slice(0, 10);

  const doneToday = await get(
    "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store.id, today]
  );

  if (Number(doneToday?.c || 0) >= tier.dailyOrders) {
    return res.status(400).json({ error: '今日订单已全部处理完毕！' });
  }

  // Check balance
  const taskBal = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?",
    [req.user.id, 'delivered']
  );
  const available = Number(taskBal?.total || 0);

  if (available < tier.capital) {
    return res.status(400).json({
      error: `余额不足！需要 $${tier.capital} 货款，当前可用 $${available.toFixed(2)}`,
      need: tier.capital, have: available
    });
  }

  // Deduct capital
  let remaining = tier.capital;
  const tasks = await all('SELECT id, amount FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC',
    [req.user.id, 'delivered']);
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

  const profit = Math.round((tier.minReward + Math.random() * (tier.maxReward - tier.minReward)) * 100) / 100;
  const totalReturn = tier.capital + profit;

  const result = await insert(
    "INSERT INTO store_orders (store_id, user_id, amount, status, processed_at) VALUES (?, ?, ?, 'done', NOW())",
    [store.id, req.user.id, profit]
  );

  await insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
    [req.user.id, totalReturn, 'bonus', 'delivered']);

  const left = Math.max(0, tier.dailyOrders - (Number(doneToday?.c || 0) + 1));

  res.json({
    id: result.id, capital: tier.capital, profit, totalReturn,
    remaining: left,
    totalDone: Number(doneToday?.c || 0) + 1,
    dailyOrders: tier.dailyOrders,
    tier: store.tier,
  });
});

module.exports = router;
