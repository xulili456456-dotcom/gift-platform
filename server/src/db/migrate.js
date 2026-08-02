const { getDb, exec, get, run, all, closeDb } = require('./database');

const schema = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(100) NOT NULL DEFAULT '',
    avatar_url      TEXT DEFAULT '',
    referral_code   VARCHAR(20) NOT NULL UNIQUE,
    parent_id       INTEGER DEFAULT NULL,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id              SERIAL PRIMARY KEY,
    inviter_id      INTEGER NOT NULL,
    invitee_id      INTEGER NOT NULL,
    level           INTEGER NOT NULL CHECK(level >= 1 AND level <= 3),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(inviter_id, invitee_id, level)
);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitee ON invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_invitations_level ON invitations(level);

-- Gifts table
CREATE TABLE IF NOT EXISTS gifts (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    image_url       TEXT DEFAULT '',
    required_invites INTEGER NOT NULL DEFAULT 0,
    gift_type       TEXT NOT NULL CHECK(gift_type IN ('cash', 'physical', 'virtual')),
    value           NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock           INTEGER NOT NULL DEFAULT -1,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gifts_required ON gifts(required_invites);

-- User gifts (claimed rewards)
CREATE TABLE IF NOT EXISTS user_gifts (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    gift_id         INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'claimed', 'delivered', 'rejected')),
    claimed_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    delivered_at    TIMESTAMP DEFAULT NULL,
    admin_note      TEXT DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (gift_id) REFERENCES gifts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_gifts_user ON user_gifts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gifts_status ON user_gifts(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_gifts_uniq ON user_gifts(user_id, gift_id);

-- KYC submissions
CREATE TABLE IF NOT EXISTS kyc_submissions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE,
    doc_type        TEXT NOT NULL DEFAULT 'driver_license',
    real_name       TEXT NOT NULL,
    id_number       TEXT NOT NULL,
    front_image     TEXT,
    back_image      TEXT,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    admin_note      TEXT DEFAULT '',
    submitted_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL DEFAULT '',
    type            TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info','success','warning','error')),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Staking records
CREATE TABLE IF NOT EXISTS stakes (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    amount          NUMERIC(10,2) NOT NULL,
    plan_id         TEXT NOT NULL DEFAULT 'basic',
    bonus           NUMERIC(10,2) NOT NULL DEFAULT 1.5,
    locked_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    unlock_at       TIMESTAMP NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'unlocked')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stakes_one_active ON stakes(user_id) WHERE status = 'active';

-- Invite verification proofs
CREATE TABLE IF NOT EXISTS invite_proofs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    image           TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    admin_note      TEXT DEFAULT '',
    submitted_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE,
    address         TEXT NOT NULL,
    network         TEXT NOT NULL DEFAULT 'trc20',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Task earnings table
CREATE TABLE IF NOT EXISTS task_earnings (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
    type            TEXT NOT NULL CHECK(type IN ('checkin', 'ad', 'bonus')),
    status          TEXT NOT NULL DEFAULT 'delivered' CHECK(status IN ('delivered', 'withdrawn')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_earnings_user ON task_earnings(user_id);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    amount          NUMERIC(10,2) NOT NULL,
    network         TEXT NOT NULL DEFAULT 'trc20',
    wallet_address  TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'rejected')),
    deducted_ids    TEXT DEFAULT '',
    admin_note      TEXT DEFAULT '',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Store (simulated e-commerce)
CREATE TABLE IF NOT EXISTS stores (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE,
    tier            TEXT NOT NULL CHECK(tier IN ('small', 'medium', 'large')),
    deposit         NUMERIC(10,2) NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed')),
    opened_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_stores_user ON stores(user_id);

-- Store orders (daily e-commerce tasks)
CREATE TABLE IF NOT EXISTS store_orders (
    id              SERIAL PRIMARY KEY,
    store_id        INTEGER NOT NULL,
    user_id         INTEGER NOT NULL,
    amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'done', 'holding')),
    processed_at    TIMESTAMP DEFAULT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_store_orders_user_date ON store_orders(user_id, created_at);

-- Admin settings
CREATE TABLE IF NOT EXISTS admin_settings (
    key             VARCHAR(255) PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

const defaultSettings = `
INSERT INTO admin_settings (key, value) VALUES ('max_referral_level', '3')
ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_settings (key, value) VALUES ('level_1_rate', '1.0')
ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_settings (key, value) VALUES ('level_2_rate', '0.5')
ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_settings (key, value) VALUES ('level_3_rate', '0.25')
ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_settings (key, value) VALUES ('platform_name', 'Shopee Shopping Operations')
ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_settings (key, value) VALUES ('platform_share_title', 'Invite friends, win great gifts!')
ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_settings (key, value) VALUES ('platform_share_desc', 'Complete tasks, trade products, earn cash on Shopee Shopping Operations')
ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_settings (key, value) VALUES ('deposit_address_trc20', 'TC9f9MHJ3S646EtyuLmnhtK7z8v6UvmANf')
ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_settings (key, value) VALUES ('deposit_address_erc20', '')
ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_settings (key, value) VALUES ('deposit_address_bep20', '')
ON CONFLICT (key) DO NOTHING;
`;

// Add deposits table
const depositsSchema = `
CREATE TABLE IF NOT EXISTS deposits (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    network         TEXT NOT NULL DEFAULT 'trc20' CHECK(network IN ('trc20','erc20','bep20')),
    amount          NUMERIC(10,2) NOT NULL,
    tx_hash         TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected')),
    admin_note      TEXT DEFAULT '',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    confirmed_at    TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
`;

const commissionsSchema = `
CREATE TABLE IF NOT EXISTS share_commissions (
    id              SERIAL PRIMARY KEY,
    sharer_id       INTEGER NOT NULL,
    product_name    TEXT NOT NULL DEFAULT '',
    product_price   NUMERIC(10,2) NOT NULL,
    commission      NUMERIC(10,2) NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','credited')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (sharer_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_share_commissions_user ON share_commissions(sharer_id);
`;

async function migrate() {
  console.log('Running database migrations...');
  await getDb();
  // Force UTF-8 encoding on the database
  try { await exec(`SET client_encoding TO 'UTF8'`); } catch (e) {}
  try {
    const { getPool } = require('./database');
    const dbName = (await getPool().query('SELECT current_database() as name')).rows[0].name;
    await exec(`ALTER DATABASE "${dbName}" SET client_encoding TO 'UTF8'`);
  } catch (e) { console.log('ALTER DATABASE skipped:', e.message); }
  await exec(schema);
  try { await exec(depositsSchema); } catch (e) { console.log('Deposits migration skipped:', e.message); }
  try { await exec(commissionsSchema); } catch (e) { console.log('Commissions migration skipped:', e.message); }
  // Fix: add 'holding' to store_orders status CHECK constraint
  try { await exec(`ALTER TABLE store_orders DROP CONSTRAINT IF EXISTS store_orders_status_check`); } catch (e) {}
  try { await exec(`ALTER TABLE store_orders ADD CONSTRAINT store_orders_status_check CHECK(status IN ('pending', 'done', 'holding'))`); } catch (e) { console.log('Store orders constraint update skipped:', e.message); }
  // Add product_name column
  try { await exec(`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT ''`); } catch (e) { console.log('product_name column skipped:', e.message); }
  try { await exec(`ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS product_price NUMERIC(10,2) DEFAULT 0`); } catch (e) { console.log('product_price column skipped:', e.message); }
  // Add IP tracking to users
  try { await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) DEFAULT ''`); } catch (e) { console.log('ip_address column skipped:', e.message); }
  // Add frozen flag to users
  try { await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS frozen BOOLEAN DEFAULT FALSE`); } catch (e) { console.log('frozen column skipped:', e.message); }
  // Transaction requests (deposit/withdrawal approval)
  try {
    await exec(`CREATE TABLE IF NOT EXISTS transaction_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal')),
      amount NUMERIC(10,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      admin_note TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
  } catch (e) { console.log('Transaction requests migration skipped:', e.message); }
  // Admin notes on users
  try { await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT ''`); } catch (e) { console.log('admin_notes skipped:', e.message); }
  // Transaction PIN
  try { await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tx_pin TEXT DEFAULT NULL`); } catch (e) { console.log('tx_pin skipped:', e.message); }
  // Task system tables
  try {
    await exec(`CREATE TABLE IF NOT EXISTS task_definitions (id SERIAL PRIMARY KEY,task_type TEXT NOT NULL,category TEXT DEFAULT 'trading',title TEXT NOT NULL,description TEXT DEFAULT '',icon TEXT DEFAULT '📦',icon_bg TEXT DEFAULT '#FFF5F0',target_count INTEGER DEFAULT 0,target_value NUMERIC DEFAULT 0,reward NUMERIC NOT NULL DEFAULT 0,reward_color TEXT DEFAULT '#FF5000',reset_period TEXT DEFAULT 'daily',sort_order INTEGER DEFAULT 0,active BOOLEAN DEFAULT TRUE)`);
    await exec(`CREATE TABLE IF NOT EXISTS task_progress (id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL,task_def_id INTEGER,task_type TEXT NOT NULL,current_count INTEGER DEFAULT 0,current_value NUMERIC DEFAULT 0,completed BOOLEAN DEFAULT FALSE,claimed BOOLEAN DEFAULT FALSE,claimed_at TIMESTAMP DEFAULT NULL,period_key TEXT NOT NULL DEFAULT '',FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
    await exec(`CREATE TABLE IF NOT EXISTS task_reward_log (id SERIAL PRIMARY KEY,user_id INTEGER NOT NULL,task_type TEXT,task_title TEXT,amount NUMERIC NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  } catch (e) { console.log('Task tables migration skipped:', e.message); }
  // IP log table
  try { await exec(`CREATE TABLE IF NOT EXISTS ip_log (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, ip_address TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`); } catch(e) { console.log('IP log migration skipped:', e.message); }
  try { await exec(`CREATE INDEX IF NOT EXISTS idx_ip_log_user ON ip_log(user_id)`); } catch(e) { console.log('IP log index skipped:', e.message); }
  try { await exec(`CREATE INDEX IF NOT EXISTS idx_ip_log_ip ON ip_log(ip_address)`); } catch(e) { console.log('IP log ip index skipped:', e.message); }
  // Last active & risk tracking
  try { await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT NULL`); } catch(e) { console.log('last_active_at skipped:', e.message); }
  try { await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_tags TEXT DEFAULT ''`); } catch(e) { console.log('risk_tags skipped:', e.message); }
  try { await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_prefix VARCHAR(10) DEFAULT '+1'`); } catch(e) { console.log('phone_prefix skipped:', e.message); }
  // Update notification type constraint to include 'error'
  try { await exec(`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check`); } catch(e) {}
  try { await exec(`ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK(type IN ('info','success','warning','error'))`); } catch(e) { console.log('notification type constraint update skipped:', e.message); }
  // Add specific earning types for better categorization
  try { await exec(`ALTER TABLE task_earnings DROP CONSTRAINT IF EXISTS task_earnings_type_check`); } catch(e) {}
  try { await exec(`ALTER TABLE task_earnings ADD CONSTRAINT task_earnings_type_check CHECK(type IN ('checkin','ad','bonus','order_profit','admin_adjust','task_reward','commission','deposit','deposit_return','agent_reward','staking_refund','balance_split'))`); } catch(e) { console.log('type constraint update skipped:', e.message); }
  // Agent system
  try { await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_agent BOOLEAN DEFAULT FALSE`); } catch(e) { console.log('is_agent skipped:', e.message); }
  try { await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_commission NUMERIC DEFAULT 0.5`); } catch(e) { console.log('agent_commission skipped:', e.message); }
  try { await exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_quota NUMERIC DEFAULT 0`); } catch(e) { console.log('agent_quota skipped:', e.message); }
  try { await exec(`CREATE TABLE IF NOT EXISTS agent_operations (id SERIAL PRIMARY KEY, agent_id INTEGER NOT NULL, target_user_id INTEGER, action TEXT NOT NULL, amount NUMERIC DEFAULT 0, detail TEXT DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE)`); } catch(e) { console.log('agent_operations skipped:', e.message); }
  // Seed default tasks
  try {
    const hasTasks = await get('SELECT id FROM task_definitions LIMIT 1');
    if (!hasTasks) {
      const taskList = [
        ['daily_order_5','trading','Complete 5 Orders Today','Finish any 5 product purchases before midnight','📦','#FFF5F0',5,0,2.50,'#FF5000','daily',1],
        ['high_value_order','trading','Place a High-Value Order','Complete a single order worth $100 or more','💎','#FCE4EC',1,100,5.00,'#E04500','daily',2],
        ['speed_trade','trading','Speed Trade Challenge','Complete an order within 2 hours of purchase','⚡','#FFF8E1',1,0,3.00,'#F59E0B','daily',3],
        ['category_explorer','trading','Try All Categories','Trade at least 1 product from each category','🌈','#E3F2FD',5,0,4.00,'#2196F3','weekly',4],
        ['profit_streak','trading','Profit Streak','5 consecutive orders all with positive profit','📈','#E8F5E9',5,0,4.00,'#00A86B','daily',5],
        ['bargain_hunter','trading','Bargain Hunter','Complete an order under $20 with 15%+ profit','🔍','#FFF0F0',1,0,2.00,'#E04500','daily',6],
        ['weekend_warrior','trading','Weekend Warrior','Complete 5 orders on Saturday or Sunday','🎯','#FFF8E1',5,0,6.00,'#F59E0B','weekly',7],
        ['product_review','trading','Write Product Reviews','Review 3 products you have purchased','✍️','#E8F5E9',3,0,0.80,'#FF5000','daily',8],
        ['social_share','trading','Share Your Best Deal','Share a completed order profit on social media','🔄','#F3E5F5',2,0,0.30,'#FF5000','daily',9],
        ['first_deposit','deposit','First Deposit Bonus','Make your first deposit of $50+','🎉','#E8F5E9',1,0,5.00,'#00A86B','one_time',10],
        ['deposit_500','deposit','Deposit Milestone: $500','Reach $500 total deposits','🏦','#FFF5F0',0,500,3.00,'#FF5000','milestone',11],
        ['first_withdrawal','deposit','First Withdrawal','Complete KYC and make your first withdrawal','💸','#FFF0F0',1,0,2.00,'#E04500','one_time',12],
        ['invite_3_weekly','referral','Invite 3 Friends This Week','Get 3 new people to register with your code','👥','#FFF5F0',3,0,3.00,'#FF5000','weekly',13],
        ['referral_trade','referral','Referral Makes First Trade','Have a referred friend complete their first order','💰','#E8F5E9',1,0,2.00,'#00A86B','milestone',14],
        ['first_order','trading','Complete First Trade','Finish your very first trading order','🎓','#FFF0F0',1,0,3.00,'#00A86B','one_time',15],
        ['kyc_complete','trading','Complete KYC Verification','Verify your identity to unlock full features','🛡️','#E8F5E9',1,0,2.00,'#FF5000','one_time',16]
      ];
      for (const t of taskList) {
        await run('INSERT INTO task_definitions (task_type,category,title,description,icon,icon_bg,target_count,target_value,reward,reward_color,reset_period,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', t);
      }
      console.log('Seeded '+taskList.length+' default tasks.');
    }
  } catch (e) { console.log('Task seed skipped:', e.message); }
  // Admin audit log
  try {
    await exec(`CREATE TABLE IF NOT EXISTS admin_audit_log (
      id SERIAL PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_user_id INTEGER,
      detail TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
  } catch (e) { console.log('Audit log migration skipped:', e.message); }
  await exec(defaultSettings);
  // One-time cleanup: remove legacy Chinese notifications
  try {
    await exec(`DELETE FROM notifications WHERE title ~ '[\\u4e00-\\u9fff]' OR body ~ '[\\u4e00-\\u9fff]'`);
  } catch (e) { console.log('Notification cleanup skipped:', e.message); }
  // Set deposit addresses if not configured
  try {
    await exec(`UPDATE admin_settings SET value = 'TC9f9MHJ3S646EtyuLmnhtK7z8v6UvmANf' WHERE key = 'deposit_address_trc20' AND (value = '' OR value IS NULL)`);
  } catch (e) { console.log('Deposit address update skipped:', e.message); }
  // One-time cleanup: update legacy Chinese platform settings
  try {
    await exec(`UPDATE admin_settings SET value = 'Shopee Shopping Operations' WHERE key = 'platform_name' AND value ~ '[\\u4e00-\\u9fff]'`);
    await exec(`UPDATE admin_settings SET value = 'Invite friends, earn rewards on Shopee Shopping Operations' WHERE key = 'platform_share_title' AND value ~ '[\\u4e00-\\u9fff]'`);
    await exec(`UPDATE admin_settings SET value = 'Complete tasks, trade products, earn cash on Shopee Shopping Operations' WHERE key = 'platform_share_desc' AND value ~ '[\\u4e00-\\u9fff]'`);
  } catch (e) { console.log('Settings cleanup skipped:', e.message); }
  // One-time cleanup: update legacy Chinese gift names to English
  try {
    await exec(`UPDATE gifts SET name = 'Newcomer Red Packet', description = 'Invite 1 friend to claim, newcomer exclusive' WHERE name ~ '新人'`);
    await exec(`UPDATE gifts SET name = 'Starter Red Packet', description = 'Invite 5 friends to claim' WHERE name ~ '初级'`);
    await exec(`UPDATE gifts SET name = 'Intermediate Red Packet', description = 'Invite 15 friends to claim' WHERE name ~ '中级'`);
    await exec(`UPDATE gifts SET name = 'Advanced Red Packet', description = 'Invite 50 friends to claim' WHERE name ~ '高级'`);
    await exec(`UPDATE gifts SET name = 'Elite Red Packet', description = 'Invite 150 friends to claim' WHERE name ~ '顶级'`);
    await exec(`UPDATE gifts SET name = 'Supreme Grand Prize', description = 'Invite 500 friends to claim, legendary achievement' WHERE name ~ '至尊'`);
  } catch (e) { console.log('Gifts cleanup skipped:', e.message); }
  // Convert existing referral codes to numeric (100001, 100002...)
  try {
    const nonNumeric = await all("SELECT id FROM users WHERE NOT (referral_code ~ '^[0-9]+$') ORDER BY id");
    if (nonNumeric.length > 0) {
      console.log('Converting '+nonNumeric.length+' referral codes to numeric...');
      let maxCode = 100000;
      for (let i = 0; i < nonNumeric.length; i++) {
        const newCode = String(100001 + i);
        await run('UPDATE users SET referral_code = ? WHERE id = ?', [newCode, nonNumeric[i].id]);
        maxCode = 100001 + i;
      }
      await run("INSERT INTO admin_settings (key, value) VALUES ('referral_counter', ?) ON CONFLICT (key) DO UPDATE SET value = ?", [String(maxCode), String(maxCode)]);
      console.log('Converted '+nonNumeric.length+' referral codes. Counter set to '+maxCode);
    } else {
      console.log('All referral codes already numeric.');
    }
  } catch (e) { console.log('Referral code conversion error:', e.message); }
  // One-time cleanup: clear bogus IPs captured before trust-proxy was enabled
  // These are internal/Render proxy IPs, not real client IPs
  try {
    const bogusPattern = `ip_address IN ('127.0.0.1','::1','::ffff:127.0.0.1','0.0.0.0','undefined') OR ip_address LIKE '10.%' OR ip_address LIKE '::ffff:10.%' OR ip_address LIKE '172.16.%' OR ip_address LIKE '172.17.%' OR ip_address LIKE '172.18.%' OR ip_address LIKE '172.19.%' OR ip_address LIKE '172.20.%' OR ip_address LIKE '172.21.%' OR ip_address LIKE '172.22.%' OR ip_address LIKE '172.23.%' OR ip_address LIKE '172.24.%' OR ip_address LIKE '172.25.%' OR ip_address LIKE '172.26.%' OR ip_address LIKE '172.27.%' OR ip_address LIKE '172.28.%' OR ip_address LIKE '172.29.%' OR ip_address LIKE '172.30.%' OR ip_address LIKE '172.31.%' OR ip_address LIKE '192.168.%' OR ip_address LIKE '::ffff:172.%' OR ip_address LIKE '::ffff:192.168.%'`;
    const userResult = await all(`SELECT id, ip_address FROM users WHERE ${bogusPattern}`);
    if (userResult.length > 0) {
      await exec(`UPDATE users SET ip_address = '' WHERE ${bogusPattern}`);
      console.log('Cleared ' + userResult.length + ' bogus user IPs (proxy/localhost -> empty)');
    }
    const logResult = await all(`SELECT id FROM ip_log WHERE ${bogusPattern}`);
    if (logResult.length > 0) {
      await exec(`DELETE FROM ip_log WHERE ${bogusPattern}`);
      console.log('Deleted ' + logResult.length + ' bogus login IP log entries');
    }
  } catch (e) { console.log('IP cleanup skipped:', e.message); }
  // Record the trust-proxy fix timestamp so frontend can distinguish trusted vs legacy IPs
  try {
    await exec(`INSERT INTO admin_settings (key, value) VALUES ('ip_fix_deployed_at', '2026-07-30T12:20:00Z') ON CONFLICT (key) DO NOTHING`);
  } catch (e) { console.log('IP fix timestamp skipped:', e.message); }
  console.log('Migrations complete.');
}

// Run directly
if (require.main === module) {
  migrate().then(() => {
    closeDb().then(() => {
      console.log('Done.');
    });
  }).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrate;
