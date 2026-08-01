const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config');
const { getDb } = require('./db/database');
const migrate = require('./db/migrate');
const errorHandler = require('./middleware/errorHandler');

// Rate limiter — only applies to API routes; static assets are unlimited
// Route-specific stricter limiters are in auth.js
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, please try again later' } });

// Import routes
const adminPanelRoute = require('./routes/adminPanel');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const giftRoutes = require('./routes/gifts');
const claimRoutes = require('./routes/claims');
const referralRoutes = require('./routes/referral');
const adminRoutes = require('./routes/admin');

async function start() {
  // Initialize database + run migrations + seed
  await getDb();
  await migrate();
  console.log('Database initialized.');
  try {
    await require('./db/seed')();
    console.log('Seed complete.');
  } catch (e) {
    console.log('Seed skipped or already done:', e.message);
  }

  const app = express();

  // Trust the first proxy (Render's load balancer) so req.ip returns real client IP
  app.set('trust proxy', 1);

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }));

  // CORS — allow specific origins + same-origin / non-browser requests
  app.use(cors({
    origin: (requestOrigin, cb) => {
      // Non-browser requests (curl, Postman, same-origin proxy) — allow
      if (!requestOrigin) return cb(null, true);
      if (config.CORS_ORIGIN.includes(requestOrigin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Global rate limit
  app.use('/api', apiLimiter);

  // Admin Panel (original backend standalone)
  app.use('/admin-panel', adminPanelRoute);
  // Agent Panel
  app.use('/agent-panel', require('./routes/agentPanel'));
  // Agent API routes (auth only, no admin required)
  app.use('/api/agent', require('./routes/agent'));

  // Public product catalog (no auth needed)
  app.get('/api/store/products-catalog', (req, res) => {
    try { res.json(require('./data/products.json')); } catch { res.json([]); }
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/gifts', giftRoutes);
  app.use('/api/claims', claimRoutes);
  app.use('/api/tasks', require('./routes/tasks').router);
  app.use('/api/wallet', require('./routes/wallet'));
  app.use('/api/kyc', require('./routes/kyc'));
  app.use('/api/proofs', require('./routes/proofs'));
  app.use('/api/staking', require('./routes/staking'));
  app.use('/api/notifications', require('./routes/notifications').router);
  app.use('/api/withdrawals', require('./routes/withdrawals'));
  app.use('/api/store', require('./routes/store'));
app.use('/api/deposits', require('./routes/deposits'));
app.use('/api/commissions', require('./routes/commissions'));
  app.use('/api/referral', referralRoutes);
  app.use('/api/admin', adminRoutes);

  // Serve static uploads
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // Serve landing page dist
  const landingDist = path.join(__dirname, '..', 'landing-dist');
  const hasLanding = require('fs').existsSync(landingDist);
  if (hasLanding) {
    app.use(express.static(landingDist));
  }

  // Serve the app frontend
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  const hasApp = require('fs').existsSync(clientDist);
  if (hasApp) {
    app.use(express.static(clientDist));
  }

  // Landing page routes (served from landing-dist)
  const landingRoutes = ['/download', '/about', '/faq', '/legal'];
  landingRoutes.forEach(route => {
    app.get(route, (req, res) => {
      if (hasLanding) {
        res.sendFile(path.join(landingDist, 'index.html'));
      }
    });
  });

  // App SPA fallback for all other non-API routes
  app.get(/^\/(?!api\/).*/, (req, res) => {
    if (hasApp) {
      res.sendFile(path.join(clientDist, 'index.html'));
    } else if (hasLanding) {
      res.sendFile(path.join(landingDist, 'index.html'));
    } else {
      res.status(404).send('No frontend available');
    }
  });

  // Temp: public funnel analysis
  app.get('/api/funnel-public', async (req, res) => {
    try {
      const { all, get } = require('./db/database');
      const [total, withStore, withDeposit, withOrder, withMultiple, withKyc, withWithdrawal, active7d, active24h, byCountry, orderDist, withInvites, totalInvites, topRef] = await Promise.all([
        get("SELECT COUNT(*) as c FROM users"),
        get("SELECT COUNT(DISTINCT user_id) as c FROM stores"),
        get("SELECT COUNT(DISTINCT user_id) as c FROM stores WHERE deposit > 0"),
        get("SELECT COUNT(DISTINCT user_id) as c FROM store_orders"),
        get("SELECT COUNT(*) as c FROM (SELECT user_id, COUNT(*) as cnt FROM store_orders GROUP BY user_id HAVING COUNT(*) >= 3) t"),
        get("SELECT COUNT(*) as c FROM kyc_submissions WHERE status = 'approved'"),
        get("SELECT COUNT(DISTINCT user_id) as c FROM withdrawals"),
        get("SELECT COUNT(*) as c FROM users WHERE last_active_at > NOW() - INTERVAL '7 days'"),
        get("SELECT COUNT(*) as c FROM users WHERE last_active_at > NOW() - INTERVAL '24 hours'"),
        all("SELECT phone_prefix, COUNT(*) as cnt FROM users GROUP BY phone_prefix ORDER BY cnt DESC LIMIT 10"),
        all("SELECT CASE WHEN cnt=1 THEN '1' WHEN cnt<=5 THEN '2-5' WHEN cnt<=20 THEN '6-20' ELSE '20+' END as b, COUNT(*) as u FROM (SELECT user_id, COUNT(*) as cnt FROM store_orders GROUP BY user_id) t GROUP BY b ORDER BY MIN(cnt)"),
        get("SELECT COUNT(DISTINCT inviter_id) as c FROM invitations"),
        get("SELECT COUNT(*) as c FROM invitations"),
        get("SELECT u.name, u.email, COUNT(*) as cnt FROM invitations i JOIN users u ON u.id=i.inviter_id GROUP BY u.id,u.name,u.email ORDER BY cnt DESC LIMIT 1"),
      ]);
      const dailyActive = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        const r = await get("SELECT COUNT(*) as c FROM users WHERE last_active_at::date = $1", [d]);
        dailyActive.push({ date: d.slice(5), active: Number(r?.c || 0) });
      }
      res.json({
        funnel: { total_users: Number(total?.c||0), opened_store: Number(withStore?.c||0), made_deposit: Number(withDeposit?.c||0), placed_order: Number(withOrder?.c||0), repeat_orders: Number(withMultiple?.c||0), completed_kyc: Number(withKyc?.c||0), withdrew: Number(withWithdrawal?.c||0) },
        active: { last_24h: Number(active24h?.c||0), last_7d: Number(active7d?.c||0) },
        by_country: byCountry,
        order_distribution: orderDist,
        invites: { inviters: Number(withInvites?.c||0), total: Number(totalInvites?.c||0), top: topRef },
        daily_active: dailyActive,
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Error handler
  app.use(errorHandler);

  app.listen(config.PORT, () => {
    console.log(`Shopee Shopping Operations API running on http://localhost:${config.PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
