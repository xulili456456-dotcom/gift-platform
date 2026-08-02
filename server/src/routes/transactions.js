const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { all } = require('../db/database');

const router = Router();
router.use(authMiddleware);

const TYPE_LABELS = {
  order_profit: 'Store Order Profit',
  task_reward: 'Task Reward',
  commission: 'Referral Commission',
  checkin: 'Daily Check-in',
  deposit: 'Deposit Confirmed',
  deposit_return: 'Deposit Returned',
  agent_reward: 'Agent Reward',
  staking_refund: 'Staking Refund',
  balance_split: 'Balance Split',
  bonus: 'Legacy Balance',
  ad: 'Ad Reward',
  admin_adjust: 'Admin Adjustment',
};

// GET /api/transactions — full money movement history
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = (page - 1) * limit;
  const typeFilter = req.query.type;

  let typeClause = '';
  const params = [userId];
  if (typeFilter && TYPE_LABELS[typeFilter]) {
    typeClause = 'AND type = ?';
    params.push(typeFilter);
  }

  const countResult = await all(
    `SELECT COUNT(*) as c FROM task_earnings WHERE user_id = ? ${typeClause}`,
    params
  );
  const total = Number(countResult[0]?.c || 0);

  const rows = await all(
    `SELECT id, amount, type, status, created_at
     FROM task_earnings
     WHERE user_id = ? ${typeClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Calculate running balance (from oldest to newest)
  let balance = 0;
  const allForBalance = await all(
    `SELECT id, amount, type, status FROM task_earnings WHERE user_id = ? ORDER BY created_at ASC`,
    [userId]
  );

  // Build a map of id -> cumulative balance
  const balanceMap = {};
  for (const row of allForBalance) {
    if (row.status === 'delivered') balance += Number(row.amount);
    balanceMap[row.id] = balance;
  }

  const transactions = rows.map(r => {
    const detail = { type: r.type };
    return {
      id: r.id,
      amount: Number(r.amount),
      type: r.type,
      typeLabel: TYPE_LABELS[r.type] || r.type,
      status: r.status,
      createdAt: r.created_at,
      balance: balanceMap[r.id] || 0,
      detail,
    };
  });

  // Batch-fetch details for enriched display
  const orderProfitIds = transactions.filter(t => t.type === 'order_profit').map(t => t.id);
  const commissionIds = transactions.filter(t => t.type === 'commission').map(t => t.id);
  const depositIds = transactions.filter(t => t.type === 'deposit').map(t => t.id);
  const taskRewardIds = transactions.filter(t => t.type === 'task_reward').map(t => t.id);

  // Fetch order details for order_profit entries
  if (orderProfitIds.length > 0) {
    const orderRows = await all(
      `SELECT o.id as order_id, o.product_name, o.product_price, o.created_at as buy_time, o.processed_at as sell_time,
              te.id as earning_id
       FROM store_orders o
       JOIN task_earnings te ON te.user_id = o.user_id AND te.type = 'order_profit'
         AND ABS(EXTRACT(EPOCH FROM te.created_at - o.processed_at)) < 5
       WHERE te.id IN (${orderProfitIds.map((_, i) => '?').join(',')})
       ORDER BY o.id DESC`,
      orderProfitIds
    );
    const orderMap = {};
    for (const row of orderRows) {
      const cost = Number(row.product_price) || 0;
      const profit = cost > 0 ? transactions.find(t => t.id === row.earning_id)?.amount || 0 : 0;
      const buyTime = new Date(row.buy_time);
      const sellTime = new Date(row.sell_time);
      const holdHours = Math.round((sellTime - buyTime) / 3600000 * 10) / 10;
      orderMap[row.earning_id] = {
        productName: row.product_name || 'Unknown Product',
        productPrice: cost,
        buyTime: row.buy_time,
        sellTime: row.sell_time,
        holdHours,
        profitRate: cost > 0 ? Math.round((profit / cost) * 100) : 0,
      };
    }
    for (const t of transactions) {
      if (t.type === 'order_profit' && orderMap[t.id]) t.detail = { ...t.detail, ...orderMap[t.id] };
    }
  }

  // Fetch commission details
  if (commissionIds.length > 0) {
    const commRows = await all(
      `SELECT sc.id, sc.product_name, sc.product_price, sc.commission, sc.status
       FROM share_commissions sc
       JOIN task_earnings te ON te.user_id = sc.sharer_id AND te.type = 'commission'
         AND ABS(EXTRACT(EPOCH FROM te.created_at - sc.created_at)) < 5
       WHERE te.id IN (${commissionIds.map((_, i) => '?').join(',')})
       ORDER BY sc.id DESC`,
      commissionIds
    );
    const commMap = {};
    for (const row of commRows) {
      commMap[row.id] = {
        productName: row.product_name,
        productPrice: Number(row.product_price),
        commission: Number(row.commission),
        commissionRate: '3%',
      };
    }
    for (const t of transactions) {
      if (t.type === 'commission') {
        const match = Object.values(commMap).find(c =>
          Math.abs(c.commission - t.amount) < 0.01
        );
        if (match) t.detail = { ...t.detail, ...match };
      }
    }
  }

  // Fetch deposit details
  if (depositIds.length > 0) {
    const depRows = await all(
      `SELECT d.id, d.network, d.tx_hash, d.amount
       FROM deposits d
       JOIN task_earnings te ON te.user_id = d.user_id AND te.type = 'deposit'
         AND ABS(EXTRACT(EPOCH FROM te.created_at - d.confirmed_at)) < 60
       WHERE te.id IN (${depositIds.map((_, i) => '?').join(',')})`,
      depositIds
    );
    const depMap = {};
    for (const row of depRows) {
      depMap[row.id] = { network: row.network, txHash: row.tx_hash };
    }
    for (const t of transactions) {
      if (t.type === 'deposit') {
        const match = Object.values(depMap).find(d => Math.abs(d.amount || 0 - t.amount) < 0.01 || true);
        if (match) t.detail = { ...t.detail, network: match.network, txHash: match.txHash };
      }
    }
  }

  // Fetch task reward details
  if (taskRewardIds.length > 0) {
    const taskRows = await all(
      `SELECT trl.id, trl.task_title, trl.task_type, trl.amount
       FROM task_reward_log trl
       JOIN task_earnings te ON te.user_id = trl.user_id AND te.type = 'task_reward'
         AND ABS(EXTRACT(EPOCH FROM te.created_at - trl.created_at)) < 5
       WHERE te.id IN (${taskRewardIds.map((_, i) => '?').join(',')})`,
      taskRewardIds
    );
    const taskMap = {};
    for (const row of taskRows) {
      taskMap[row.id] = { taskTitle: row.task_title, taskType: row.task_type };
    }
    for (const t of transactions) {
      if (t.type === 'task_reward') {
        const match = Object.values(taskMap).find(tm => Math.abs(tm.amount || 0 - t.amount) < 0.01 || true);
        if (match) t.detail = { ...t.detail, taskTitle: match.taskTitle, taskType: match.taskType };
      }
    }
  }

  res.json({
    transactions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    types: Object.keys(TYPE_LABELS).map(k => ({ key: k, label: TYPE_LABELS[k] })),
  });
});

module.exports = router;
