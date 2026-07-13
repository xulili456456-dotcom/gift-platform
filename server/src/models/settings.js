const { all, get, run } = require('../db/database');

const settingsModel = {
  get(key, defaultValue = null) {
    const row = get('SELECT value FROM admin_settings WHERE key = ?', [key]);
    return row ? row.value : defaultValue;
  },

  getNumber(key, defaultValue = 0) {
    const val = this.get(key, String(defaultValue));
    return parseFloat(val);
  },

  getAll() {
    const rows = all('SELECT key, value, updated_at FROM admin_settings ORDER BY key');
    const obj = {};
    for (const row of rows) {
      obj[row.key] = row.value;
    }
    return obj;
  },

  set(key, value) {
    run(
      `INSERT INTO admin_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      [key, String(value)]
    );
  },

  setMultiple(obj) {
    for (const [key, value] of Object.entries(obj)) {
      this.set(key, value);
    }
  },
};

module.exports = settingsModel;
