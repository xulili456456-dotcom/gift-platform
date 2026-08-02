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

// Product profit formula — deterministic per product per day (no Math.random)
const FREE_PROFIT_RATE = 0.05;

function seededRand(seed) {
  var x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function getRateForProduct(productPrice) {
  const today = new Date().toISOString().slice(0, 10);
  const daySeed = today.split('-').reduce((s, x) => s + parseInt(x), 0);
  const shift = ((daySeed * 7 + 13) % 100 - 50) / 500; // deterministic daily shift
  // Use product price as seed for deterministic per-product randomness
  const rng = seededRand(productPrice * 31 + daySeed);
  let base;
  if (productPrice < 20) base = 0.05 + 0.04 * rng;
  else if (productPrice < 100) base = 0.06 + 0.09 * rng;
  else if (productPrice < 500) base = 0.08 + 0.10 * rng;
  else base = 0.13 + 0.12 * rng;
  return Math.round(Math.max(0.05, Math.min(0.25, base + shift)) * 100) / 100;
}

function calcProduct(productPrice) {
  const rate = getRateForProduct(productPrice);
  const profit = Math.round(productPrice * rate * 100) / 100;
  const cost = Math.round(productPrice * (1 - rate) * 100) / 100;
  return { cost, profit, totalReturn: Math.round((cost + profit) * 100) / 100, rate: Math.round(rate * 100) };
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
      costRate: 'dynamic',
      profitRate: 'dynamic',
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

  // Free daily orders: 5 slots/day per user, each product max 1 free order/day
  const FREE_SLOTS = 5;
  const FREE_MAX_COST = 50;
  const freeKey = 'free_used_' + req.user.id + '_' + today;
  const freeProductKey = 'free_prod_' + req.user.id + '_' + today + '_' + productName;

  let { cost, profit, totalReturn } = calcProduct(productPrice);
  const couldBeFree = cost <= FREE_MAX_COST;

  // Check available balance (exclude locked in holdings)
  const availBal = await get("SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?", [req.user.id, 'delivered']);
  const available = Number(availBal?.total || 0);
  const deposit = Number(store.deposit || 0);

  // Transaction: atomic free-slot check + deduct + create holding
  // Use PostgreSQL advisory lock to prevent concurrent free-order bypass
  const lockKey = parseInt(req.user.id) + 1000000;
  const t = await tx();
  try {
    // Acquire advisory lock first — serializes free-order checks per user
    await t.run("SELECT pg_advisory_xact_lock($1)", [lockKey]);

    // Ensure counter rows exist
    await t.run("INSERT INTO admin_settings (key, value) VALUES ($1, '0') ON CONFLICT (key) DO NOTHING", [freeKey]);
    await t.run("INSERT INTO admin_settings (key, value) VALUES ($1, '0') ON CONFLICT (key) DO NOTHING", [freeProductKey]);

    // Read counts under lock
    const freeUsed = await t.get("SELECT value FROM admin_settings WHERE key = $1", [freeKey]);
    const freeProductUsed = await t.get("SELECT value FROM admin_settings WHERE key = $1", [freeProductKey]);
    const freeUsedCount = Number(freeUsed?.value || 0);
    const freeProductCount = Number(freeProductUsed?.value || 0);
    const freeRemaining = FREE_SLOTS - freeUsedCount;
    const isFreeOrder = couldBeFree && freeRemaining > 0 && freeProductCount < 1;

    if (isFreeOrder) {
      profit = Math.round(productPrice * FREE_PROFIT_RATE * 100) / 100;
      totalReturn = Math.round((cost + profit) * 100) / 100;
    } else if (couldBeFree && freeProductCount >= 1) {
      await t.rollback();
      return res.status(400).json({ error: 'You already claimed this product for free today', productAlreadyClaimed: true });
    }

    // Validate: non-free orders need deposit + balance
    if (!isFreeOrder) {
      if (cost > deposit) {
        await t.rollback();
        return res.status(400).json({ error: 'Insufficient deposit', need: cost, have: deposit, shortage: Math.round((cost - deposit) * 100) / 100, depositRequired: true, freeRemaining });
      }
      if (available < cost) {
        await t.rollback();
        return res.status(400).json({ error: 'Insufficient balance', need: cost, have: Math.max(0, available), shortage: Math.max(0, Math.round((cost - available) * 100) / 100), balance: available, deposit });
      }
    }

    // Deduct balance (skip for free orders)
    if (!isFreeOrder) {
      let remaining = cost;
      const tasks = await t.all('SELECT id, amount FROM task_earnings WHERE user_id = $1 AND status = $2 ORDER BY id ASC FOR UPDATE', [req.user.id, 'delivered']);
      for (const task of tasks) {
        if (remaining <= 0) break;
        const deduct = Math.min(Number(task.amount), remaining);
        await t.run('UPDATE task_earnings SET status = $1 WHERE id = $2', ['withdrawn', task.id]);
        const rest = Number(task.amount) - deduct;
        if (rest > 0.001) await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES ($1, $2, $3, $4)', [req.user.id, rest, 'bonus', 'delivered']);
        remaining -= deduct;
      }
      if (remaining > 0.01) { await t.rollback(); return res.status(400).json({ error: 'Balance changed during checkout, please try again' }); }
    }

    const sellHours = 6 + Math.random() * 24;
    const sellBy = new Date(Date.now() + sellHours * 3600000).toISOString();

    // Update free counters
    if (isFreeOrder) {
      await t.run("UPDATE admin_settings SET value = $1 WHERE key = $2", [String(freeUsedCount + 1), freeKey]);
      await t.run("UPDATE admin_settings SET value = '1' WHERE key = $1", [freeProductKey]);
    }

    const result = await t.insert("INSERT INTO store_orders (store_id, user_id, amount, status, processed_at, product_name, product_price) VALUES ($1, $2, $3, 'holding', $4, $5, $6)",
      [store.id, req.user.id, isFreeOrder ? 0 : cost, sellBy, productName || '', productPrice]);
    await t.commit();

    res.json({ id: result.id, cost: isFreeOrder ? 0 : cost, profit, totalReturn, sellBy, status: 'holding', isFreeOrder, freeRemaining: FREE_SLOTS - freeUsedCount - 1 });

    // Update task progress (async)
    const uid = req.user.id;
    updateTaskProgress(uid, 'daily_order_5', 1).catch(()=>{});
    updateTaskProgress(uid, 'first_order', 1).catch(()=>{});
    if (productPrice >= 100) updateTaskProgress(uid, 'high_value_order', 1, productPrice).catch(()=>{});
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
  const holdings = await all("SELECT id, amount as cost, status, processed_at as sell_by, created_at, product_name, product_price FROM store_orders WHERE store_id = ? AND status = 'holding' ORDER BY created_at DESC", [store.id]);
  const now = Date.now();
  res.json(holdings.map(h => {
    const cost = Number(h.cost);
    const sellBy = new Date(h.sell_by).getTime();
    const total = sellBy - new Date(h.created_at).getTime();
    const elapsed = now - new Date(h.created_at).getTime();
    const progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    const price = Number(h.product_price) || (cost > 0 ? Math.round(cost / 0.85 * 100) / 100 : 0);
    const { profit: p, rate } = calcProduct(price);
    const roi = rate;
    return { ...h, cost, profit: p, roi, progress, sellBy: h.sell_by };
  }));
});

// POST /api/store/check-sell — settle due holdings
router.post('/check-sell', async (req, res) => {
  try {
    const store = await get('SELECT id FROM stores WHERE user_id = ?', [req.user.id]);
    if (!store) return res.json({ settled: [] });
    const due = await all("SELECT id, amount as cost, user_id, product_price FROM store_orders WHERE store_id = ? AND status = 'holding' AND processed_at <= NOW()", [store.id]);
    const settled = [];
    for (const order of due) {
      const orderCost = Number(order.cost);
      const price = Number(order.product_price) || (orderCost > 0 ? Math.round((orderCost / 0.85) * 100) / 100 : 0);
      const isFreeOrder = orderCost === 0 && price > 0;
      const { profit, totalReturn } = calcProduct(price);
      // Free orders: user paid $0, only credit the profit (not cost+profit)
      const creditAmount = isFreeOrder ? Math.round(price * FREE_PROFIT_RATE * 100) / 100 : totalReturn;
      const t = await tx();
      try {
        await t.run("UPDATE store_orders SET status = 'done', amount = ?, processed_at = NOW() WHERE id = ?", [isFreeOrder ? creditAmount : profit, order.id]);
        await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [req.user.id, creditAmount, 'order_profit', 'delivered']);
        await t.commit();
        settled.push({ id: order.id, cost: orderCost, profit: creditAmount, totalReturn: creditAmount });
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
  const activeOrders = await get(
    "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'holding'",
    [store?.id || 0]
  );
  const balance = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?",
    [req.user.id, 'delivered']
  );
  const allTimeEarned = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status IN ('delivered','withdrawn') AND amount > 0",
    [req.user.id]
  );
  // Net profit: income from order_profit + task_reward + commission (exclude admin_adjust)
  const netProfit = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status IN ('delivered','withdrawn') AND amount > 0 AND type IN ('order_profit','task_reward','commission','checkin')",
    [req.user.id]
  );
  // Detailed breakdown by type
  const breakdown = await all(
    "SELECT type, COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status IN ('delivered','withdrawn') AND amount > 0 GROUP BY type ORDER BY total DESC",
    [req.user.id]
  );
  const bal = Number(balance?.total || 0);
  const tomorrowEstimate = Math.round(bal * 1.15 * 100) / 100;

  res.json({
    todayProfit: Number(todayProfit?.total || 0),
    totalProfit: Number(allTimeEarned?.total || 0),
    netProfit: Number(netProfit?.total || 0),
    totalOrders: Number(totalOrders?.c || 0),
    activeOrders: Number(activeOrders?.c || 0),
    balance: bal,
    tomorrowEstimate,
    dailyGoal: 20,
    breakdown: breakdown.map(r => ({ type: r.type, total: Number(r.total) })),
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
    profitRate: 'dynamic',
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
  else dateFilter = ''; // 'all' or any other value = no date filter

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

  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: 'Please open a store first' });

  const cost = Math.round(product.price * (1 - FREE_PROFIT_RATE) * 100) / 100;
  const profit = Math.round(product.price * 0.05 * 100) / 100;
  const totalReturn = Math.round((cost + profit) * 100) / 100;

  // Transaction: atomic free-slot check + create holding
  const lockKey = parseInt(req.user.id) + 2000000;
  const productKey = 'free_claim_prod_' + req.user.id + '_' + today + '_' + productId;
  const t = await tx();
  try {
    await t.run("SELECT pg_advisory_xact_lock($1)", [lockKey]);
    await t.run("INSERT INTO admin_settings (key, value) VALUES ($1, '0') ON CONFLICT (key) DO NOTHING", [countKey]);
    await t.run("INSERT INTO admin_settings (key, value) VALUES ($1, '0') ON CONFLICT (key) DO NOTHING", [productKey]);

    const count = await t.get("SELECT value FROM admin_settings WHERE key = $1", [countKey]);
    const prodCount = await t.get("SELECT value FROM admin_settings WHERE key = $1", [productKey]);
    const used = Number(count?.value || 0);
    if (used >= 5) { await t.rollback(); return res.status(400).json({ error: 'All free orders claimed for today' }); }
    if (Number(prodCount?.value || 0) >= 1) { await t.rollback(); return res.status(400).json({ error: 'You already claimed this product today' }); }

    const sellHours = 6 + Math.random() * 24;
    const sellBy = new Date(Date.now() + sellHours * 3600000).toISOString();
    const result = await t.insert("INSERT INTO store_orders (store_id, user_id, amount, status, processed_at, product_name, product_price) VALUES ($1, $2, 0, 'holding', $3, $4, $5)", [store.id, req.user.id, sellBy, product.name, product.price]);

    await t.run("UPDATE admin_settings SET value = $1 WHERE key = $2", [String(used + 1), countKey]);
    await t.run("UPDATE admin_settings SET value = '1' WHERE key = $1", [productKey]);
    await t.commit();
    try { require('./notifications').notify(req.user.id, '🔥 Free Order Grabbed!', `${product.name} - Profit $${profit}`, 'success'); } catch {}
    res.json({ id: result.id, cost: 0, profit, totalReturn, sellBy, status: 'holding', isFreeOrder: true, remaining: Math.max(0, 5 - used - 1) });
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
    // Atomic deposit increment — avoids lost-update race
    await t.run('UPDATE stores SET deposit = deposit + ? WHERE id = ?', [amount, store.id]);
    await t.commit();
    const newDeposit = Number(store.deposit || 0) + amount;
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

  // Check: active holdings must not exceed remaining deposit (read inside tx)
  const t = await tx();
  try {
    const storeRow = await t.get('SELECT deposit FROM stores WHERE id = ? FOR UPDATE', [store.id]);
    const actualDeposit = Number(storeRow?.deposit || 0);
    const actualWithdraw = Math.min(withdrawAmt, actualDeposit);
    if (actualWithdraw <= 0) { await t.rollback(); return res.status(400).json({ error: 'No deposit to withdraw' }); }

    const maxHolding = await t.get("SELECT COALESCE(MAX(amount), 0) as max_cost FROM store_orders WHERE store_id = ? AND status = 'holding'", [store.id]);
    const newDeposit = actualDeposit - actualWithdraw;
    if (Number(maxHolding?.max_cost || 0) > newDeposit) {
      await t.rollback();
      return res.status(400).json({
        error: `Cannot withdraw: your largest active order costs $${Number(maxHolding.max_cost).toFixed(2)}`,
        detail: `Withdrawing would leave $${newDeposit.toFixed(2)} deposit, but you need at least $${Number(maxHolding.max_cost).toFixed(2)} to cover your active order. Wait for it to sell (6-30 hours), then try again.`,
        maxHoldingCost: Number(maxHolding.max_cost), currentDeposit: actualDeposit, newDeposit, withdrawAmt: actualWithdraw,
      });
    }

    await t.insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)', [req.user.id, actualWithdraw, 'bonus', 'delivered']);
    await t.run('UPDATE stores SET deposit = deposit - ? WHERE id = ?', [actualWithdraw, store.id]);
    await t.commit();
    try { require('./notifications').notify(req.user.id, '🔓 Deposit Returned', `$${actualWithdraw} returned to balance`, 'info'); } catch {}
    res.json({ deposit: newDeposit, maxTrade: newDeposit, returned: actualWithdraw });
  } catch (err) { await t.rollback().catch(() => {}); throw err; }
});

module.exports = router;

