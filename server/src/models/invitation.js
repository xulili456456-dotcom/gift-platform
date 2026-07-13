const { all, get, run, insert } = require('../db/database');
const userModel = require('./user');
const settingsModel = require('./settings');

const invitationModel = {
  /**
   * Create invitation records for all levels when a new user registers with a referral code.
   */
  createChain(inviterId, inviteeId) {
    // Level 1: direct inviter
    insert(
      'INSERT INTO invitations (inviter_id, invitee_id, level) VALUES (?, ?, 1)',
      [inviterId, inviteeId]
    );

    // Trace up the parent chain for levels 2 and 3
    const maxLevel = settingsModel.getNumber('max_referral_level', 3);
    let currentParentId = inviterId;

    for (let level = 2; level <= maxLevel; level++) {
      const parent = userModel.findById(currentParentId);
      if (!parent || !parent.parent_id) break;

      insert(
        'INSERT INTO invitations (inviter_id, invitee_id, level) VALUES (?, ?, ?)',
        [parent.parent_id, inviteeId, level]
      );

      currentParentId = parent.parent_id;
    }
  },

  /**
   * Get effective invite count for a user.
   * effective = level1 * 1.0 + level2 * 0.5 + level3 * 0.25
   */
  getEffectiveCount(userId) {
    const rate1 = settingsModel.getNumber('level_1_rate', 1.0);
    const rate2 = settingsModel.getNumber('level_2_rate', 0.5);
    const rate3 = settingsModel.getNumber('level_3_rate', 0.25);

    const counts = all(
      `SELECT level, COUNT(*) as cnt FROM invitations WHERE inviter_id = ? GROUP BY level`,
      [userId]
    );

    let effective = 0;
    const breakdown = { level1: 0, level2: 0, level3: 0 };

    for (const row of counts) {
      if (row.level === 1) {
        breakdown.level1 = row.cnt;
        effective += row.cnt * rate1;
      } else if (row.level === 2) {
        breakdown.level2 = row.cnt;
        effective += row.cnt * rate2;
      } else if (row.level === 3) {
        breakdown.level3 = row.cnt;
        effective += row.cnt * rate3;
      }
    }

    return { effective: Math.floor(effective * 100) / 100, breakdown };
  },

  /**
   * Get list of invitees for a user at a specific level.
   */
  getInvitees(userId, level = 1, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = all(
      `SELECT u.id, u.name, u.email, u.phone, i.level, i.created_at as invited_at
       FROM invitations i
       JOIN users u ON u.id = i.invitee_id
       WHERE i.inviter_id = ? AND i.level = ?
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, level, limit, offset]
    );
    const countRow = get(
      'SELECT COUNT(*) as total FROM invitations WHERE inviter_id = ? AND level = ?',
      [userId, level]
    );
    return {
      invitees: rows,
      total: countRow ? countRow.total : 0,
      page,
      limit,
    };
  },

  /**
   * Get user's invitation tree (for admin view).
   */
  getDownlineTree(userId, depth = 0, maxDepth = 4) {
    if (depth >= maxDepth) return null;

    const directInvitees = all(
      `SELECT u.id, u.name, u.email, u.phone, i.created_at
       FROM invitations i
       JOIN users u ON u.id = i.invitee_id
       WHERE i.inviter_id = ? AND i.level = 1
       ORDER BY i.created_at DESC`,
      [userId]
    );

    return directInvitees.map(inv => ({
      ...inv,
      children: this.getDownlineTree(inv.id, depth + 1, maxDepth),
    }));
  },

  /**
   * Get count of each level for a user.
   */
  getStats(userId) {
    const row = all(
      `SELECT level, COUNT(*) as cnt FROM invitations WHERE inviter_id = ? GROUP BY level ORDER BY level`,
      [userId]
    );

    const stats = { level1: 0, level2: 0, level3: 0, total: 0 };
    for (const r of row) {
      stats[`level${r.level}`] = r.cnt;
      stats.total += r.cnt;
    }
    return stats;
  },
};

module.exports = invitationModel;
