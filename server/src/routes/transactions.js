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
  bonus: 'Deposit / Adjustment',
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

  const transactions = rows.map(r => ({
    id: r.id,
    amount: Number(r.amount),
    type: r.type,
    typeLabel: TYPE_LABELS[r.type] || r.type,
    status: r.status,
    createdAt: r.created_at,
    balance: balanceMap[r.id] || 0,
  }));

  res.json({
    transactions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    types: Object.keys(TYPE_LABELS).map(k => ({ key: k, label: TYPE_LABELS[k] })),
  });
});

module.exports = router;
