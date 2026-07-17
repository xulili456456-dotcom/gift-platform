const { get, run } = require('../db/database');

async function generateReferralCode() {
  // Use sequential 6-digit numeric codes from admin_settings counter
  const row = await get("SELECT value FROM admin_settings WHERE key = 'referral_counter'");
  let next = (parseInt(row?.value) || 100000) + 1;
  await run("INSERT INTO admin_settings (key, value) VALUES ('referral_counter', ?) ON CONFLICT (key) DO UPDATE SET value = ?", [String(next), String(next)]);
  return String(next);
}

module.exports = { generateReferralCode };
