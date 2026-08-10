import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import client from '../api/client';
import toast from 'react-hot-toast';

const TARGET = 1000.00;

export default function RedEnvelopePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [envelope, setEnvelope] = useState(null);
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSpin, setShowSpin] = useState(false);
  const [spinUsed, setSpinUsed] = useState(0);
  const spinWheelRef = useRef(null);
  const spinning = useRef(false);
  const rainInterval = useRef(null);

  const loadData = async () => {
    try { const { data } = await client.get('/red-envelope'); setEnvelope(data.envelope); setHelpers(data.helpers || []); } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); return () => { if (rainInterval.current) clearInterval(rainInterval.current); }; }, []);

  const amt = Number(envelope?.current_amount || 998);
  const coins = Number(envelope?.coin_count || 0);
  const helps = Number(envelope?.help_count || 0);
  const done = amt >= TARGET - 0.001;
  const remain = Math.max(0, Math.round((TARGET - amt) * 100) / 100);
  const pct = Math.min(100, Math.round((amt / TARGET) * 10000) / 100);
  const coinPhase = remain <= 0.70 && remain > 0;

  const [timeLeft, setTimeLeft] = useState(86400);
  useEffect(() => { const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000); return () => clearInterval(t); }, []);
  const hh = Math.floor(timeLeft / 3600), mm = Math.floor((timeLeft % 3600) / 60), ss = timeLeft % 60, ts = n => String(n).padStart(2, '0');

  const handleInvite = () => {
    const code = user?.referral_code || '';
    navigator.clipboard.writeText(window.location.origin + '/register?ref=' + code).then(() => toast.success('Invite link copied!')).catch(() => toast.error('Failed'));
  };

  const handleClaim = async () => {
    try { await client.post('/red-envelope/claim'); toast.success('$1000 transferred!'); loadData(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

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

  const dropCoins = () => {
    const hero = document.getElementById('envPageHero');
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
    for (let i = 0; i < prizes.length; i++) {
      const sa = (i * segAngle - 90) * Math.PI / 180, ea = ((i + 1) * segAngle - 90) * Math.PI / 180;
      ctx.beginPath(); ctx.moveTo(126, 126); ctx.arc(126, 126, 122, sa, ea);
      ctx.fillStyle = segColors[i]; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.stroke();
      const ma = (sa + ea) / 2;
      ctx.save(); ctx.translate(126 + Math.cos(ma) * 79, 126 + Math.sin(ma) * 79); ctx.rotate(ma + Math.PI / 2);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(prizes[i], 0, 0);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(126, 126, 25, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = '#FF2D55'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#FF2D55'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎰', 126, 126);
    w.innerHTML = ''; w.appendChild(canvas);
  };

  const doSpin = () => {
    if (spinning.current) return;
    spinning.current = true;
    const w = spinWheelRef.current; if (!w) return;
    const winIdx = Math.floor(Math.random() * prizes.length);
    const target = 360 * (8 + Math.floor(Math.random() * 5)) - (winIdx * segAngle + segAngle / 2);
    w.style.transition = 'transform 2.5s cubic-bezier(.1,.6,.2,1)';
    w.style.transform = `rotate(${target}deg)`;
    setTimeout(() => {
      spinning.current = false;
      setSpinUsed(s => s + 1);
      toast.success('You won ' + prizes[winIdx] + ' coins!');
      loadData();
    }, 2700);
  };

  useEffect(() => { if (showSpin) setTimeout(() => buildWheel(), 100); }, [showSpin]);

  if (loading) return null;
  const spinLeft = Math.max(0, helps - spinUsed);

  return (
    <div style={{ background: '#f2f2f7', minHeight: '100vh', maxWidth: 430, margin: '0 auto', paddingBottom: 20 }}>
      <style>{`
        @keyframes envRainAnim { 0% { transform: translateY(0) rotate(0deg); opacity:1; } 100% { transform: translateY(105vh) rotate(360deg); opacity:.3; } }
        @keyframes coinDropAnim { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(60px) scale(.3); opacity:0; } }
        @keyframes sparkleAnim { 0%,100% { transform:translateY(0) scale(1); opacity:1; } 50% { transform:translateY(-14px) scale(1.5); opacity:.3; } }
        @keyframes mqAnim { 0% { transform:translateX(100%); } 100% { transform:translateX(-500%); } }
      `}</style>

      <div style={{ background: 'linear-gradient(180deg,#0a0a0f,#1a1a24)', padding: '12px 16px 14px', display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Red Envelope</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,.5)' }}>⏱ {ts(hh)}:{ts(mm)}:{ts(ss)}</span>
      </div>

      <div style={{ background: '#FF2D55', color: '#fff', textAlign: 'center', padding: '4px', fontSize: 11, fontWeight: 600 }}>
        ⏰ {ts(hh)}:{ts(mm)}:{ts(ss)} remaining — Don't let your coins expire!
      </div>

      <div style={{ background: '#FFF5F5', borderBottom: '1px solid #fdd', padding: '4px 0', overflow: 'hidden' }}>
        <div style={{ whiteSpace: 'nowrap', animation: 'mqAnim 20s linear infinite', fontSize: 10, color: '#FF2D55' }}>
          <span style={{ margin: '0 20px' }}>🎉 Someone just helped a friend reach $999!</span>
          <span style={{ margin: '0 20px' }}>🔥 12 people helped in the last hour!</span>
          <span style={{ margin: '0 20px' }}>🎉 Robertuzzu just helped Maria reach $998.80!</span>
        </div>
      </div>

      <div id="envPageHero" style={{ background: 'linear-gradient(180deg, #FF2D55 0%, #FF5277 40%, #FF7A9A 100%)', padding: '20px 20px 24px', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        {[0,1,2,3,4].map(i => <div key={i} style={{ position: 'absolute', width: 5, height: 5, background: '#FFB800', borderRadius: '50%', left: (10+i*20)+'%', top: (15+i*15)+'%', animation: `sparkleAnim 2.5s infinite ${i*0.5}s`, zIndex: 1 }} />)}
        <div style={{ fontSize: 11, opacity: .8, letterSpacing: 2, marginBottom: 2 }}>LUCKY RED ENVELOPE</div>
        <div style={{ fontSize: 54, fontWeight: 900, textShadow: '0 4px 30px rgba(0,0,0,.2)', lineHeight: 1 }}>
          ${Math.floor(amt)}<em style={{ fontSize: 28, fontStyle: 'normal' }}>.{String(Math.round((amt % 1) * 100)).padStart(2, '0')}</em>
        </div>
        <div style={{ fontSize: 12, opacity: .5 }}>$1000.00</div>

        {!done && (<>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 16px', background: 'rgba(255,255,255,.18)', borderRadius: 20 }}>
            <span>🪙</span><span style={{ fontSize: 16, fontWeight: 800, color: '#FFD54F' }}>{coins}</span><span style={{ fontSize: 11, opacity: .8 }}>coins</span>
          </div>
          <div style={{ fontSize: 10, opacity: .6, marginTop: 3 }}>10 coins = $0.01</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: .85 }}>Only ${remain.toFixed(2)} more!</div>
          <div style={{ marginTop: 4, fontSize: 10, opacity: .7, background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: '4px 12px', display: 'inline-block' }}>🏆 You're faster than <b>92%</b> of people!</div>
        </>)}
        {done && <div style={{ marginTop: 10, padding: '8px 20px', background: 'rgba(0,0,0,.15)', borderRadius: 20, fontSize: 15, fontWeight: 700 }}>Ready to claim! 🎉</div>}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, margin: '-12px 16px 12px', padding: '14px 16px', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
        <div style={{ height: 10, background: '#FFE0E0', borderRadius: 5, overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ height: '100%', borderRadius: 5, background: 'linear-gradient(90deg, #FF2D55, #FFB800)', width: pct + '%', transition: 'width 1s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#999' }}>
          <b style={{ color: '#FF2D55', fontSize: 12 }}>${amt.toFixed(2)}</b><span>$1000.00</span><b style={{ color: '#999', fontSize: 12 }}>{pct}%</b>
        </div>

        {done ? (
          <button onClick={handleClaim} style={{ display: 'block', width: '100%', margin: '10px 0 0', padding: 15, background: 'linear-gradient(135deg, #FFB800, #F59E0B)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Claim $1000 Now</button>
        ) : (<>
          {coinPhase && <div style={{ background: '#FFFBF0', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '8px 12px', margin: '8px 0 0', fontSize: 11, color: '#92400E', fontWeight: 600 }}>🪙 Coin mode! Each invite = 1-9 coins. 10 coins = $0.01</div>}
          <div style={{ background: '#FFF5F5', border: '1.5px solid #FDD', borderRadius: 14, padding: '10px 14px', margin: '8px 0 0', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Only <b style={{ fontSize: 18, color: '#FF2D55' }}>${remain.toFixed(2)}</b> more!</div>
          </div>
          <button onClick={() => { dropCoins(); handleInvite(); }} style={{ display: 'block', width: '100%', margin: '8px 0 0', padding: 15, background: 'linear-gradient(135deg, #FF2D55, #E0254D)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Invite New Users to Help →</button>
          <button onClick={() => setShowSpin(true)} disabled={spinLeft <= 0} style={{ display: 'block', width: '100%', margin: '5px 0 0', padding: 10, background: spinLeft > 0 ? '#fff' : '#f5f5f5', color: spinLeft > 0 ? '#FF2D55' : '#ccc', border: `1.5px solid ${spinLeft > 0 ? '#FF2D55' : '#e0e0e0'}`, borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: spinLeft > 0 ? 'pointer' : 'default' }}>🎰 Lucky Spin · {spinLeft} left</button>
          <button onClick={() => { dropCoins(); startRain(); }} style={{ display: 'block', width: '100%', margin: '5px 0 0', padding: 10, background: '#fff', color: '#FF2D55', border: '1.5px solid #FF2D55', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🧧 Share → Red Envelope Rain!</button>
          {helps > 0 && (
            <div style={{ background: '#FFFBF0', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '8px 12px', margin: '8px 0 0', fontSize: 11, color: '#92400E' }}>
              <div style={{ fontWeight: 700, marginBottom: 3 }}>🪙 Milestone Bonus: Invite 5 more → 50 free coins!</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, height: 5, background: '#FDE68A', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#B8860B', borderRadius: 3, width: Math.min(100, (helps % 5) / 5 * 100) + '%' }} />
                </div>
                <span style={{ fontSize: 10 }}>{helps % 5}/{5}</span>
              </div>
            </div>
          )}
          <div style={{ background: '#FFF5F5', borderRadius: 10, padding: '8px 12px', margin: '8px 0 0', fontSize: 11, color: '#FF2D55', fontWeight: 600, textAlign: 'center' }}>⚡ New users are joining — share your link now!</div>
        </>)}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, margin: '0 16px 12px', padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
        <div style={{ background: 'linear-gradient(135deg,#FFF8E1,#FFFBF0)', border: '2px solid #FDE68A', borderRadius: 14, padding: '14px 16px', fontSize: 12, color: '#92400E', lineHeight: 2 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>Important Rules</div>
              <div style={{ borderBottom: '1px solid #FDE68A', marginBottom: 8 }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <span style={{ background: '#FDE68A', color: '#92400E', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>1</span>
                <span><b>KYC Required:</b> Invited users must complete identity verification for help to count. Pending KYC = help not counted.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ background: '#FDE68A', color: '#92400E', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>2</span>
                <span><b>Group Bonus:</b> Create a WhatsApp or Telegram group, add your invited users, then contact support to register your group. Group members' helps give <b style={{ color: '#FF2D55', fontSize: 13 }}>2x-3x coins</b> — fill your envelope much faster!</span>
              </div>
            </div>
          </div>
          <a href="https://t.me/Shopping_Operations" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', background: '#0088CC', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
            💬 Contact Support on Telegram
          </a>
        </div>
      </div>

      {helpers.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, margin: '0 16px 12px', padding: 14, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>People who helped <span style={{ color: '#FF2D55', fontSize: 11 }}>{helps} helped</span></div>
          {helpers.slice(0, 20).map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: `hsl(${(h.helper_user_id||0)*37%360},60%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{(h.helper_name || h.helper_email || '?')[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{h.helper_name || h.helper_email}</div><div style={{ fontSize: 10, color: '#bbb' }}>{new Date(h.created_at).toLocaleString()}</div></div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#FF2D55' }}>{h.coins_added > 0 ? `+${h.coins_added} coins` : `+$${Number(h.amount_added||0).toFixed(2)}`}</div>
            </div>
          ))}
        </div>
      )}

      {showSpin && (
        <div onClick={() => setShowSpin(false)} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #FFF5F5, #fff)', borderRadius: 24, padding: '24px 20px', textAlign: 'center', width: 340, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            <h3 style={{ fontSize: 20, marginBottom: 4 }}>🎰 Lucky Spin!</h3>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>Each invite gives you 1 spin!</div>
            <div style={{ position: 'relative', width: 260, height: 260, margin: '0 auto 16px' }}>
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', zIndex: 10, fontSize: 30 }}>▼</div>
              <div ref={spinWheelRef} onClick={doSpin} style={{ width: 260, height: 260, borderRadius: '50%', overflow: 'hidden', border: '4px solid #FF2D55', boxShadow: '0 8px 30px rgba(255,45,85,.3)', cursor: 'pointer' }} />
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>Tap the wheel to spin!</div>
            <button onClick={() => setShowSpin(false)} style={{ marginTop: 16, padding: '8px 24px', background: '#f5f5f5', border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer', color: '#666' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
