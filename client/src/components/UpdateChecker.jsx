import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import client from '../api/client';

function compareVersions(a, b) {
  const pa = String(a || '').split('.').map(Number);
  const pb = String(b || '').split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

// Checks the server for a newer app version on startup (native only) and
// prompts the user to download + install the latest APK.
export default function UpdateChecker() {
  const [update, setUpdate] = useState(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    (async () => {
      try {
        const info = await App.getInfo();
        const installed = info.version;
        const { data } = await client.get('/app/version');
        if (data && compareVersions(data.version, installed) > 0) {
          setUpdate(data);
        }
      } catch (e) {
        // No update check available — silently ignore
      }
    })();
  }, []);

  if (!update) return null;

  const openUpdate = () => {
    try { window.open(update.apkUrl, '_system'); } catch (e) {}
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.6)', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 320, padding: '28px 24px 22px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f0f0f', marginBottom: 6 }}>发现新版本</div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 22, lineHeight: 1.6 }}>版本 {update.version} 已可用，建议更新以获得最新功能和修复</div>
        <button onClick={openUpdate} style={{ width: '100%', padding: 13, background: '#FF5000', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
          立即更新
        </button>
        <button onClick={() => setUpdate(null)} style={{ width: '100%', padding: 12, background: '#f5f5f5', color: '#666', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          稍后再说
        </button>
      </div>
    </div>
  );
}
