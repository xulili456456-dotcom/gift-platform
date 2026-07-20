const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, all, run, insert, tx } = require('../db/database');
const { updateTaskProgress } = require('./tasks');

const router = Router();
router.use(authMiddleware);

// Tier definitions — tiers control daily order limits and upgrade thresholds
// Profit is now product-based: cost = price × 0.8, profit = price × 0.08
const TIERS = {
  small:  { name: 'Small Store', dailyOrders: 10, threshold: 0 },
  medium: { name: 'Medium Store', dailyOrders: 20, threshold: 50 },
  large:  { name: 'Large Store', dailyOrders: 40, threshold: 200 },
};

// Product profit formula (shared with frontend)
// cost + profit = price × 100% — no money vanishes
const COST_RATE = 0.85;   // Cost price = market price × 85%
const PROFIT_RATE = 0.15; // Profit = market price × 15%

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
    "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status IN ('done','holding') AND COALESCE(processed_at, created_at)::date = ?::date",
    [store.id, today]
  );
  const earningsToday = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done' AND COALESCE(processed_at, created_at)::date = ?::date",
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
      balance: Number(taskBal?.total || 0),
      deposit: Number(store.deposit || 0),
      maxTrade: Number(store.deposit || 0),
      freeRemaining: Math.max(0, 5 - Number((await get("SELECT value FROM admin_settings WHERE key = ?", ['free_used_' + req.user.id + '_' + today]))?.value || 0)),
    },
  });
});

// POST /api/store/open — always starts as small
router.post('/open', async (req, res) => {
  const existing = await get('SELECT * FROM stores WHERE user_id = ?', [req.user.id]);
  if (existing) {
    if (existing.status === 'active') {
      return res.status(400).json({ error: 'You already have a store in operation' });
    }
    await run("UPDATE stores SET status = 'active', tier = 'small', deposit = 0, opened_at = NOW(), closed_at = NULL WHERE id = ?",
      [existing.id]);
    const tier = TIERS.small;
    require('./notifications').notify(req.user.id, '🏪 Store Reopened',
      `Your store is back! ${tier.dailyOrders} orders/day. Complete 50 more to upgrade`, 'success');
    return res.status(200).json({ id: existing.id, tier: 'small', dailyOrders: tier.dailyOrders });
  }

  const result = await insert(
    'INSERT INTO stores (user_id, tier, deposit) VALUES (?, ?, ?)',
    [req.user.id, 'small', 0]
  );
  const tier = TIERS.small;
  require('./notifications').notify(req.user.id, '🏪 Store Opened!',
    `Your store is open! ${tier.dailyOrders} orders/day. Complete 50 more to upgrade`, 'success');
  res.status(201).json({ id: result.id, tier: 'small', dailyOrders: tier.dailyOrders });
});

// POST /api/store/close
router.post('/close', async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: 'You do not have an active store' });
  await run("UPDATE stores SET status = 'closed', closed_at = NOW() WHERE id = ?", [store.id]);
  require('./notifications').notify(req.user.id, '🏪 Store Closed', 'You can reopen anytime, order data is preserved', 'info');
  res.json({ message: 'Store closed' });
});

