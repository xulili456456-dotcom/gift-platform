const { all, get, run, insert } = require('../db/database');

const userModel = {
  async findById(id) {
    return get(
      'SELECT id, email, phone, name, avatar_url, referral_code, parent_id, is_admin, is_active, is_agent, agent_commission, agent_quota, password_hash, tx_pin, created_at FROM users WHERE id = ?',
      [id]
    );
  },

  async findByEmail(email) {
    return get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
  },

  async findByReferralCode(code) {
    return get(
      'SELECT id, email, phone, name, avatar_url, referral_code, parent_id, is_admin, created_at FROM users WHERE referral_code = ?',
      [code]
    );
  },

  async create({ email, phone, passwordHash, name, referralCode, parentId, ipAddress }) {
    const result = await insert(
      'INSERT INTO users (email, phone, password_hash, name, referral_code, parent_id, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [email, phone, passwordHash, name, referralCode, parentId || null, ipAddress || '']
    );
    return this.findById(result.id);
  },

  async update(id, fields) {
    const allowed = ['name', 'avatar_url', 'phone'];
    const sets = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    if (sets.length === 0) return this.findById(id);
    values.push(id);
    await run(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    return this.findById(id);
  },

  async list({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      where += ' AND (email LIKE ? OR phone LIKE ? OR name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const rows = await all(
      `SELECT u.id, u.email, u.phone, u.name, u.referral_code, u.parent_id, u.is_admin, u.is_active, u.created_at,
        COALESCE((SELECT SUM(g.value) FROM user_gifts ug JOIN gifts g ON g.id = ug.gift_id WHERE ug.user_id = u.id AND ug.status != 'rejected'), 0) as balance,
        COALESCE((SELECT COUNT(*) FROM invitations WHERE inviter_id = u.id AND level = 1), 0) as invite_count
       FROM users u ${where} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const countRow = await get(
      `SELECT COUNT(*) as total FROM users ${where}`,
      params
    );
    return {
      users: rows,
      total: countRow ? countRow.total : 0,
      page,
      limit,
    };
  },

  async getParentChain(userId, maxLevel = 3) {
    const chain = [];
    let currentId = userId;
    for (let i = 0; i < maxLevel; i++) {
      const user = await this.findById(currentId);
      if (!user || !user.parent_id) break;
      const parent = await this.findById(user.parent_id);
      if (!parent) break;
      chain.push(parent);
      currentId = parent.id;
    }
    return chain;
  },
};

module.exports = userModel;
