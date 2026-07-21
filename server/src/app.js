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

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }));

  // CORS
  app.use(cors({
    origin: config.CORS_ORIGIN,
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
  const landingRoutes = ['/', '/download', '/about', '/faq', '/legal'];
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
