const { getDb, exec } = require('./database');

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
    type            TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info','success','warning')),
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
    status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'done')),
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

async function migrate() {
  console.log('Running database migrations...');
  await getDb();
  await exec(schema);
  await exec(depositsSchema);
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