// POST /api/store/orders/process — buy & hold (capital locked until sell)
router.post('/orders/process', async (req, res) => {
  const { productPrice, productName } = req.body;
  if (!productPrice || productPrice <= 0) return res.status(400).json({ error: 'Missing product price' });

  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: 'Please open a store first' });

  const tier = TIERS[store.tier];
  const today = new Date().toISOString().slice(0, 10);

  // Free daily orders: 5 slots/day per user, cost ≤ $50, no deposit needed, 5% profit
  const FREE_SLOTS = 5;
  const FREE_MAX_COST = 50;
  const FREE_PROFIT_RATE = 0.05;
  const freeKey = 'free_used_' + req.user.id + '_' + today;
  const freeUsed = await get("SELECT value FROM admin_settings WHERE key = ?", [freeKey]);
  const freeRemaining = FREE_SLOTS - Number(freeUsed?.value || 0);

  let { cost, profit, totalReturn } = calcProduct(productPrice);
  const isFreeOrder = cost <= FREE_MAX_COST && freeRemaining > 0;

  // Recalculate for free orders (5% instead of 15%)
  if (isFreeOrder) {
    profit = Math.round(productPrice * FREE_PROFIT_RATE * 100) / 100;
    totalReturn = Math.round((cost + profit) * 100) / 100;
  }

  // Check available balance (exclude locked in holdings)
  const availBal = await get("SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?", [req.user.id, 'delivered']);
  const available = Number(availBal?.total || 0);

  // Deposit check: cost must not exceed deposit (skip for free orders)
  const deposit = Number(store.deposit || 0);
  if (!isFreeOrder && cost > deposit) {
    return res.status(400).json({
      error: 'Insufficient deposit',
      need: cost, have: deposit, shortage: Math.round((cost - deposit) * 100) / 100,
      depositRequired: true, freeRemaining
    });
  }

  if (available < cost) {
    return res.status(400).json({
      error: 'Insufficient balance',
      need: cost, have: Math.max(0, available), shortage: Math.max(0, Math.round((cost - available) * 100) / 100),
      balance: Number(availBal?.total || 0), deposit,
    });
  }

  // Transaction: deduct + create holding
  const t = await tx();
  try {
    let remaining = cost;
    const tasks = await t.all('SELECT id, amount FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC FOR UPDATE', [req.user.id, 'delivered']);
    for (const task of tasks) {
      if (remaining <= 0) break;
      const deduct = Math.min(Number(task.amount), remaining);
      await t.run('UPDATE task_earnings SET status = ? WHERE id = ?', ['withdrawn', task.id]);
      const rest = Number(task.amount) - deduct;
      if (rest > 0.001) await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [req.user.id, rest, 'bonus', 'delivered']);
      remaining -= deduct;
    }

    // Random sell time: 6-30 hours from now
    const sellHours = 6 + Math.random() * 24;
    const sellBy = new Date(Date.now() + sellHours * 3600000).toISOString();

    // Increment free order counter INSIDE transaction
    let freeUsedCount = Number(freeUsed?.value || 0);
    if (isFreeOrder) {
      freeUsedCount += 1;
      await t.run("INSERT INTO admin_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = ?", [freeKey, String(freeUsedCount), String(freeUsedCount)]);
    }

    const result = await t.insert("INSERT INTO store_orders (store_id, user_id, amount, status, processed_at, product_name) VALUES (?, ?, ?, 'holding', ?, ?)", [store.id, req.user.id, cost, sellBy, productName || '']);
    await t.commit();

    res.json({ id: result.id, cost, profit, totalReturn, sellBy, status: 'holding', isFreeOrder, freeRemaining: FREE_SLOTS - freeUsedCount });

    // Update task progress (async, don't block response)
    const uid = req.user.id;
    updateTaskProgress(uid, 'daily_order_5', 1).catch(()=>{});
    updateTaskProgress(uid, 'first_order', 1).catch(()=>{});
    if (cost >= 100) updateTaskProgress(uid, 'high_value_order', 1, cost).catch(()=>{});
    if (profit > 0) updateTaskProgress(uid, 'profit_streak', 1).catch(()=>{});
  } catch (err) {
    console.error('Buy order failed:', err.code, err.message, err.detail);
    await t.rollback().catch(() => {});
    throw err;
  }
});

// GET /api/store/holdings — current inventory
router.get('/holdings', async (req, res) => {
  const store = await get('SELECT id FROM stores WHERE user_id = ?', [req.user.id]);
  if (!store) return res.json([]);
  const holdings = await all("SELECT id, amount as cost, status, processed_at as sell_by, created_at, product_name FROM store_orders WHERE store_id = ? AND status = 'holding' ORDER BY created_at DESC", [store.id]);
  const now = Date.now();
  res.json(holdings.map(h => {
    const sellBy = new Date(h.sell_by).getTime();
    const total = sellBy - new Date(h.created_at).getTime();
    const elapsed = now - new Date(h.created_at).getTime();
    const progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    return { ...h, cost: Number(h.cost), progress, sellBy: h.sell_by };
  }));
});

