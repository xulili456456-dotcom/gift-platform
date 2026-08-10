import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function RedEnvelopeTeaser() {
  const navigate = useNavigate();
  const [env, setEnv] = useState(null);

  useEffect(() => {
    client.get('/red-envelope').then(({ data }) => setEnv(data.envelope)).catch(() => {});
  }, []);

  if (!env) return null;
  const amt = Number(env.current_amount || 0);
  const isDone = amt >= 999.99;

  return (
    <div onClick={() => navigate('/red-envelope')} style={{
      margin: '14px 16px 0', background: `linear-gradient(135deg, ${isDone ? '#F59E0B' : '#FF2D55'}, ${isDone ? '#FFB800' : '#FF5E7A'})`,
      borderRadius: 18, padding: '14px 18px', color: '#fff', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>🧧</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>${amt.toFixed(2)} / $1000</div>
        <div style={{ fontSize: 11, opacity: .75 }}>{isDone ? 'Ready to claim!' : 'Invite new users to help!'}</div>
      </div>
      <button style={{ padding: '8px 16px', background: '#fff', color: isDone ? '#F59E0B' : '#FF2D55', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
        {isDone ? 'Claim' : 'Open'}
      </button>
    </div>
  );
}
