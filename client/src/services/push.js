import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import client from '../api/client';

let pendingToken = null;

// Register this device with FCM and report the token to our server.
export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      pendingToken = token.value;
      sendToken();
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err);
    });

    PushNotifications.addListener('pushNotificationReceived', () => {
      // Foreground push — data already arrives via the in-app notification system
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      // Navigate to the page the notification points at
      const url = action?.notification?.data?.url;
      if (url) window.location.href = url;
    });
  } catch (e) {
    // ignore
  }
}

// Send the FCM token to the server so it can push to this device.
// Safe to call repeatedly (e.g. after login); the server dedupes by user.
export function sendToken() {
  if (!pendingToken) return;
  // Only send when logged in — otherwise the 401 triggers a full-page reload loop
  if (!localStorage.getItem('access_token')) return;
  client.post('/notifications/device', { token: pendingToken }).catch(() => {});
}