// POST /api/store/check-sell — settle due holdings
router.post('/check-sell', async (req, res) => {
  try {
    const store = await get('SELECT id FROM stores WHERE user_id = ?', [req.user.id]);
    if (!store) return res.json({ settled: [] });
    const due = await all("SELECT id, amount as cost, user_id FROM store_orders WHERE store_id = ? AND status = 'holding' AND processed_at <= NOW()", [store.id]);
    const settled = [];
    for (const order of due) {
      const price = Number(order.cost) / COST_RATE;
      const { profit, totalReturn } = calcProduct(price);
      const t = await tx();
      try {
        await t.run("UPDATE store_orders SET status = 'done', amount = ?, processed_at = NOW() WHERE id = ?", [profit, order.id]);
        await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [req.user.id, totalReturn, 'bonus', 'delivered']);
        await t.commit();
        settled.push({ id: order.id, cost: Number(order.cost), profit, totalReturn });
      } catch (err) {
        console.error('Check-sell order failed:', err.code, err.message, 'order:', JSON.stringify(order));
        await t.rollback().catch(() => {});
        return res.status(500).json({ error: 'Settlement failed: ' + (err.message || 'unknown'), code: err.code });
      }
    }
    if (settled.length > 0) {
      try { require('./notifications').notify(req.user.id, 'Item Sold', settled.length + ' item(s) sold, profit credited', 'success'); } catch {}
    }
    res.json({ settled });
  } catch (err) {
    console.error('Check-sell failed:', err.code, err.message);
    res.status(500).json({ error: 'Check-sell error: ' + (err.message || 'unknown') });
  }
});

// GET /api/store/earnings-stats — daily & total profit stats
router.get('/earnings-stats', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const store = await get('SELECT id FROM stores WHERE user_id = ?', [req.user.id]);

  const todayProfit = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done' AND COALESCE(processed_at, created_at)::date = ?::date",
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

// GET /api/store/analytics — dashboard data
router.get('/analytics', async (req, res) => {
  const store = await get('SELECT id, tier FROM stores WHERE user_id = ?', [req.user.id]);
  const today = new Date().toISOString().slice(0, 10);

  // 7-day profit trend
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const r = await get(
      "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done' AND COALESCE(processed_at, created_at)::date = ?::date",
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
    "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done' AND COALESCE(processed_at, created_at)::date = ?::date",
    [store?.id || 0, today]);
  const todayOrders = await get(
    "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done' AND COALESCE(processed_at, created_at)::date = ?::date",
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
    `SELECT id, amount as profit, created_at, status, product_name FROM store_orders WHERE store_id = ? AND status = 'done' ${dateFilter} ORDER BY created_at DESC LIMIT 50`,
    [store.id]);

  const summary = await get(
    `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalProfit FROM store_orders WHERE store_id = ? AND status = 'done' ${dateFilter}`,
    [store.id]);

  res.json({
    orders: orders.map(o => ({ ...o, profit: Number(o.profit) })),
    summary: { count: Number(summary?.count || 0), totalProfit: Number(summary?.totalprofit || 0) },
  });
});

// GET /api/store/free-products — daily random free products (≤$100, no deposit)
router.get('/free-products', authMiddleware, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const key = 'free_products_v4_' + today;
  const countKey = 'free_used_' + req.user.id + '_' + today;

  let data = await get("SELECT value FROM admin_settings WHERE key = ?", [key]);
  let products = [];

  // Clean old versioned keys (v2, v3, etc) but keep today's cache
  try { await run("DELETE FROM admin_settings WHERE (key LIKE 'free_products_v%') AND key NOT LIKE 'free_products_v4_%'"); } catch {}
  // Only generate if not cached
  if (data?.value) {
    try { products = JSON.parse(data.value); } catch { products = []; }
    // Strip old claimed/claimedBy from cached data (now per-user)
    products = products.map(p => ({ id: p.id, name: p.name, price: p.price, img: p.img }));
  }
  if (!products.length) {
    // Generate 5 random products with price ≤ $100
    try {
      const catalog = require('../data/products.json');
      const eligible = catalog.filter(p => p.price <= 100);
      const shuffled = eligible.sort(() => Math.random() - 0.5);
      products = shuffled.slice(0, 5).map(p => ({ id: p.id, name: p.name, price: p.price, img: p.img }));
    } catch (e) {
      // Fallback: hardcoded sample products
      products = [
        {id:39, name:'KitchenAid Kitchen Shears', price:7.59, img:'/products/39.jpg'},
        {id:44, name:'Astercook Kitchen Utensils Set', price:19.98, img:'/products/44.jpg'},
        {id:77, name:'Snack Box Containers Set', price:8.96, img:'/products/77.jpg'},
        {id:41, name:'Hefty Trash Bags 80ct', price:11.97, img:'/products/41.jpg'},
        {id:55, name:'Bluetooth Headphones', price:15.00, img:'/products/55.jpg'},
      ];
    }
    await run("INSERT INTO admin_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING", [key, JSON.stringify(products)]);
  }

  const count = await get("SELECT value FROM admin_settings WHERE key = ?", [countKey]);
  const remaining = Math.max(0, 5 - Number(count?.value || 0));

  res.json({ products, remaining });
});

