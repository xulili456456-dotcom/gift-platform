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
INSERT INTO admin_settings (key, value) VALUES ('platform_name', '好礼相送')
ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_settings (key, value) VALUES ('platform_share_title', '邀请好友，赢取好礼！')
ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_settings (key, value) VALUES ('platform_share_desc', '完成任务免费领现金和实物，快来加入！')
ON CONFLICT (key) DO NOTHING;
`;

async function migrate() {
  console.log('Running database migrations...');
  await getDb();
  await exec(schema);
  await exec(defaultSettings);
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
