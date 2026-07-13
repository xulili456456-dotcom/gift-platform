const { all, get, run, insert } = require('../db/database');
const userModel = require('./user');
const settingsModel = require('./settings');

const invitationModel = {
  async createChain(inviterId, inviteeId) {
    // Level 1: direct inviter
    await insert(
      'INSERT INTO invitations (inviter_id, invitee_id, level) VALUES (?, ?, 1)',
      [inviterId, inviteeId]
    );

    // Trace up the parent chain for levels 2 and 3
    const maxLevel = await settingsModel.getNumber('max_referral_level', 3);
    let currentParentId = inviterId;

    for (let level = 2; level <= maxLevel; level++) {
      const parent = await userModel.findById(currentParentId);
      if (!parent || !parent.parent_id) break;

      await insert(
        'INSERT INTO invitations (inviter_id, invitee_id, level) VALUES (?, ?, ?)',
        [parent.parent_id, inviteeId, level]
      );

      currentParentId = parent.parent_id;
    }
  },

  async getEffectiveCount(userId) {
    const rate1 = await settingsModel.getNumber('level_1_rate', 1.0);
    const rate2 = await settingsModel.getNumber('level_2_rate', 0.5);
    const rate3 = await settingsModel.getNumber('level_3_rate', 0.25);

    const counts = await all(
      `SELECT level, COUNT(*) as cnt FROM invitations WHERE inviter_id = ? GROUP BY level`,
      [userId]
    );

    let effective = 0;
    const breakdown = { level1: 0, level2: 0, level3: 0 };

    for (const row of counts) {
      if (row.level === 1) {
        breakdown.level1 = Number(row.cnt);
        effective += Number(row.cnt) * rate1;
      } else if (row.level === 2) {
        breakdown.level2 = Number(row.cnt);
        effective += Number(row.cnt) * rate2;
      } else if (row.level === 3) {
        breakdown.level3 = Number(row.cnt);
        effective += Number(row.cnt) * rate3;
      }
    }

    return { effective: Math.floor(effective * 100) / 100, breakdown };
  },

  async getInvitees(userId, level = 1, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await all(
      `SELECT u.id, u.name, u.email, u.phone, i.level, i.created_at as invited_at
       FROM invitations i
       JOIN users u ON u.id = i.invitee_id
       WHERE i.inviter_id = ? AND i.level = ?
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, level, limit, offset]
    );
    const countRow = await get(
      'SELECT COUNT(*) as total FROM invitations WHERE inviter_id = ? AND level = ?',
      [userId, level]
    );
    return {
      invitees: rows,
      total: countRow ? Number(countRow.total) : 0,
      page,
      limit,
    };
  },

  async getDownlineTree(userId, depth = 0, maxDepth = 4) {
    if (depth >= maxDepth) return null;

    const directInvitees = await all(
      `SELECT u.id, u.name, u.email, u.phone, i.created_at
       FROM invitations i
       JOIN users u ON u.id = i.invitee_id
       WHERE i.inviter_id = ? AND i.level = 1
       ORDER BY i.created_at DESC`,
      [userId]
    );

    const result = [];
    for (const inv of directInvitees) {
      const children = await this.getDownlineTree(inv.id, depth + 1, maxDepth);
      result.push({ ...inv, children });
    }
    return result;
  },

  async getStats(userId) {
    const row = await all(
      `SELECT level, COUNT(*) as cnt FROM invitations WHERE inviter_id = ? GROUP BY level ORDER BY level`,
      [userId]
    );

    const stats = { level1: 0, level2: 0, level3: 0, total: 0 };
    for (const r of row) {
      stats[`level${r.level}`] = Number(r.cnt);
      stats.total += Number(r.cnt);
    }
    return stats;
  },
};

module.exports = invitationModel;
