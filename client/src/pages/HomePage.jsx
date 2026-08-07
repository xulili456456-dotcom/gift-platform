import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { referralApi } from '../api/referral';
import { claimsApi } from '../api/claims';
import client from '../api/client';
import toast from 'react-hot-toast';

const TIER_INFO = {
  small:  { name: 'Small Store', dailyOrders: 10, threshold: 0,   next: 'Medium', nextThreshold: 50 },
  medium: { name: 'Medium Store', dailyOrders: 20, threshold: 50,  next: 'Large', nextThreshold: 200 },
  large:  { name: 'Large Store', dailyOrders: 40, threshold: 200, next: null, nextThreshold: 0 },
};

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const particlesRef = useRef(null);

  // Data states
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [activeOrders, setActiveOrders] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [freeProducts, setFreeProducts] = useState([]);
  const [freeRemaining, setFreeRemaining] = useState(5);
  const [freeClaimed, setFreeClaimed] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [expandedHolding, setExpandedHolding] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [totalInvites, setTotalInvites] = useState(0);
  const [claimsCount, setClaimsCount] = useState(0);
  const [grabbedCards, setGrabbedCards] = useState(new Set());

  const loadAll = useCallback(async () => {
    try {
      await client.post('/store/check-sell').catch(() => {});
      const [earnRes, freeRes, holdRes, refStatsRes, refCodeRes, claimsRes] = await Promise.all([
        client.get('/store/earnings-stats').catch(() => ({ data: null })),
        client.get('/store/free-products').catch(() => ({ data: null })),
        client.get('/store/holdings').catch(() => ({ data: [] })),
        referralApi.getStats().catch(() => ({ data: null })),
        referralApi.getCode().catch(() => ({ data: null })),
        claimsApi.list().catch(() => ({ data: [] })),
      ]);

      const e = earnRes.data || {};
      setBalance(e.balance || 0);
      setDeposit(e.deposit || 0);
      setTodayProfit(e.todayProfit || 0);
      setNetProfit(e.netProfit || 0);
      setActiveOrders(e.activeOrders || 0);
      setTotalOrders(e.totalOrders || 0);

      const f = freeRes.data || {};
      setFreeProducts(f.products || []);
      setFreeRemaining(f.remaining ?? 5);
      setFreeClaimed(f.claimedNames || []);

      setHoldings(holdRes.data || []);

      const rs = refStatsRes.data || {};
      setTotalInvites(rs.total_invites || 0);
      setReferralCode(rs.referral_code || (user?.referral_code) || '------');

      const rc = refCodeRes.data || {};
      setShareLink(rc.share_link || '');

      setClaimsCount((claimsRes.data || []).length);
    } catch {}
  }, [user]);

  // Initial load with skeleton delay
  useEffect(() => {
    const minSkeleton = new Promise(r => setTimeout(r, 1000));
    Promise.all([loadAll(), minSkeleton]).finally(() => setLoading(false));
  }, [loadAll]);

  // Periodic refresh
  useEffect(() => {
    const t1 = setInterval(() => {
      client.get('/store/earnings-stats').then(({ data }) => {
        if (data) { setBalance(data.balance || 0); setDeposit(data.deposit || 0); setTodayProfit(data.todayProfit || 0); setActiveOrders(data.activeOrders || 0); }
      }).catch(() => {});
    }, 15000);
    const t2 = setInterval(() => {
      client.post('/store/check-sell').catch(() => {});
      client.get('/store/holdings').then(({ data }) => { if (data) setHoldings(data); }).catch(() => {});
    }, 60000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  // Derived data
  const tier = totalOrders >= 200 ? TIER_INFO.large : totalOrders >= 50 ? TIER_INFO.medium : TIER_INFO.small;
  const tierPct = tier.next ? Math.round((totalOrders - tier.threshold) / (tier.nextThreshold - tier.threshold) * 100) : 100;
  const ordersToNext = tier.next ? tier.nextThreshold - totalOrders : 0;
  const displayPct = Math.min(100, Math.max(0, tierPct));
  const lockedInHoldings = holdings.reduce((s, h) => s + (h.cost || 0), 0);
  const totalAvailable = balance + deposit;
  const freeMargin = Math.max(0, totalAvailable - lockedInHoldings);
  const marginPct = totalAvailable > 0 ? Math.round((freeMargin / totalAvailable) * 100) : null;
  const avatarChar = (user?.name || user?.email || '?')[0].toUpperCase();

  // Handlers
  const handleGrab = async (productId, productName) => {
    try {
      await client.post(`/store/claim-free/${productId}`);
      setGrabbedCards(prev => new Set([...prev, productName]));
      toast.success(`${productName} grabbed!`);
      // Refresh data
      const [freeRes, holdRes] = await Promise.all([
        client.get('/store/free-products'),
        client.get('/store/holdings'),
      ]);
      setFreeProducts(freeRes.data?.products || []);
      setFreeRemaining(freeRes.data?.remaining ?? 0);
      setFreeClaimed(freeRes.data?.claimedNames || []);
      setHoldings(holdRes.data || []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to grab');
    }
  };

  const copyCode = () => {
    if (!referralCode || referralCode === '------') { toast.error('No invite code'); return; }
    navigator.clipboard.writeText(referralCode).then(() => toast.success('Code copied')).catch(() => toast.error('Failed'));
  };

  const copyLink = () => {
    if (!shareLink) { toast.error('No link available'); return; }
    navigator.clipboard.writeText(shareLink).then(() => toast.success('Link copied')).catch(() => toast.error('Failed'));
  };

  const burstParticles = (e) => {
    const c = particlesRef.current;
    if (!c) return;
    const colors = ['#FF5000', '#00A86B', '#4C6EF5', '#F59E0B', '#fff'];
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      const size = 3 + Math.random() * 5;
      const angle = Math.random() * 360;
      const dist = 20 + Math.random() * 40;
      p.style.cssText = `position:absolute;left:${e.clientX - size/2}px;top:${e.clientY - size/2}px;width:${size}px;height:${size}px;border-radius:50%;background:${colors[Math.floor(Math.random()*colors.length)]};--dx:${Math.cos(angle)*dist}px;--dy:${Math.sin(angle)*dist}px;animation:particleBurst .7s ease-out forwards;pointer-events:none;z-index:999`;
      c.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  };

  // Loading: Skeleton
  if (loading) return (
    <div style={{ maxWidth: 430, margin: '0 auto', background: '#f2f2f7', minHeight: '100vh' }}>
      <div style={{ padding: '12px 16px 16px', background: 'linear-gradient(180deg,#0a0a0f,#1a1a24)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 9 }} />
          <div className="skeleton" style={{ flex: 1, height: 36, borderRadius: 10 }} />
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 9 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: 10 }}>
              <div className="skeleton" style={{ height: 18, marginBottom: 4, background: 'rgba(255,255,255,.08)' }} />
              <div className="skeleton" style={{ height: 10, width: '60%', background: 'rgba(255,255,255,.05)' }} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div className="skeleton" style={{ height: 100, borderRadius: 18, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 80, borderRadius: 14, marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ minWidth: 134, height: 120, borderRadius: 13 }} />)}
        </div>
        <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
      </div>
    </div>
  );

  return (
    <div style={{ background: '#f2f2f7', minHeight: '100vh', maxWidth: 430, margin: '0 auto', paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
      {/* ═══ FLOATING BACKGROUND ORBS ═══ */}
      <div style={{ position: 'fixed', top: '10%', right: -20, width: 120, height: 120, borderRadius: '50%', background: 'var(--pri)', opacity: .15, filter: 'blur(30px)', pointerEvents: 'none', zIndex: 0, animation: 'orbFloat 12s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', bottom: '25%', left: -10, width: 80, height: 80, borderRadius: '50%', background: 'var(--blue)', opacity: .15, filter: 'blur(30px)', pointerEvents: 'none', zIndex: 0, animation: 'orbFloat 15s ease-in-out infinite reverse' }} />
      <div style={{ position: 'fixed', top: '50%', right: '20%', width: 60, height: 60, borderRadius: '50%', background: 'var(--green)', opacity: .15, filter: 'blur(30px)', pointerEvents: 'none', zIndex: 0, animation: 'orbFloat 10s ease-in-out infinite', animationDelay: '.5s' }} />

      <div ref={particlesRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }} />

      {/* ═══ HEADER ═══ */}
      <header style={{ background: 'linear-gradient(180deg,#0a0a0f,#1a1a24)', padding: '14px 16px 16px', color: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div onClick={() => navigate('/mine')} style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--pri)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0, cursor: 'pointer' }}>
            {avatarChar}
          </div>
          <div onClick={() => toast('Search products...')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.04)', borderRadius: 10, padding: '9px 13px', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.3)' }}>Search products...</span>
          </div>
          <button onClick={(e) => { burstParticles(e); navigate('/mine/notifications'); }} style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,.04)', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, background: 'var(--pri)', borderRadius: '50%', boxShadow: '0 0 8px rgba(255,80,0,.5)', animation: 'glowPulseRing 2s ease-in-out infinite' }} />
          </button>
        </div>

        {/* Stat Cards — 3 key metrics */}
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Balance */}
          <div onClick={() => navigate('/mine/withdraw')} style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '14px 12px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all .2s' }}>
            <div className="glow-orb-pulse" style={{ position: 'absolute', top: -20, right: -20, width: 40, height: 40, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,80,0,.3),transparent)', animationDelay: '0s' }} />
            <div className="count-in glow-text-pri" style={{ fontSize: 18, fontWeight: 700, color: 'var(--pri)', position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>${balance.toFixed(2)}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 4, fontWeight: 500, position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>Balance <span style={{ color: 'var(--green)' }}>{netProfit > 0 ? `↑${Math.round(netProfit/balance*100)}%` : '↑0%'}</span></div>
          </div>
          {/* Today's Profit */}
          <div onClick={() => navigate('/mine/transactions')} style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '14px 12px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all .2s' }}>
            <div className="glow-orb-pulse" style={{ position: 'absolute', top: -20, right: -20, width: 40, height: 40, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,168,107,.3),transparent)', animationDelay: '.5s' }} />
            <div className="count-in glow-text-grn" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', position: 'relative', zIndex: 1, whiteSpace: 'nowrap', animationDelay: '.1s' }}>+${todayProfit.toFixed(2)}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 4, fontWeight: 500, position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>Today's Profit</div>
          </div>
          {/* Free Margin */}
          <div onClick={() => navigate('/mine/transactions')} style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '14px 12px', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all .2s' }}>
            <div className="glow-orb-pulse" style={{ position: 'absolute', top: -20, right: -20, width: 40, height: 40, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,.3),transparent)', animationDelay: '1s' }} />
            <div className="count-in glow-text-gld" style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', position: 'relative', zIndex: 1, whiteSpace: 'nowrap', animationDelay: '.2s' }}>${freeMargin.toFixed(2)}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginTop: 4, fontWeight: 500, position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>Free Margin <span style={{ color: 'var(--gold)' }}>{marginPct !== null ? `${marginPct}%` : '--'}</span></div>
          </div>
        </div>
      </header>

      {/* ═══ HERO BANNER ═══ */}
      <div className="hero-gradient-anim" style={{ margin: '14px 16px 0', background: 'linear-gradient(135deg,#FF5000,#FF6B35,#E04500)', borderRadius: 18, padding: '24px 18px', color: '#fff', position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => navigate('/store')}>
        <div style={{ position: 'absolute', right: -50, top: -60, width: 200, height: 200, background: 'radial-gradient(circle,rgba(255,255,255,.12),transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', left: '60%', bottom: -30, width: 100, height: 100, background: 'radial-gradient(circle,rgba(255,255,255,.06),transparent 70%)', borderRadius: '50%' }} />
        {/* Sparkles */}
        <div style={{ position: 'absolute', left: '20%', top: '60%', width: 4, height: 4, background: '#fff', borderRadius: '50%', animation: 'heroFloatUp 2s ease-out infinite' }} />
        <div style={{ position: 'absolute', left: '50%', top: '70%', width: 4, height: 4, background: '#fff', borderRadius: '50%', animation: 'heroFloatUp 2s ease-out infinite', animationDelay: '.6s' }} />
        <div style={{ position: 'absolute', left: '75%', top: '40%', width: 4, height: 4, background: '#fff', borderRadius: '50%', animation: 'heroFloatUp 2s ease-out infinite', animationDelay: '1.2s' }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.15)', padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, marginBottom: 12, position: 'relative', zIndex: 1 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h8l-2 8 12-12h-8l2-8z"/></svg>
          Daily Free Orders
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, position: 'relative', zIndex: 1 }}>Grab Products, Earn Profit</h2>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginBottom: 16, position: 'relative', zIndex: 1 }}>5 free orders daily · Up to 25% profit per item · No upfront investment</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,.7)', marginBottom: 16, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', animation: 'breathe 1.5s ease-in-out infinite' }} />
          {freeRemaining} grabs available today · {tier.name}
        </div>
        <span onClick={(e) => { e.stopPropagation(); navigate('/store'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: 'var(--pri)', padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600, position: 'relative', zIndex: 1, cursor: 'pointer' }}>
          Grab Now →
        </span>
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, padding: '14px 16px' }}>
        {[
          { label: 'Deposit', color: 'var(--green)', icon: 'deposit', onClick: () => navigate('/mine/deposit') },
          { label: 'Withdraw', color: 'var(--pri)', icon: 'withdraw', onClick: () => navigate('/mine/withdraw') },
          { label: 'My Store', color: '#1d1d1f', icon: 'store', onClick: () => navigate('/store') },
          { label: 'My Team', color: 'var(--blue)', icon: 'team', onClick: () => navigate('/mine/team') },
        ].map((act) => (
          <div key={act.label} onClick={act.onClick} style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14, padding: '14px 6px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.02)', transition: 'all .2s' }}>
            <div style={{ marginBottom: 6 }}>
              {act.icon === 'deposit' && (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={act.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="1" x2="12" y2="3"/><polyline points="8 10 12 14 16 10"/>
                </svg>
              )}
              {act.icon === 'withdraw' && (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={act.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="21" x2="12" y2="23"/><polyline points="16 14 12 18 8 14"/>
                </svg>
              )}
              {act.icon === 'store' && (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={act.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              )}
              {act.icon === 'team' && (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={act.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4-4v-2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              )}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#6e6e73' }}>{act.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ FREE ORDERS ═══ */}
      <div style={{ background: '#f5f5f7', borderTop: '1px solid #e8e8ed', borderBottom: '1px solid #e8e8ed', padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--green)" style={{ animation: 'boltZap 2s ease-in-out infinite', display: 'inline-block' }}><path d="M13 2L3 14h8l-2 8 12-12h-8l2-8z"/></svg>
            <span style={{ animation: 'urgencyPulse 1s ease-in-out infinite', color: 'var(--green)' }}>Free Orders</span>
          </h3>
          <span style={{ fontSize: 10, background: 'rgba(0,168,107,.08)', color: 'var(--green)', padding: '3px 8px', borderRadius: 4, fontWeight: 600, animation: 'urgencyPulse 1s ease-in-out infinite' }}>
            {freeRemaining} of 5 left
          </span>
        </div>
        {freeProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#999', fontSize: 13 }}>No free products available right now. Check back later.</div>
        ) : (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {freeProducts.map((p) => {
              const claimed = freeClaimed.includes(p.name) || grabbedCards.has(p.name);
              const profit = Math.round(p.price * 0.05 * 100) / 100;
              const imgUrl = p.img ? (p.img.startsWith('http') ? p.img : `https://gift-platform-h6um.onrender.com${p.img}`) : '';
              return (
                <div key={p.id} onClick={() => !claimed && handleGrab(p.id, p.name)}
                  style={{
                    minWidth: 134, maxWidth: 134, background: '#fff', border: `1px solid ${claimed ? 'var(--green)' : '#e8e8ed'}`,
                    borderRadius: 13, padding: 10, textAlign: 'center', cursor: claimed ? 'default' : 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,.02)', flexShrink: 0, transition: 'all .2s',
                    opacity: claimed ? .6 : 1, position: 'relative', overflow: 'hidden',
                  }}>
                  {claimed && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 40, height: 40, background: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}
                  <img src={imgUrl} alt={p.name} style={{ width: 58, height: 58, borderRadius: 10, objectFit: 'cover', marginBottom: 6 }} />
                  <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                  <div className="hold-ha-glow" style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>+${profit.toFixed(2)}</div>
                  <span style={{ display: 'inline-block', padding: '5px 18px', background: claimed ? '#999' : 'var(--green)', color: '#fff', borderRadius: 7, fontSize: 10, fontWeight: 700, animation: claimed ? 'none' : 'grabBounce 2s ease-in-out infinite' }}>
                    {claimed ? 'Claimed' : 'Grab'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ ACTIVE HOLDINGS ═══ */}
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hold-ha-glow"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Active Holdings
            </h3>
            <span onClick={() => navigate('/store/funds')} style={{ fontSize: 11, color: 'var(--pri)', fontWeight: 600, cursor: 'pointer' }}>View All ›</span>
          </div>
          {holdings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              </div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>No active holdings yet</div>
              <button onClick={() => navigate('/store')} style={{ padding: '8px 20px', background: 'var(--pri)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Start Trading</button>
            </div>
          ) : (
            holdings.map((h, i) => (
              <div key={h.id}>
                <div onClick={() => setExpandedHolding(expandedHolding === h.id ? null : h.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < holdings.length - 1 ? '1px solid #f0f0f5' : 'none', cursor: 'pointer', transition: 'all .15s' }}>
                  <div style={{ width: 56, height: 42, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: '#f5f5f7' }}>
                    <img src={h.product_name ? `https://gift-platform-h6um.onrender.com/products/${h.id % 60 || 1}.jpg` : ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, whiteSpace: 'nowrap' }}>{h.product_name || 'Product'}</div>
                    <div style={{ height: 4, background: '#e8e8ed', borderRadius: 2, overflow: 'hidden' }}>
                      <div className={h.progress >= 90 ? 'hold-fill-near' : ''} style={{ height: '100%', width: `${Math.min(100, h.progress || 0)}%`, background: h.progress >= 90 ? 'var(--gold)' : h.progress >= 50 ? 'var(--green)' : 'var(--blue)', borderRadius: 2, transition: 'width 1.5s cubic-bezier(.4,0,.2,1)' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="hold-ha-glow" style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>+${(h.profit || 0).toFixed(2)}</div>
                    <div style={{ fontSize: 9, color: '#aeaeb2', marginTop: 2 }}>{h.progress || 0}% · {h.roi || 0}%/day</div>
                  </div>
                </div>
                {expandedHolding === h.id && (
                  <div style={{ maxHeight: 180, padding: '12px 16px', borderTop: '1px solid #f0f0f5', background: '#f2f2f7', borderRadius: '0 0 10px 10px', margin: '0 -8px' }}>
                    <div style={{ fontSize: 10, color: '#6e6e73', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                      <div style={{ color: '#aeaeb2' }}>Cost</div><div style={{ fontWeight: 600, textAlign: 'right' }}>${(h.cost || 0).toFixed(2)}</div>
                      <div style={{ color: '#aeaeb2' }}>Price</div><div style={{ fontWeight: 600, textAlign: 'right' }}>${Number(h.product_price || 0).toFixed(2)}</div>
                      <div style={{ color: '#aeaeb2' }}>Daily Rate</div><div style={{ fontWeight: 600, textAlign: 'right', color: 'var(--green)' }}>{h.roi || 0}%</div>
                      <div style={{ color: '#aeaeb2' }}>Status</div><div style={{ fontWeight: 600, textAlign: 'right' }}>{h.status || 'holding'}</div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══ STORE TIER ═══ */}
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <div onClick={() => toast(ordersToNext > 0 ? `${ordersToNext} orders to ${tier.next} Store` : 'Max tier reached!')} style={{ overflow: 'hidden', borderRadius: 14, background: '#fff', border: '1px solid #e8e8ed', boxShadow: '0 1px 4px rgba(0,0,0,.03)', cursor: 'pointer' }}>
          <div style={{ background: 'linear-gradient(135deg,#14142a,#252545)', padding: '14px 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ padding: '4px 10px', background: 'rgba(245,158,11,.15)', border: '1px solid rgba(245,158,11,.2)', color: 'var(--gold)', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>Lv.1</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{tier.name}</span>
            {tier.next && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,.35)' }}>Next: {tier.next}</span>}
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ height: 6, background: '#e8e8ed', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${displayPct}%`, background: 'var(--pri)', borderRadius: 3, transition: 'width 2s cubic-bezier(.4,0,.2,1)' }} />
            </div>
            <div style={{ fontSize: 10, color: '#aeaeb2', display: 'flex', justifyContent: 'space-between' }}>
              <span>{totalOrders} / {tier.nextThreshold} orders</span>
              {tier.next && <span>{ordersToNext} to Lv.2</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ INVITE ═══ */}
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <div onClick={() => navigate('/mine/team')} style={{ background: 'linear-gradient(135deg,#14142a,#252545)', borderRadius: 16, padding: 20, color: '#fff', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, background: 'radial-gradient(circle,rgba(255,80,0,.15),transparent 70%)', borderRadius: '50%' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,80,0,.15)', border: '1px solid rgba(255,80,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--pri)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4-4v-2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Invite Friends · Earn Commission</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>1.0% / 0.5% / 0.25% on every order</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); navigate('/mine/team'); }} className="invite-glow-btn" style={{ padding: '10px 18px', background: 'var(--pri)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Invite ›</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={(e) => { e.stopPropagation(); copyCode(); }} style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', position: 'relative', overflow: 'hidden' }}>
                Code: {referralCode}
                <span style={{ position: 'absolute', top: 0, left: 0, width: 40, height: '100%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)', animation: 'codeShimmer 2.5s ease-in-out infinite' }} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); copyLink(); }} style={{ padding: '10px 20px', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: -2 }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM CARDS ═══ */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div onClick={() => navigate('/mine/team')} style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14, padding: 14, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4-4v-2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <div style={{ fontSize: 12, fontWeight: 700 }}>My Team</div>
            <div style={{ fontSize: 10, color: '#aeaeb2', marginTop: 2 }}>{totalInvites} members</div>
          </div>
          <div onClick={() => navigate('/mine/verify')} style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 14, padding: 14, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Verifications</div>
            <div style={{ fontSize: 10, color: '#aeaeb2', marginTop: 2 }}>{claimsCount} proofs</div>
          </div>
        </div>
      </div>
    </div>
  );
}
