const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, all, run, insert, tx } = require('../db/database');

const router = Router();
router.use(authMiddleware);

// Tier definitions — tiers control daily order limits and upgrade thresholds
// Profit is now product-based: cost = price × 0.8, profit = price × 0.08
const TIERS = {
  small:  { name: '小店', dailyOrders: 10, threshold: 0 },
  medium: { name: '中店', dailyOrders: 20, threshold: 50 },
  large:  { name: '大店', dailyOrders: 40, threshold: 200 },
};

// Product profit formula (shared with frontend)
// cost + profit = price × 100% — no money vanishes
const COST_RATE = 0.85;   // 进货价 = 市场价 × 85%
const PROFIT_RATE = 0.15; // 利润 = 市场价 × 15%

function calcProduct(productPrice) {
  const cost = Math.round(productPrice * COST_RATE * 100) / 100;
  const profit = Math.round(productPrice * PROFIT_RATE * 100) / 100;
  return { cost, profit, totalReturn: Math.round((cost + profit) * 100) / 100 };
}

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
      dailyOrders: tier.dailyOrders,
      costRate: COST_RATE,
      profitRate: PROFIT_RATE,
      doneToday: Number(doneToday?.c) || 0,
      todayEarnings: Number(earningsToday?.total) || 0,
      totalOrders,
      totalEarnings: Number(totalEarnings?.total) || 0,
      remaining: Math.max(0, tier.dailyOrders - (Number(doneToday?.c) || 0)),
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
      `小店已开业，日限${tier.dailyOrders}单，完成50单可升级中店`, 'success');
    return res.status(200).json({ id: existing.id, tier: 'small', dailyOrders: tier.dailyOrders });
  }

  const result = await insert(
    'INSERT INTO stores (user_id, tier, deposit) VALUES (?, ?, ?)',
    [req.user.id, 'small', 0]
  );
  const tier = TIERS.small;
  require('./notifications').notify(req.user.id, '🏪 开店成功！',
    `小店已开业，日限${tier.dailyOrders}单，完成50单可升级中店`, 'success');
  res.status(201).json({ id: result.id, tier: 'small', dailyOrders: tier.dailyOrders });
});

// POST /api/store/close
router.post('/close', async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: '你没有运营中的店铺' });
  await run("UPDATE stores SET status = 'closed', closed_at = NOW() WHERE id = ?", [store.id]);
  require('./notifications').notify(req.user.id, '🏪 店铺已关闭', '随时可以重开，订单数据保留', 'info');
  res.json({ message: '店铺已关闭' });
});

// POST /api/store/orders/process — product-based profit
router.post('/orders/process', async (req, res) => {
  const { productPrice } = req.body;
  if (!productPrice || productPrice <= 0) {
    return res.status(400).json({ error: '缺少商品价格' });
  }

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

  // Product-based pricing
  const { cost, profit, totalReturn } = calcProduct(productPrice);

  // Transaction: daily limit + balance check + FIFO deduction + order insert + return
  const t = await tx();
  try {
    // Check daily order limit within transaction
    const doneToday = await t.get(
      "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
      [store.id, today]
    );

    if (Number(doneToday?.c || 0) >= tier.dailyOrders) {
      await t.rollback();
      return res.status(400).json({ error: '今日订单已全部处理完毕！' });
    }
    const taskBal = await t.get(
      "SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?",
      [req.user.id, 'delivered']
    );
    const available = Number(taskBal?.total || 0);

    if (available < cost) {
      await t.rollback();
      return res.status(400).json({
        error: `余额不足！该商品进货价 $${cost}，当前可用 $${available.toFixed(2)}`,
        need: cost, have: available
      });
    }

    // Deduct product cost from balance (FIFO)
    let remaining = cost;
    const tasks = await t.all('SELECT id, amount FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC FOR UPDATE',
      [req.user.id, 'delivered']);
    for (const task of tasks) {
      if (remaining <= 0) break;
      const deduct = Math.min(Number(task.amount), remaining);
      await t.run('UPDATE task_earnings SET status = ? WHERE id = ?', ['withdrawn', task.id]);
      const rest = Number(task.amount) - deduct;
      if (rest > 0.001) {
        await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
          [req.user.id, rest, 'bonus', 'delivered']);
      }
      remaining -= deduct;
    }

    if (remaining > 0.001) {
      await t.rollback();
      return res.status(400).json({ error: '余额不足，进货失败' });
    }

    // Record the order (amount = profit earned)
    const result = await t.insert(
      "INSERT INTO store_orders (store_id, user_id, amount, status, processed_at) VALUES (?, ?, ?, 'done', NOW())",
      [store.id, req.user.id, profit]
    );

    // Return cost + profit to balance
    await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
      [req.user.id, totalReturn, 'bonus', 'delivered']);

    await t.commit();

    const left = Math.max(0, tier.dailyOrders - (Number(doneToday?.c || 0) + 1));

    res.json({
      id: result.id, cost, profit, totalReturn,
      remaining: left,
      totalDone: Number(doneToday?.c || 0) + 1,
      dailyOrders: tier.dailyOrders,
      tier: store.tier,
    });
  } catch (err) {
    await t.rollback().catch(() => {});
    throw err;
  }
  });