// POST /api/store/claim-free/:productId — claim AND buy a free product
router.post('/claim-free/:productId', authMiddleware, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const key = 'free_products_v4_' + today;
  const countKey = 'free_used_' + req.user.id + '_' + today;
  const productId = parseInt(req.params.productId);

  const data = await get("SELECT value FROM admin_settings WHERE key = ?", [key]);
  if (!data?.value) return res.status(400).json({ error: 'No free products today' });

  let products;
  try { products = JSON.parse(data.value); } catch { return res.status(400).json({ error: 'Invalid data' }); }

  const product = products.find(p => p.id === productId);
  if (!product) return res.status(400).json({ error: `Product #${productId} not found. Available: [${products.map(p=>p.id).join(',')}]` });

  const count = await get("SELECT value FROM admin_settings WHERE key = ?", [countKey]);
  const used = Number(count?.value || 0);
  if (used >= 5) return res.status(400).json({ error: 'All free orders claimed for today' });

  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: 'Please open a store first' });

  const cost = Math.round(product.price * COST_RATE * 100) / 100;
  const profit = Math.round(product.price * 0.05 * 100) / 100;
  const totalReturn = Math.round((cost + profit) * 100) / 100;

  // Check balance
  const taskBal = await get("SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?", [req.user.id, 'delivered']);
  const available = Number(taskBal?.total || 0);
  if (available < cost) return res.status(400).json({ error: `Insufficient balance. Need $${cost}, have $${available.toFixed(2)}`, need: cost, have: available, shortage: Math.round((cost - available) * 100) / 100 });

  // Transaction: deduct + create holding + increment per-user counter
  const t = await tx();
  try {
    let remaining = cost;
    const tasks = await t.all('SELECT id, amount FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC FOR UPDATE', [req.user.id, 'delivered']);
    for (const task of tasks) {
      if (remaining <= 0) break;
      const deduct = Math.min(Number(task.amount), remaining);
      await t.run('UPDATE task_earnings SET status = ? WHERE id = ?', ['withdrawn', task.id]);
      const rest = Number(task.amount) - deduct;
      if (rest > 0.001) await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [req.user.id, rest, 'bonus', 'delivered']);
      remaining -= deduct;
    }

    const sellHours = 6 + Math.random() * 24;
    const sellBy = new Date(Date.now() + sellHours * 3600000).toISOString();
    const result = await t.insert("INSERT INTO store_orders (store_id, user_id, amount, status, processed_at, product_name) VALUES (?, ?, ?, 'holding', ?, ?)", [store.id, req.user.id, cost, sellBy, product.name]);

    // Increment per-user free counter
    await t.run("INSERT INTO admin_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = ?", [countKey, String(used + 1), String(used + 1)]);

    await t.commit();
    try { require('./notifications').notify(req.user.id, '🔥 Free Order Grabbed!', `${product.name} - Cost $${cost}, profit $${profit}`, 'success'); } catch {}
    res.json({ id: result.id, cost, profit, totalReturn, sellBy, status: 'holding', isFreeOrder: true, remaining: Math.max(0, 5 - (used + 1)) });
  } catch (err) { await t.rollback().catch(() => {}); throw err; }
});

