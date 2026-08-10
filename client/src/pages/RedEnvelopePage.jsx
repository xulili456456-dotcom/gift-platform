import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import client from '../api/client';
import toast from 'react-hot-toast';

const TARGET = 1000.00;
const COINS_PER_CENT = 10;

export default function RedEnvelopePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [envelope, setEnvelope] = useState(null);
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSpin, setShowSpin] = useState(false);
  const [spinUsed, setSpinUsed] = useState(false);
  const spinWheelRef = useRef(null);
  const wheelAngle = useRef(0);
  const spinning = useRef(false);
  const rainInterval = useRef(null);

  const loadData = useCallback(async () => {
    try { const { data } = await client.get('/red-envelope'); setEnvelope(data.envelope); setHelpers(data.helpers || []); } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const amt = Number(envelope?.current_amount || 998);
  const coins = Number(envelope?.coin_count || 0);
  const helps = Number(envelope?.help_count || 0);
  const done = amt >= TARGET - 0.001;
  const remain = Math.max(0, Math.round((TARGET - amt) * 100) / 100);
  const pct = Math.min(100, Math.round((amt / TARGET) * 10000) / 100);
  const coinPhase = remain <= 0.70 && remain > 0;

  // Countdown (24h)
  const [timeLeft, setTimeLeft] = useState(86400);
  useEffect(() => { const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000); return () => clearInterval(t); }, []);
  const hh = Math.floor(timeLeft / 3600), mm = Math.floor((timeLeft % 3600) / 60), ss = timeLeft % 60;
  const ts = (n) => String(n).padStart(2, '0');

  // Invite
  const handleInvite = () => {
    const code = user?.referral_code || '';
    navigator.clipboard.writeText(window.location.origin + '/register?ref=' + code).then(() => {
      toast.success('Invite link copied!');
    }).catch(() => toast.error('Failed'));
  };

  // Claim
  const handleClaim = async () => {
    try { await client.post('/red-envelope/claim'); toast.success('$1000 transferred!'); loadData(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  // Red envelope rain
  const startRain = () => {
    if (rainInterval.current) { clearInterval(rainInterval.current); rainInterval.current = null; }
    let rained = 0;
    const icons = ['🧧','🧧','🧧','🧧','💰'];
    rainInterval.current = setInterval(() => {
      if (rained >= 15) { clearInterval(rainInterval.current); rainInterval.current = null; return; }
      const el = document.createElement('span');
      el.textContent = icons[Math.floor(Math.random() * icons.length)];
      el.style.cssText = `position:fixed;left:${10+Math.random()*80}%;top:-40px;font-size:24px;z-index:9999;animation:envRainAnim ${3+Math.random()*3}s linear forwards;cursor:pointer`;
      el.onclick = () => { loadData(); el.remove(); };
      document.body.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.remove(); }, 6000);
      rained++;
    }, 250);
  };

  // Coin drop animation
  const dropCoins = () => {
    const hero = document.getElementById('envHero');
    if (!hero) return;
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const c = document.createElement('span');
        c.textContent = ['🪙','🪙','🪙','✨','🪙','💰','🪙','💎','🪙','🪙'][i];
        c.style.cssText = `position:absolute;left:${15+Math.random()*70}%;top:${20+Math.random()*50}%;font-size:20px;animation:coinDropAnim 1.5s ease-out forwards;z-index:10;pointer-events:none`;
        hero.appendChild(c);
        setTimeout(() => c.remove(), 1500);
      }, i * 80);
    }
  };

  // Spin wheel
  const prizes = ['🪙 5','🪙 10','🪙 3','🪙 20','🪙 8','🪙 15','🪙 1','🪙 12'];
  const segAngle = 360 / prizes.length;
  const segColors = ['#FF2D55','#FFB800','#FF6B6B','#FFD54F','#E0254D','#F59E0B','#FF8A80','#FFC107'];

  const buildWheel = () => {
    const w = spinWheelRef.current;
    if (!w) return;
    const canvas = document.createElement('canvas');
    canvas.width = 252; canvas.height = 252;
    canvas.style.cssText = 'width:252px;height:252px;border-radius:50%;display:block;margin:0 auto';
    const ctx = canvas.getContext('2d');
    const cx = 126, cy = 126, r = 122;
    for (let i = 0; i < prizes.length; i++) {
      const sa = (i * segAngle - 90) * Math.PI / 180, ea = ((i + 1) * segAngle - 90) * Math.PI / 180;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, sa, ea);
      ctx.fillStyle = segColors[i]; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.stroke();
      const ma = (sa + ea) / 2;
      ctx.save(); ctx.translate(cx + Math.cos(ma) * r * 0.65, cy + Math.sin(ma) * r * 0.65); ctx.rotate(ma + Math.PI / 2);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(prizes[i], 0, 0);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = '#FF2D55'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#FF2D55'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎰', cx, cy);
    w.innerHTML = ''; w.appendChild(canvas);
  };

  const doSpin = () => {
    if (spinning.current) return;
    spinning.current = true;
    const w = spinWheelRef.current;
    if (!w) return;
    const winIdx = Math.floor(Math.random() * prizes.length);
    const segCenter = winIdx * segAngle + segAngle / 2;
    const fullSpins = 360 * (8 + Math.floor(Math.random() * 5));
    const target = fullSpins - segCenter;
    w.style.transition = 'transform 2.5s cubic-bezier(.1,.6,.2,1)';
    w.style.transform = `rotate(${target}deg)`;
    const prize = prizes[winIdx];
    setTimeout(() => {
      spinning.current = false;
      setSpinUsed(true);
      toast.success(`You won ${prize} coins!`);
      loadData();
    }, 2700);
  };

  useEffect(() => { if (showSpin) setTimeout(() => buildWheel(), 100); }, [showSpin]);

  if (loading) return null;

  return (
    <div style={{ background: '#f2f2f7', minHeight: '100vh', maxWidth: 430, margin: '0 auto', paddingBottom: 20 }}>
      <style>{`
        @keyframes envRainAnim { 0% { transform: translateY(0) rotate(0deg); opacity:1; } 100% { transform: translateY(105vh) rotate(360deg); opacity:.3; } }
        @keyframes coinDropAnim { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(60px) scale(.3); opacity:0; } }
        @keyframes marqueeAnim { 0% { transform:translateX(100%); } 100% { transform:translateX(-500%); } }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg,#0a0a0f,#1a1a24)', padding: '12px 16px 14px', display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Red Envelope</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,.5)' }}>⏱ {ts(hh)}:{ts(mm)}:{ts(ss)}</span>
      </div>

      {/* Sticky countdown */}
      <div style={{ background: '#FF2D55', color: '#fff', textAlign: 'center', padding: '4px', fontSize: 11, fontWeight: 600, position: 'sticky', top: 0, zIndex: 10 }}>
        ⏰ {ts(hh)}:{ts(mm)}:{ts(ss)} remaining — Don't let your coins expire!
      </div>

      {/* Marquee */}
      <div style={{ background: '#FFF5F5', borderBottom: '1px solid #fdd', padding: '6px 0', overflow: 'hidden', position: 'sticky', top: 30, zIndex: 9 }}>
        <div style={{ whiteSpace: 'nowrap', animation: 'marqueeAnim 20s linear infinite', fontSize: 10, color: '#FF2D55' }}>
          <span style={{ margin: '0 20px' }}>🎉 Someone just helped their friend reach $999!</span>
          <span style={{ margin: '0 20px' }}>🔥 Hot: 12 people helped in the last hour!</span>
          <span style={{ margin: '0 20px' }}>🎉 Robertuzzu just helped Maria reach $998.80!</span>
        </div>
      </div>

      {/* Hero */}
      <div id="envHero" style={{ background: 'linear-gradient(180deg, #FF2D55 0%, #FF5277 40%, #FF7A9A 100%)', padding: '20px 20px 24px', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ fontSize: 11, opacity: .8, letterSpacing: 2, marginBottom: 2 }}>LUCKY RED ENVELOPE</div>
        <div style={{ fontSize: 54, fontWeight: 900, textShadow: '0 4px 30px rgba(0,0,0,.2)', lineHeight: 1 }}>
          ${Math.floor(amt)}<em style={{ fontSize: 28, fontStyle: 'normal' }}>.{String(Math.round((amt % 1) * 100)).padStart(2, '0')}</em>
        </div>
        <div style={{ fontSize: 12, opacity: .5 }}>$1000.00</div>

        {!done && (
          <>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 16px', background: 'rgba(255,255,255,.18)', borderRadius: 20 }}>
              <span>🪙</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#FFD54F' }}>{coins}</span>
              <span style={{ fontSize: 11, opacity: .8 }}>coins</span>
            </div>
            <div style={{ fontSize: 10, opacity: .6, marginTop: 3 }}>10 coins = $0.01</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: .85 }}>Only ${remain.toFixed(2)} more!</div>
            <div style={{ marginTop: 4, fontSize: 10, opacity: .7, background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: '4px 12px', display: 'inline-block' }}>
              🏆 You're faster than <b>92%</b> of people!
            </div>
          </>
        )}
        {done && (
          <div style={{ marginTop: 10, padding: '8px 20px', background: 'rgba(0,0,0,.15)', borderRadius: 20, fontSize: 15, fontWeight: 700 }}>
            Ready to claim! 🎉
          </div>
        )}
      </div>

      {/* Progress + Actions */}
      <div style={{ background: '#fff', borderRadius: 16, margin: '-12px 16px 12px', padding: '14px 16px', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
        <div style={{ height: 10, background: '#FFE0E0', borderRadius: 5, overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ height: '100%', borderRadius: 5, background: 'linear-gradient(90deg, #FF2D55, #FFB800)', width: pct + '%', transition: 'width 1s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#999' }}>
          <b style={{ color: '#FF2D55', fontSize: 12 }}>${amt.toFixed(2)}</b>
          <span>$1000.00</span>
          <b style={{ color: '#999', fontSize: 12 }}>{pct}%</b>
        </div>

        {done ? (
          <button onClick={handleClaim} style={{ display: 'block', width: '100%', margin: '10px 0 0', padding: 15, textAlign: 'center', background: 'linear-gradient(135deg, #FFB800, #F59E0B)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Claim $1000 Now
          </button>
        ) : (
          <>
            {coinPhase && (
              <div style={{ background: '#FFFBF0', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '8px 12px', margin: '8px 0 0', fontSize: 11, color: '#92400E', fontWeight: 600 }}>
                🪙 Coin mode active! Each invite gives 1-9 coins. 10 coins = $0.01
              </div>
            )}
            <div style={{ background: '#FFF5F5', border: '1.5px solid #FDD', borderRadius: 14, padding: '10px 14px', margin: '8px 0 0', textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Only <b style={{ fontSize: 18, color: '#FF2D55' }}>${remain.toFixed(2)}</b> more!</div>
            </div>
            <button onClick={() => { dropCoins(); handleInvite(); }} style={{ display: 'block', width: '100%', margin: '8px 0 0', padding: 15, textAlign: 'center', background: 'linear-gradient(135deg, #FF2D55, #E0254D)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Invite New Users to Help →
            </button>
            <button onClick={() => setShowSpin(true)} disabled={spinUsed} style={{ display: 'block', width: '100%', margin: '5px 0 0', padding: 10, textAlign: 'center', background: spinUsed ? '#f5f5f5' : '#fff', color: spinUsed ? '#ccc' : '#FF2D55', border: `1.5px solid ${spinUsed ? '#e0e0e0' : '#FF2D55'}`, borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: spinUsed ? 'default' : 'pointer' }}>
              {spinUsed ? '🎰 Lucky Spin — Already Used' : '🎰 Lucky Spin — Win Extra Coins!'}
            </button>
            <button onClick={() => { dropCoins(); startRain(); }} style={{ display: 'block', width: '100%', margin: '5px 0 0', padding: 10, textAlign: 'center', background: '#fff', color: '#FF2D55', border: '1.5px solid #FF2D55', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              🧧 Share to Social — Trigger Red Envelope Rain!
            </button>
            <div style={{ background: '#FFF5F5', borderRadius: 10, padding: '8px 12px', margin: '8px 0 0', fontSize: 11, color: '#FF2D55', fontWeight: 600, textAlign: 'center', animation: 'none' }}>
              ⚡ New users are joining — share your link now!
            </div>
          </>
        )}
      </div>

      {/* KYC + Group Info */}
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
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>People who helped <span style={{ color: '#FF2D55', fontSize: 11 }}>{helps} helped</span></div>
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

      {/* Spin Overlay */}
      {showSpin && (
        <div onClick={() => setShowSpin(false)} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #FFF5F5, #fff)', borderRadius: 24, padding: '24px 20px', textAlign: 'center', width: 340, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            <h3 style={{ fontSize: 20, marginBottom: 4 }}>🎰 Lucky Spin!</h3>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>Share your link — get 1 free spin!</div>
            <div style={{ position: 'relative', width: 260, height: 260, margin: '0 auto 16px' }}>
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', zIndex: 10, fontSize: 30, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.3))' }}>▼</div>
              <div ref={spinWheelRef} onClick={doSpin} style={{ width: 260, height: 260, borderRadius: '50%', position: 'relative', overflow: 'hidden', border: '4px solid #FF2D55', boxShadow: '0 8px 30px rgba(255,45,85,.3)', cursor: 'pointer' }} />
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>Tap the wheel to spin!</div>
            <button onClick={() => setShowSpin(false)} style={{ marginTop: 16, padding: '8px 24px', background: '#f5f5f5', border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer', color: '#666' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
