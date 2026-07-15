const { all, get, run } = require('../db/database');

const settingsModel = {
  async get(key, defaultValue = null) {
    const row = await get('SELECT value FROM admin_settings WHERE key = ?', [key]);
    return row ? row.value : defaultValue;
  },

  async getNumber(key, defaultValue = 0) {
    const val = await this.get(key, String(defaultValue));
    return parseFloat(val);
  },

  async getAll() {
    const rows = await all('SELECT key, value, updated_at FROM admin_settings ORDER BY key');
    const obj = {};
    for (const row of rows) {
      obj[row.key] = row.value;
    }
    return obj;
  },

  async set(key, value) {
    await run(
      `INSERT OR REPLACE INTO admin_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
      [key, String(value)]
    );
  },

  async setMultiple(obj) {
    for (const [key, value] of Object.entries(obj)) {
      await this.set(key, value);
    }
  },
};

module.exports = settingsModel;