// GET /api/store/earnings-stats — daily & total profit stats
router.get('/earnings-stats', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const store = await get('SELECT id FROM stores WHERE user_id = ?', [req.user.id]);

  const todayProfit = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store?.id || 0, today]
  );
  const totalProfit = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done'",
    [store?.id || 0]
  );
  const totalOrders = await get(
    "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done'",
    [store?.id || 0]
  );
  const balance = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?",
    [req.user.id, 'delivered']
  );
  // Estimate tomorrow's potential: current balance * 1.15 (compound)
  const bal = Number(balance?.total || 0);
  const tomorrowEstimate = Math.round(bal * 1.15 * 100) / 100;

  res.json({
    todayProfit: Number(todayProfit?.total || 0),
    totalProfit: Number(totalProfit?.total || 0),
    totalOrders: Number(totalOrders?.c || 0),
    balance: bal,
    tomorrowEstimate,
    dailyGoal: 20, // default daily goal
  });
});

// POST /api/store/deposit — inject capital into store balance
router.post('/deposit', async (req, res) => {
  const amount = parseFloat(req.body.amount);
  if (!amount || amount < 1) return res.status(400).json({ error: '最低注入金额为 $1' });

  // Take from user's overall task_earnings or simulate deposit
  // For now: add as a "deposit" bonus entry
  const { insert } = require('../db/database');
  const result = await insert(
    'INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
    [req.user.id, amount, 'bonus', 'delivered']
  );
  require('./notifications').notify(req.user.id, '💰 资金已注入',
    `已注入 $${amount} 到电商账户`, 'success');
  res.json({ id: result.id, amount, message: `已注入 $${amount}` });
});

// GET /api/store/analytics — dashboard data
router.get('/analytics', async (req, res) => {
  const store = await get('SELECT id, tier FROM stores WHERE user_id = ?', [req.user.id]);
  const today = new Date().toISOString().slice(0, 10);

  // 7-day profit trend
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const r = await get(
      "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
      [store?.id || 0, d]);
    trend.push({ date: d.slice(5), profit: Number(r?.total || 0) });
  }

  // Top 5 products by profit
  const topProducts = [];
  if (store) {
    const allOrders = await all(
      "SELECT amount, created_at FROM store_orders WHERE store_id = ? AND status = 'done' ORDER BY amount DESC LIMIT 5",
      [store.id]);
    topProducts.push(...allOrders.map(o => ({ profit: Number(o.amount), time: o.created_at })));
  }

  // Today's stats
  const todayProfit = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store?.id || 0, today]);
  const todayOrders = await get(
    "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store?.id || 0, today]);

  const totalProfit = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done'",
    [store?.id || 0]);
  const totalOrders = await get(
    "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done'",
    [store?.id || 0]);

  const balance = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?",
    [req.user.id, 'delivered']);

  res.json({
    trend, topProducts,
    todayProfit: Number(todayProfit?.total || 0),
    todayOrders: Number(todayOrders?.c || 0),
    totalProfit: Number(totalProfit?.total || 0),
    totalOrders: Number(totalOrders?.c || 0),
    balance: Number(balance?.total || 0),
    tier: store?.tier || null,
    profitRate: PROFIT_RATE * 100,
    dailyGoal: 20,
  });
});

// GET /api/store/orders-history
router.get('/orders-history', async (req, res) => {
  const store = await get('SELECT id FROM stores WHERE user_id = ?', [req.user.id]);
  if (!store) return res.json({ orders: [], summary: { count: 0, totalProfit: 0 } });

  const period = req.query.period || 'today';
  let dateFilter = '';
  if (period === 'today') dateFilter = "AND created_at::date = CURRENT_DATE";
  else if (period === 'week') dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
  else if (period === 'month') dateFilter = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";

  const orders = await all(
    `SELECT id, amount as profit, created_at, status FROM store_orders WHERE store_id = ? AND status = 'done' ${dateFilter} ORDER BY created_at DESC LIMIT 50`,
    [store.id]);

  const summary = await get(
    `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalProfit FROM store_orders WHERE store_id = ? AND status = 'done' ${dateFilter}`,
    [store.id]);

  res.json({
    orders: orders.map(o => ({ ...o, profit: Number(o.profit) })),
    summary: { count: Number(summary?.count || 0), totalProfit: Number(summary?.totalProfit || 0) },
  });
});

module.exports = router;

