const { Router } = require('express');
const authMiddleware = require('../middleware/auth');
const { get, all, run, insert, tx } = require('../db/database');

const router = Router();
router.use(authMiddleware);

const TARGET = 1000.00;
const START_AMOUNT = 999.00;
const COINS_PER_CENT = 10; // 10 coins = $0.01
const COIN_PHASE_THRESHOLD = 0.70; // switch to coins when $0.70 or less remains

// Calculate how much this help should add
function calcHelpAmount(helpCount, currentAmount) {
  const remaining = TARGET - currentAmount;
  if (remaining <= 0) return { amount: 0, coins: 0, phase: 'done' };

  // Still in cash phase?
  if (remaining > COIN_PHASE_THRESHOLD) {
    // Big first few, then decreasing
    let amount;
    if (helpCount === 1) amount = 0.50;
    else if (helpCount <= 3) amount = 0.15 + Math.random() * 0.10;
    else if (helpCount <= 10) amount = 0.05 + Math.random() * 0.10;
    else amount = 0.01 + Math.random() * 0.04;
    amount = Math.min(amount, remaining);
    return { amount: Math.round(amount * 100) / 100, coins: 0, phase: 'cash' };
  }

  // Coin phase — last $0.70 takes coins
  const coins = 1 + Math.floor(Math.random() * 9); // 1-9 coins per help
  const dollarValue = coins / COINS_PER_CENT / 100; // coins to dollars
  return { amount: Math.round(dollarValue * 10000) / 10000, coins, phase: 'coins' };
}

// GET /api/red-envelope — my envelope status
router.get('/', async (req, res) => {
  let env = await get('SELECT * FROM red_envelopes WHERE user_id = ?', [req.user.id]);
  if (!env) {
    // Auto-create envelope for this user
    const result = await insert(
      'INSERT INTO red_envelopes (user_id, current_amount) VALUES (?, ?)',
      [req.user.id, START_AMOUNT]
    );
    env = await get('SELECT * FROM red_envelopes WHERE id = ?', [result.id]);
  }
  // Get helpers
  const helpers = await all(
    `SELECT h.*, u.name as helper_name, u.email as helper_email
     FROM red_envelope_helps h JOIN users u ON u.id = h.helper_user_id
     WHERE h.envelope_id = ? AND h.status = 'confirmed'
     ORDER BY h.created_at DESC LIMIT 50`,
    [env.id]
  );
  res.json({ envelope: env, helpers, coinRate: COINS_PER_CENT });
});

