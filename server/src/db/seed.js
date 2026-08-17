const { getDb, run, get, closeDb } = require('./database');
const migrate = require('./migrate');
const { hashPassword } = require('../utils/password');
const { generateReferralCode } = require('../utils/referralCode');

async function seed() {
  console.log('Running seed...');

  // Check if admin already exists
  const admin = await get('SELECT id FROM users WHERE is_admin = true LIMIT 1');
  if (admin) {
    console.log('Seed data already exists. Skipping user/gift creation.');
    return;
  }

  // Create admin user
  const adminHash = await hashPassword('admin888');
  const adminCode = await generateReferralCode();
  await run(
    'INSERT INTO users (email, phone, password_hash, name, referral_code, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
    ['admin@gift.com', '13800000000', adminHash, 'Admin', adminCode, true]
  );
  console.log('Admin user created: admin@gift.com / admin888');
}

// Run directly if called as script
if (require.main === module) {
  migrate().then(() => getDb()).then(() => seed()).then(() => closeDb()).then(() => {
    console.log('Seed complete.');
  }).catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}

module.exports = seed;
