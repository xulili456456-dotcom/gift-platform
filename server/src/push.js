// Firebase Cloud Messaging — sends push notifications to user devices.
// Requires FIREBASE_SERVICE_ACCOUNT env var (the service-account JSON as a string).
let messaging = null;

function getMessaging() {
  if (messaging !== null) return messaging;
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      messaging = false;
      return null;
    }
    const admin = require('firebase-admin');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    messaging = admin.messaging();
  } catch (e) {
    console.error('Firebase admin init failed:', e.message);
    messaging = false;
  }
  return messaging;
}

async function sendPush(userId, title, body, url = '/mine/notifications') {
  const m = getMessaging();
  if (!m) return;
  const { all } = require('./db/database');
  try {
    const tokens = await all('SELECT token FROM device_tokens WHERE user_id = ?', [userId]);
    const list = (tokens || []).map((t) => t.token);
    if (!list.length) return;
    await m.sendEachForMulticast({
      tokens: list,
      notification: { title, body },
      data: { url },
    });
  } catch (e) {
    console.error('Push send failed:', e.message);
  }
}

module.exports = { sendPush };
