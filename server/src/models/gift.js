const { all, get, run, insert } = require('../db/database');

const giftModel = {
  async list(includeInactive = false) {
    let where = includeInactive ? '' : 'WHERE is_active = true';
    return all(
      `SELECT * FROM gifts ${where} ORDER BY sort_order ASC, required_invites ASC`
    );
  },

  async findById(id) {
    return get('SELECT * FROM gifts WHERE id = ?', [id]);
  },

  async create({ name, description, imageUrl, requiredInvites, giftType, value, stock, sortOrder }) {
    const result = await insert(
      `INSERT INTO gifts (name, description, image_url, required_invites, gift_type, value, stock, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description || '', imageUrl || '', requiredInvites, giftType, value, stock != null ? stock : -1, sortOrder || 0]
    );
    return this.findById(result.id);
  },

  async update(id, fields) {
    const allowed = ['name', 'description', 'image_url', 'required_invites', 'gift_type', 'value', 'stock', 'is_active', 'sort_order'];
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
      `UPDATE gifts SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    return this.findById(id);
  },

  async deactivate(id) {
    await run(`UPDATE gifts SET is_active = false, updated_at = NOW() WHERE id = ?`, [id]);
  },
};

module.exports = giftModel;