// Reusable help function — called from auth.js on registration
async function recordHelp(inviterId, helperUserId, helperIp) {
  let env = await get('SELECT * FROM red_envelopes WHERE user_id = ? AND status = ?', [inviterId, 'active']);
  if (!env) {
    const result = await insert('INSERT INTO red_envelopes (user_id, current_amount) VALUES (?, ?)', [inviterId, START_AMOUNT]);
    env = await get('SELECT * FROM red_envelopes WHERE id = ?', [result.id]);
  }
  if (Number(env.current_amount) >= TARGET) return { skipped: true, reason: 'already complete' };

  const helper = await get('SELECT * FROM users WHERE id = ?', [helperUserId]);
  if (!helper) return { skipped: true, reason: 'helper not found' };
  if (new Date(helper.created_at) <= new Date(env.created_at)) return { skipped: true, reason: 'helper too old' };

  // IP check
  const sameIp = await get(
    "SELECT COUNT(*) as c FROM red_envelope_helps WHERE helper_ip = ? AND created_at > NOW() - INTERVAL '24 hours' AND helper_user_id != ?",
    [helperIp || '', helperUserId]
  );
  if (Number(sameIp?.c || 0) >= 3) return { skipped: true, reason: 'too many from this IP' };

  // Duplicate check
  const existing = await get('SELECT id FROM red_envelope_helps WHERE envelope_id = ? AND helper_user_id = ?', [env.id, helperUserId]);
  if (existing) return { skipped: true, reason: 'already helped' };

  // KYC check
  const kyc = await get('SELECT status FROM kyc_submissions WHERE user_id = ?', [helperUserId]);
  const kycApproved = kyc && kyc.status === 'approved';

  const { amount, coins, phase } = calcHelpAmount(Number(env.help_count || 0), Number(env.current_amount));

  await insert(
    `INSERT INTO red_envelope_helps (envelope_id, helper_user_id, amount_added, coins_added, helper_ip, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [env.id, helperUserId, amount, coins, helperIp || '', kycApproved ? 'confirmed' : 'pending']
  );

  const newAmount = Math.min(TARGET, Number(env.current_amount) + amount);
  const newCoins = Number(env.coin_count || 0) + coins;
  const newCount = Number(env.help_count || 0) + 1;

  if (kycApproved) {
    await run('UPDATE red_envelopes SET current_amount = ?, coin_count = ?, help_count = ?, phase = ? WHERE id = ?',
      [newAmount, newCoins, newCount, newAmount >= TARGET - 0.001 ? 'done' : phase, env.id]);
  } else {
    await run('UPDATE red_envelopes SET help_count = ? WHERE id = ?', [newCount, env.id]);
  }

  return { success: true, amount, coins, kycApproved };
}
router.recordHelp = recordHelp;

// POST /api/red-envelope/help — called when a NEW user registers via invite link
router.post('/help', async (req, res) => {
  const { helper_user_id } = req.body;
  if (!helper_user_id) return res.status(400).json({ error: 'helper_user_id required' });
  const helper = await get('SELECT * FROM users WHERE id = ?', [helper_user_id]);
  const result = await recordHelp(req.user.id, helper_user_id, helper?.ip_address || '');
  if (result.skipped) return res.status(400).json({ error: result.reason });
  if (result.success) {
    const env = await get('SELECT * FROM red_envelopes WHERE user_id = ? AND status = ?', [req.user.id, 'active']);
    res.json({ help: { amount: result.amount, coins: result.coins, status: result.kycApproved ? 'confirmed' : 'pending', kycRequired: !result.kycApproved }, envelope: env });
  } else {
    res.status(500).json({ error: 'Failed' });
  }
});

// POST /api/red-envelope/claim — transfer $1000 to balance
router.post('/claim', async (req, res) => {
  const env = await get('SELECT * FROM red_envelopes WHERE user_id = ?', [req.user.id]);
  if (!env) return res.status(400).json({ error: 'No envelope found' });
  if (Number(env.current_amount) < TARGET - 0.001) return res.status(400).json({ error: 'Not yet reached $1000' });
  if (env.status === 'claimed') return res.status(400).json({ error: 'Already claimed' });

  await run("UPDATE red_envelopes SET status = 'claimed', claimed_at = NOW() WHERE id = ?", [env.id]);
  await insert('INSERT INTO task_earnings (user_id, amount, type, status) VALUES (?, ?, ?, ?)',
    [req.user.id, TARGET, 'red_envelope', 'delivered']);

  res.json({ claimed: true, amount: TARGET });
});

// Admin: approve KYC → auto-confirm pending helps
async function confirmPendingHelps(userId) {
  const pending = await all(
    `SELECT h.id, h.envelope_id, h.amount_added, h.coins_added, e.user_id as inviter_id
     FROM red_envelope_helps h JOIN red_envelopes e ON e.id = h.envelope_id
     WHERE h.helper_user_id = ? AND h.status = 'pending'`,
    [userId]
  );
  for (const h of pending) {
    await run("UPDATE red_envelope_helps SET status = 'confirmed' WHERE id = ?", [h.id]);
    const env = await get('SELECT * FROM red_envelopes WHERE id = ?', [h.envelope_id]);
    if (env && env.status === 'active') {
      const newAmount = Math.min(TARGET, Number(env.current_amount) + Number(h.amount_added || 0));
      const newCoins = Number(env.coin_count || 0) + Number(h.coins_added || 0);
      const phase = (TARGET - newAmount) <= COIN_PHASE_THRESHOLD ? 'coins' : 'cash';
      await run('UPDATE red_envelopes SET current_amount = ?, coin_count = ?, phase = ? WHERE id = ?',
        [newAmount, newCoins, newAmount >= TARGET - 0.001 ? 'done' : phase, h.envelope_id]);
    }
  }
}

// Export for use by KYC approval route
router.confirmPendingHelps = confirmPendingHelps;

module.exports = router;
