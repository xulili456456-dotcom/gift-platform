const { all, get, run, insert } = require('../db/database');

const userGiftModel = {
  async findById(id) {
    return get(
      `SELECT ug.*, g.name as gift_name, g.gift_type, g.value, g.image_url
       FROM user_gifts ug
       JOIN gifts g ON g.id = ug.gift_id
       WHERE ug.id = ?`,
      [id]
    );
  },

  async findByUser(userId) {
    return all(
      `SELECT ug.id, ug.gift_id, ug.status, ug.claimed_at, ug.delivered_at, ug.admin_note,
              g.name as gift_name, g.gift_type, g.value, g.image_url, g.required_invites
       FROM user_gifts ug
       JOIN gifts g ON g.id = ug.gift_id
       WHERE ug.user_id = ?
       ORDER BY ug.claimed_at DESC`,
      [userId]
    );
  },

  async findByUserAndGift(userId, giftId) {
    return get(
      'SELECT * FROM user_gifts WHERE user_id = ? AND gift_id = ?',
      [userId, giftId]
    );
  },

  async create(userId, giftId) {
    const result = await insert(
      'INSERT INTO user_gifts (user_id, gift_id, status) VALUES (?, ?, ?)',
      [userId, giftId, 'pending']
    );
    return this.findById(result.id);
  },

  async updateStatus(id, status, adminNote = '') {
    const deliveredAtExpr = status === 'delivered' ? 'NOW()' : 'NULL';
    await run(
      `UPDATE user_gifts SET status = ?, admin_note = ?, delivered_at = ${deliveredAtExpr} WHERE id = ?`,
      [status, adminNote, id]
    );
    return this.findById(id);
  },

  async listAll({ page = 1, limit = 20, status = '' }) {
    const offset = (page - 1) * limit;
    let where = '';
    const params = [];
    if (status) {
      where = 'WHERE ug.status = ?';
      params.push(status);
    }
    const rows = await all(
      `SELECT ug.*, g.name as gift_name, g.gift_type, g.value,
              u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM user_gifts ug
       JOIN gifts g ON g.id = ug.gift_id
       JOIN users u ON u.id = ug.user_id
       ${where}
       ORDER BY ug.claimed_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const countRow = await get(
      `SELECT COUNT(*) as total FROM user_gifts ug ${where}`,
      params
    );
    return {
      claims: rows,
      total: countRow ? Number(countRow.total) : 0,
      page,
      limit,
    };
  },
};

module.exports = userGiftModel;
