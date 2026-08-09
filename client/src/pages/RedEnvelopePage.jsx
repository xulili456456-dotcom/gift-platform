import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import client from '../api/client';
import toast from 'react-hot-toast';

const COINS_PER_CENT = 10;
const TARGET = 1000.00;

function calcProgress(amount) { return Math.min(100, Math.round((amount / TARGET) * 10000) / 100); }
function calcRemaining(amount) { return Math.max(0, Math.round((TARGET - amount) * 100) / 100); }

export default function RedEnvelopePage({ onClose, embedded }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [envelope, setEnvelope] = useState(null);
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSpin, setShowSpin] = useState(false);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const { data } = await client.get('/red-envelope');
      setEnvelope(data.envelope);
      setHelpers(data.helpers || []);
    } catch { /* envelope not created yet */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const currentAmount = Number(envelope?.current_amount || 0);
  const coinCount = Number(envelope?.coin_count || 0);
  const helpCount = Number(envelope?.help_count || 0);
  const isComplete = currentAmount >= TARGET - 0.001;
  const remaining = calcRemaining(currentAmount);
  const pct = calcProgress(currentAmount);
  const inCoinPhase = remaining <= 0.70 && remaining > 0;

  // Live countdown (24h from page open)
  const [timeLeft, setTimeLeft] = useState(24 * 3600);
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(timeLeft / 3600), m = Math.floor((timeLeft % 3600) / 60), s = timeLeft % 60;

  const handleInvite = () => {
    const code = user?.referral_code || '';
    navigator.clipboard.writeText(window.location.origin + '/register?ref=' + code).then(() => {
      setShowCopyConfirm(true); setTimeout(() => setShowCopyConfirm(false), 3000);
      toast.success('Invite link copied!');
    }).catch(() => toast.error('Failed to copy'));
  };

  const handleClaim = async () => {
    try {
      await client.post('/red-envelope/claim');
      toast.success('$1000 transferred to your balance!');
      loadData();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  if (loading) return null;
  if (embedded && isComplete && envelope?.status === 'claimed') return null; // don't show teaser if already claimed

  const heroContent = (
    <div style={{ background: 'linear-gradient(180deg, #FF2D55 0%, #FF5277 40%, #FF7A9A 100%)', padding: '20px 20px 24px', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 11, opacity: .8, letterSpacing: 2, marginBottom: 2 }}>LUCKY RED ENVELOPE</div>
      <div style={{ fontSize: 54, fontWeight: 900, textShadow: '0 4px 30px rgba(0,0,0,.2)', lineHeight: 1 }}>
        ${Math.floor(currentAmount)}<em style={{ fontSize: 28, fontStyle: 'normal' }}>.{String(Math.round((currentAmount % 1) * 100)).padStart(2, '0')}</em>
      </div>
      <div style={{ fontSize: 12, opacity: .5 }}>${TARGET.toFixed(2)}</div>
      {!isComplete && (
        <>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 16px', background: 'rgba(255,255,255,.18)', borderRadius: 20 }}>
            <span>🪙</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#FFD54F' }}>{coinCount}</span>
            <span style={{ fontSize: 11, opacity: .8 }}>coins</span>
          </div>
          <div style={{ fontSize: 10, opacity: .6, marginTop: 3 }}>10 coins = $0.01</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: .85 }}>Only ${remaining.toFixed(2)} more!</div>
        </>
      )}
      {isComplete && (
        <div style={{ marginTop: 10, padding: '8px 20px', background: 'rgba(0,0,0,.15)', borderRadius: 20, fontSize: 15, fontWeight: 700 }}>
          Ready to claim! 🎉
        </div>
      )}
    </div>
  );

  const progressCard = (
    <div style={{ background: '#fff', borderRadius: 16, margin: '-12px 16px 12px', padding: '14px 16px', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
      <div style={{ height: 10, background: '#FFE0E0', borderRadius: 5, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', borderRadius: 5, background: 'linear-gradient(90deg, #FF2D55, #FFB800)', width: pct + '%', transition: 'width 1s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#999' }}>
        <b style={{ color: '#FF2D55', fontSize: 12 }}>${currentAmount.toFixed(2)}</b>
        <span>${TARGET.toFixed(2)}</span>
        <b style={{ color: '#999', fontSize: 12 }}>{pct}%</b>
      </div>

      {isComplete ? (
        <button onClick={handleClaim} style={{ display: 'block', width: '100%', margin: '10px 0 0', padding: 15, textAlign: 'center', background: 'linear-gradient(135deg, #FFB800, #F59E0B)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          Claim $1000 Now
        </button>
      ) : (
        <>
          {inCoinPhase && (
            <div style={{ background: '#FFFBF0', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '8px 12px', margin: '8px 0 0', fontSize: 11, color: '#92400E', fontWeight: 600 }}>
              🪙 Coin mode active! Each invite gives 1-9 coins. 10 coins = $0.01
            </div>
          )}
          <div style={{ background: '#FFF5F5', border: '1.5px solid #FDD', borderRadius: 14, padding: '10px 14px', margin: '8px 0 0', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Only <b style={{ fontSize: 18, color: '#FF2D55' }}>${remaining.toFixed(2)}</b> more!</div>
          </div>
          <button onClick={handleInvite} style={{ display: 'block', width: '100%', margin: '8px 0 0', padding: 15, textAlign: 'center', background: 'linear-gradient(135deg, #FF2D55, #E0254D)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Invite New Users to Help &rarr;
          </button>
        </>
      )}
    </div>
  );

  if (embedded) {
    // Just show the teaser banner on HomePage
    return (
      <div onClick={() => navigate('/red-envelope')} style={{
        margin: '14px 16px 0', background: 'linear-gradient(135deg, #FF2D55, #FF5E7A)', borderRadius: 18, padding: '14px 18px',
        color: '#fff', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
        animation: 'none', boxShadow: '0 0 0 0 rgba(255,45,85,.4)'
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>🧧</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>${currentAmount.toFixed(2)} / $1000</div>
          <div style={{ fontSize: 11, opacity: .75 }}>{isComplete ? 'Ready to claim!' : 'Invite new users to help!'}</div>
        </div>
        <button style={{ padding: '8px 16px', background: '#fff', color: '#FF2D55', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
          {isComplete ? 'Claim' : 'Open'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: '#f2f2f7', minHeight: '100vh', maxWidth: 430, margin: '0 auto', paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg,#0a0a0f,#1a1a24)', padding: '12px 16px 14px', display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
        <button onClick={onClose || (() => navigate('/home'))} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Red Envelope</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,.5)' }}>⏱ {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>
      </div>

      {/* Sticky countdown */}
      <div style={{ background: '#FF2D55', color: '#fff', textAlign: 'center', padding: '4px', fontSize: 11, fontWeight: 600 }}>
        ⏰ {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')} remaining — Don't let your coins expire!
      </div>

      {/* Hero */}
      {heroContent}

      {/* Progress */}
      {progressCard}

      {/* Rules */}
      <div style={{ background: '#fff', borderRadius: 16, margin: '0 16px 12px', padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
        <div style={{ background: 'linear-gradient(135deg,#FFF8E1,#FFFBF0)', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '10px 14px', fontSize: 11, color: '#92400E', lineHeight: 1.8 }}>
          <b>⚠ Important:</b><br />
          1. Invited users must complete KYC for help to count.<br />
          2. Group Bonus: Create a WhatsApp/Telegram group, add invited users, contact support. Group members' helps give <b>2x-3x coins</b>.
        </div>
      </div>

      {/* Helpers */}
      {helpers.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, margin: '0 16px 12px', padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>People who helped <span style={{ color: '#FF2D55', fontSize: 11 }}>{helpCount} helped</span></div>
          {helpers.slice(0, 20).map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: `hsl(${(h.helper_user_id||0)*37%360},60%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {(h.helper_name || h.helper_email || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{h.helper_name || h.helper_email}</div>
                <div style={{ fontSize: 10, color: '#bbb' }}>{new Date(h.created_at).toLocaleString()}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#FF2D55' }}>
                {h.coins_added > 0 ? `+${h.coins_added} coins` : `+$${Number(h.amount_added||0).toFixed(2)}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
