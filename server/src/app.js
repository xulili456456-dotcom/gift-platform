const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const { getDb } = require('./db/database');
const migrate = require('./db/migrate');
const errorHandler = require('./middleware/errorHandler');

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

  // Admin Panel Page (backend standalone)
  app.use('/admin-panel', adminPanelRoute);

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/gifts', giftRoutes);
  app.use('/api/claims', claimRoutes);
  app.use('/api/tasks', require('./routes/tasks'));
  app.use('/api/wallet', require('./routes/wallet'));
  app.use('/api/kyc', require('./routes/kyc'));
  app.use('/api/proofs', require('./routes/proofs'));
  app.use('/api/staking', require('./routes/staking'));
  app.use('/api/notifications', require('./routes/notifications').router);
  app.use('/api/withdrawals', require('./routes/withdrawals'));
  app.use('/api/store', require('./routes/store'));
  app.use('/api/referral', referralRoutes);
  app.use('/api/admin', adminRoutes);

  // Serve static uploads
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // Serve the built frontend (SPA for all non-API routes)
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (require('fs').existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api\/).*/, (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Error handler
  app.use(errorHandler);

  app.listen(config.PORT, () => {
    console.log(`Gift Platform API running on http://localhost:${config.PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
