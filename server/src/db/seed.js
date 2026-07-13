const { getDb, run, get, closeDb } = require('./database');
const migrate = require('./migrate');
const { hashPassword } = require('../utils/password');
const { generateReferralCode } = require('../utils/referralCode');

async function seed() {
  console.log('Running seed...');
  await migrate();
  const db = await getDb();

  // Check if admin already exists
  const admin = get('SELECT id FROM users WHERE is_admin = 1 LIMIT 1');
  if (admin) {
    console.log('Seed data already exists. Skipping user/gift creation.');
    closeDb();
    return;
  }

  // Create admin user
  const adminHash = await hashPassword('admin888');
  const adminCode = generateReferralCode();
  run(
    'INSERT INTO users (email, phone, password_hash, name, referral_code, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
    ['admin@gift.com', '13800000000', adminHash, '管理员', adminCode, 1]
  );
  console.log('Admin user created: admin@gift.com / admin888');

  // Create sample gifts (cash red packets primarily)
  const gifts = [
    {
      name: '新人红包',
      description: '邀请1位好友即可领取，新人专享福利',
      gift_type: 'cash',
      required_invites: 1,
      value: 5,
      stock: -1,
      sort_order: 1,
    },
    {
      name: '初级红包',
      description: '邀请5位好友即可领取，小试牛刀',
      gift_type: 'cash',
      required_invites: 5,
      value: 28,
      stock: -1,
      sort_order: 2,
    },
    {
      name: '中级红包',
      description: '邀请15位好友即可领取，越战越勇',
      gift_type: 'cash',
      required_invites: 15,
      value: 88,
      stock: -1,
      sort_order: 3,
    },
    {
      name: '高级红包',
      description: '邀请50位好友即可领取，实力见证',
      gift_type: 'cash',
      required_invites: 50,
      value: 288,
      stock: 500,
      sort_order: 4,
    },
    {
      name: '顶级红包',
      description: '邀请150位好友即可领取，巅峰荣耀',
      gift_type: 'cash',
      required_invites: 150,
      value: 888,
      stock: 100,
      sort_order: 5,
    },
    {
      name: '至尊大奖',
      description: '邀请500位好友即可领取，传奇成就',
      gift_type: 'cash',
      required_invites: 500,
      value: 2888,
      stock: 50,
      sort_order: 6,
    },
  ];

  for (const gift of gifts) {
    run(
      'INSERT INTO gifts (name, description, gift_type, required_invites, value, stock, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [gift.name, gift.description, gift.gift_type, gift.required_invites, gift.value, gift.stock, gift.sort_order]
    );
  }
  console.log(`${gifts.length} gifts created.`);

  closeDb();
  console.log('Seed complete.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
