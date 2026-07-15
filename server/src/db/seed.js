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
  const adminCode = generateReferralCode();
  await run(
    'INSERT INTO users (email, phone, password_hash, name, referral_code, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
    ['admin@gift.com', '13800000000', adminHash, 'Admin', adminCode, true]
  );
  console.log('Admin user created: admin@gift.com / admin888');

  const gifts = [
    { name: 'Newcomer Red Packet', description: 'Invite 1 friend to claim. Exclusive newcomer bonus', gift_type: 'cash', required_invites: 1, value: 5, stock: -1, sort_order: 1 },
    { name: 'Starter Red Packet', description: 'Invite 5 friends to claim. A great warm-up', gift_type: 'cash', required_invites: 5, value: 28, stock: -1, sort_order: 2 },
    { name: 'Intermediate Red Packet', description: 'Invite 15 friends to claim. Keep the momentum going', gift_type: 'cash', required_invites: 15, value: 88, stock: -1, sort_order: 3 },
    { name: 'Advanced Red Packet', description: 'Invite 50 friends to claim. Proof of real skill', gift_type: 'cash', required_invites: 50, value: 288, stock: 500, sort_order: 4 },
    { name: 'Elite Red Packet', description: 'Invite 150 friends to claim. Peak glory', gift_type: 'cash', required_invites: 150, value: 888, stock: 100, sort_order: 5 },
    { name: 'Supreme Grand Prize', description: 'Invite 500 friends to claim. A legendary achievement', gift_type: 'cash', required_invites: 500, value: 2888, stock: 50, sort_order: 6 },
  ];

  for (const gift of gifts) {
    await run(
      'INSERT INTO gifts (name, description, gift_type, required_invites, value, stock, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [gift.name, gift.description, gift.gift_type, gift.required_invites, gift.value, gift.stock, gift.sort_order]
    );
  }
  console.log(`${gifts.length} gifts created.`);
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
