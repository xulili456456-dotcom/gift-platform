const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, all, run, insert } = require('../db/database');

const router = Router();
router.use(authMiddleware);

const TIERS = {
  small:  { name: '小店', deposit: 10,  dailyOrders: 10, minReward: 0.05, maxReward: 0.3 },
  medium: { name: '中店', deposit: 50,  dailyOrders: 20, minReward: 0.1,  maxReward: 0.5 },
  large:  { name: '大店', deposit: 200, dailyOrders: 40, minReward: 0.2,  maxReward: 1.0 },
};

// GET /api/store/tiers — get tier info
router.get('/tiers', (req, res) => {
  res.json(TIERS);
});

// GET /api/store/status — my store status
router.get('/status', async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.json({ hasStore: false });

  const today = new Date().toISOString().slice(0, 10);
  const doneToday = await get(
    "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store.id, today]
  );
  const tier = TIERS[store.tier];

  // Today's earnings
  const earnings = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store.id, today]
  );

  res.json({
    hasStore: true,
    store: {
      ...store,
      tierName: tier.name,
      dailyOrders: tier.dailyOrders,
      minReward: tier.minReward,
      maxReward: tier.maxReward,
      doneToday: Number(doneToday?.c) || 0,
      todayEarnings: Number(earnings?.total) || 0,
      remaining: Math.max(0, tier.dailyOrders - (Number(doneToday?.c) || 0)),
    },
  });
});

// POST /api/store/open — open a store
router.post('/open', async (req, res) => {
  const { tier } = req.body;
  const plan = TIERS[tier];
  if (!plan) return res.status(400).json({ error: '无效的店铺等级，可选: small, medium, large' });

  const existing = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (existing) return res.status(400).json({ error: '你已有一家店铺在运营中' });

  // Check balance (from task_earnings + user_gifts)
  const taskBal = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM task_earnings WHERE user_id = ? AND status = ?",
    [req.user.id, 'delivered']
  );
  const giftBal = await get(
    `SELECT COALESCE(SUM(g.value), 0) as total FROM user_gifts ug JOIN gifts g ON g.id = ug.gift_id WHERE ug.user_id = ? AND ug.status = ?`,
    [req.user.id, 'delivered']
  );
  const available = Number(taskBal?.total || 0) + Number(giftBal?.total || 0);

  if (available < plan.deposit) {
    return res.status(400).json({ error: `余额不足！需要 $${plan.deposit}，当前可用 $${available.toFixed(2)}` });
  }

  // Deduct deposit from task_earnings
  let remaining = plan.deposit;
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

  const result = await insert(
    'INSERT INTO stores (user_id, tier, deposit) VALUES (?, ?, ?)',
    [req.user.id, tier, plan.deposit]
  );

  require('./notifications').notify(req.user.id, '🏪 开店成功！', `${plan.name}已开业，每天可处理 ${plan.dailyOrders} 笔订单`, 'success');
  res.status(201).json({ id: result.id, tier, deposit: plan.deposit, dailyOrders: plan.dailyOrders });
});

// POST /api/store/close — close store
router.post('/close', async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: '你没有运营中的店铺' });

  const daysOpen = (Date.now() - new Date(store.opened_at).getTime()) / 86400000;
  const penalty = daysOpen < 7 ? Number((Number(store.deposit) * 0.2).toFixed(2)) : 0;
  const refund = Number(store.deposit) - penalty;

  await run("UPDATE stores SET status = 'closed', closed_at = NOW() WHERE id = ?", [store.id]);

  // Refund to task_earnings
  if (refund > 0) {
    await insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
      [req.user.id, refund, 'bonus', 'delivered']);
  }

  const msg = penalty > 0
    ? `押金 $${Number(store.deposit)}，扣20%手续费($${penalty})，退回 $${refund}`
    : `押金 $${Number(store.deposit)} 全额退回`;

  require('./notifications').notify(req.user.id, '🏪 店铺已关闭', msg, 'info');
  res.json({ refund, penalty, message: msg });
});

// GET /api/store/orders/today — get today's orders status
router.get('/orders/today', async (req, res) => {
  const store = await get('SELECT * FROM stores WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
  if (!store) return res.status(400).json({ error: '请先开店' });

  const tier = TIERS[store.tier];
  const today = new Date().toISOString().slice(0, 10);

  const doneToday = await get(
    "SELECT COUNT(*) as c FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store.id, today]
  );
  const earnings = await get(
    "SELECT COALESCE(SUM(amount), 0) as total FROM store_orders WHERE store_id = ? AND status = 'done' AND created_at::date = ?::date",
    [store.id, today]
  );

  const remaining = Math.max(0, tier.dailyOrders - (Number(doneToday?.c) || 0));

  res.json({
    tier: store.tier,
    tierName: tier.name,
    dailyOrders: tier.dailyOrders,
    doneToday: Number(doneToday?.c) || 0,
    remaining,
    todayEarnings: Number(earnings?.total) || 0,
    minReward: tier.minReward,
    maxReward: tier.maxReward,
  });
});

// POST /api/store/orders/process — process one order
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

  // Random reward within tier range
  const amount = Math.round((tier.minReward + Math.random() * (tier.maxReward - tier.minReward)) * 100) / 100;

  // Create order record as done
  const result = await insert(
    "INSERT INTO store_orders (store_id, user_id, amount, status, processed_at) VALUES (?, ?, ?, 'done', NOW())",
    [store.id, req.user.id, amount]
  );

  // Also credit to task_earnings
  await insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
    [req.user.id, amount, 'bonus', 'delivered']);

  const remaining = Math.max(0, tier.dailyOrders - (Number(doneToday?.c || 0) + 1));

  res.json({
    id: result.id,
    amount,
    remaining,
    totalDone: Number(doneToday?.c || 0) + 1,
    dailyOrders: tier.dailyOrders,
  });
});

module.exports = router;