// POST /api/store/deposit — move funds from balance to deposit (instant, no approval needed)
router.post('/deposit', authMiddleware, async (req, res) => {
  const amount = parseFloat(req.body.amount);
  if (!amount || amount < 1) return res.status(400).json({ error: 'Minimum deposit is $1' });

  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: 'Please open a store first' });

  const bal = await get("SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?", [req.user.id, 'delivered']);
  const available = Number(bal?.total || 0);
  if (amount > available) return res.status(400).json({ error: `Insufficient balance. Available: $${available.toFixed(2)}`, need: amount, have: available, shortage: Math.round((amount - available) * 100) / 100 });

  const t = await tx();
  try {
    let remaining = amount;
    const tasks = await t.all('SELECT id, amount FROM task_earnings WHERE user_id = ? AND status = ? ORDER BY id ASC FOR UPDATE', [req.user.id, 'delivered']);
    for (const task of tasks) {
      if (remaining <= 0) break;
      const deduct = Math.min(Number(task.amount), remaining);
      await t.run('UPDATE task_earnings SET status = ? WHERE id = ?', ['withdrawn', task.id]);
      const rest = Number(task.amount) - deduct;
      if (rest > 0.001) await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [req.user.id, rest, 'bonus', 'delivered']);
      remaining -= deduct;
    }
    const newDeposit = Number(store.deposit || 0) + amount;
    await t.run('UPDATE stores SET deposit = ? WHERE id = ?', [newDeposit, store.id]);
    await t.commit();
    try { require('./notifications').notify(req.user.id, '🔒 Deposit Added', `$${amount} locked as deposit. Max trade: $${newDeposit.toFixed(2)}`, 'success'); } catch {}
    res.json({ deposit: newDeposit, maxTrade: newDeposit });
  } catch (err) { await t.rollback().catch(() => {}); throw err; }
});

// POST /api/store/withdraw-deposit — return deposit to balance (if no active holdings exceed new limit)
router.post('/withdraw-deposit', authMiddleware, async (req, res) => {
  const amount = parseFloat(req.body.amount);
  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: 'Please open a store first' });

  const currentDeposit = Number(store.deposit || 0);
  const withdrawAmt = amount ? Math.min(amount, currentDeposit) : currentDeposit;
  if (withdrawAmt <= 0) return res.status(400).json({ error: 'No deposit to withdraw' });

  // Check: active holdings must not exceed remaining deposit
  const maxHolding = await get("SELECT COALESCE(MAX(amount), 0) as max_cost FROM store_orders WHERE store_id = ? AND status = 'holding'", [store.id]);
  const newDeposit = currentDeposit - withdrawAmt;
  if (Number(maxHolding?.max_cost || 0) > newDeposit) {
    return res.status(400).json({
      error: `Cannot withdraw: your largest active order costs $${Number(maxHolding.max_cost).toFixed(2)}`,
      detail: `Withdrawing would leave $${newDeposit.toFixed(2)} deposit, but you need at least $${Number(maxHolding.max_cost).toFixed(2)} to cover your active order. Wait for it to sell (6-30 hours), then try again.`,
      maxHoldingCost: Number(maxHolding.max_cost),
      currentDeposit,
      newDeposit,
      withdrawAmt,
    });
  }

  const result = await insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [req.user.id, withdrawAmt, 'bonus', 'delivered']);
  await run('UPDATE stores SET deposit = ? WHERE id = ?', [newDeposit, store.id]);
  try { require('./notifications').notify(req.user.id, '🔓 Deposit Returned', `$${withdrawAmt} returned to balance`, 'info'); } catch {}
  res.json({ deposit: newDeposit, maxTrade: newDeposit, returned: withdrawAmt });
});

module.exports = router;

