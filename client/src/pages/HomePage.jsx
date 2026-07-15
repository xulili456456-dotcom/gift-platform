import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { giftsApi } from '../api/gifts';
import { referralApi } from '../api/referral';
import { claimsApi } from '../api/claims';
import useAuthStore from '../store/authStore';
import PullToRefresh from '../components/shared/PullToRefresh';
import toast from 'react-hot-toast';

const marqueeMessages = ['marquee1', 'marquee2', 'marquee3', 'marquee4'];

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [gifts, setGifts] = useState([]);
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEnv, setShowEnv] = useState(false);
  const [floatCoins, setFloatCoins] = useState([]);

  useEffect(() => { loadAll(); window.addEventListener('taskEarning', loadAll); return () => window.removeEventListener('taskEarning', loadAll); }, []);
  const loadAll = async () => {
    try {
      const [g, s, c] = await Promise.all([giftsApi.list(), referralApi.getStats(), claimsApi.list()]);
      setGifts(g.data); setStats(s.data); setClaims(c.data);
    } catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };

  const tg = (gift) => {
    const gd = i18n.getResource(i18n.language, 'translation', 'giftData');
    return (gd && gd[gift.name]) ? gd[gift.name] : { name: gift.name, desc: gift.description };
  };

  const effective = stats?.effective_invites || 0;
  const totalEarned = claims.filter(c => c.status !== 'rejected').reduce((s, c) => s + (c.value || 0), 0);
  const maxReq = Math.max(...gifts.map(g => g.required_invites), 1);
  const nextGift = gifts.find(g => g.required_invites > effective);
  const topGift = [...gifts].reverse().find(g => g.required_invites <= effective);

  const openEnv = () => {
    setShowEnv(true);
    setFloatCoins(Array.from({ length: 8 }, (_, i) => ({ id: i, x: Math.random() * 200 - 100, delay: Math.random() * 0.3 })));
    setTimeout(() => { setShowEnv(false); setFloatCoins([]); }, 1500);
  };

  if (loading) return (
    <div className="p-4 space-y-3">
      <div className="skeleton h-40 rounded-2xl" />
      <div className="skeleton h-8 rounded-full" />
      <div className="skeleton h-48 rounded-2xl" />
      <div className="skeleton h-32 rounded-2xl" />
    </div>
  );

  return (
    <PullToRefresh onRefresh={loadAll}>
    <div className="tab-enter bg-gradient-to-b from-[#0d0d1a] to-[#141420] min-h-screen">
      {/* ── Compact Hero ── */}
      <div className="bg-gradient-to-br from-[#c8a06e] via-[#b8905e] to-[#a07840] px-5 pt-10 pb-5 shadow-xl shadow-purple-500/20 relative overflow-hidden">
        {/* Red envelope rain */}
        {['🧧','🎁','💰','🎊'].map((e, i) => (
          <span key={i} className="absolute text-xl animate-env-rain pointer-events-none select-none"
            style={{ left: `${15 + i * 25}%`, top: '-30px', animationDuration: `${4 + i * 1.5}s`, animationDelay: `${i * 0.8}s`, opacity: 0.15 }}>
            {e}
          </span>
        ))}
        <div className="h-4" />
        {/* User + Earnings in one row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/10">
              {(user?.name || user?.email || '?')[0].toUpperCase()}
            </div>
            <span className="text-white/80 text-sm font-medium">{user?.name || user?.email}</span>
          </div>
        </div>

        {/* Stats + Boost combined */}
        <div className="bg-black/15 backdrop-blur rounded-2xl p-3.5">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1 grid grid-cols-3 gap-5 text-center px-2">
              <div><p className="text-white font-bold text-lg">{effective}</p><p className="text-white/40 text-[12px]">{t('gifts.effectiveInvites')}</p></div>
              <div><p className="text-white font-bold text-lg">{stats?.direct_count || 0}</p><p className="text-white/40 text-[12px]">{t('mine.directInvites')}</p></div>
              <div><p className="text-white font-bold text-lg">{stats?.total_invites || 0}</p><p className="text-white/40 text-[12px]">{t('tasks.totalInvites')}</p></div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2.5 bg-white/15 rounded-full progress-glow">
            <div className="h-full rounded-full bg-gradient-to-r from-[#e0c78e] via-[#FF6B00] to-[#FF3D00] transition-all duration-700"
              style={{ width: `${Math.min(100, (effective / maxReq) * 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-white/60 text-[12px] font-medium">
              {nextGift ? `🔥 ${t('home.boostNeed', { count: nextGift.required_invites - effective, amount: nextGift.value })}` : t('home.boostAllDone')}
            </span>
            {topGift && <span className="text-gold text-[12px] font-bold">{t('home.boostUnlocked')} ${topGift.value}</span>}
          </div>
        </div>
      </div>

      {/* ── Marquee ── */}
      <div className="relative z-20 -mt-3 mx-4">
        <div className="bg-white rounded-full shadow-lg border border-separator py-2.5 px-4 overflow-hidden flex items-center gap-2">
          <span className="text-base shrink-0">📢</span>
          <div className="overflow-hidden flex-1" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
            <div className="whitespace-nowrap text-[13px] text-text font-medium" style={{ animation: 'marquee 24s linear infinite' }}>
              {marqueeMessages.map((m, i) => (
                <span key={i} className="mr-16">{t(`home.${m}`)}</span>
              ))}
              {marqueeMessages.map((m, i) => (
                <span key={`d-${i}`} className="mr-16">{t(`home.${m}`)}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Gift Grid - 2 columns to use space ── */}
      <div className="mt-4 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-text">🎁 {t('gifts.title')}</h2>
          <button onClick={() => navigate('/tasks')} className="text-xs text-primary font-semibold bg-primary/5 px-3 py-1.5 rounded-full">
            {t('nav.tasks')} →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {gifts.map((gift) => {
            const done = effective >= gift.required_invites;
            const pct = Math.min(100, (effective / gift.required_invites) * 100);
            return (
              <div key={gift.id} onClick={() => navigate(`/gift/${gift.id}`)}
                className={`rounded-2xl p-3.5 border-2 transition-all press-active cursor-pointer card-tilt ${done ? 'glow-border' : ''} ${
                  done
                    ? 'bg-gradient-to-b from-[#FFF9E6] to-[#FFF3CC] border-gold shadow-md shadow-gold/15'
                    : 'bg-white border-separator shadow-sm'
                }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-2xl">{gift.gift_type === 'cash' ? '🧧' : '🎁'}</span>
                  {done && <span className="text-[12px] bg-gold text-white px-1.5 py-0.5 rounded-full font-bold animate-bounce-pulse">{t('home.claimBadge')}</span>}
                </div>
                <h3 className="font-semibold text-[12px] text-text leading-tight line-clamp-2 h-8">{tg(gift).name}</h3>
                <p className="text-lg font-black text-primary mt-0.5 tracking-tight">${gift.value}</p>
                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${done ? 'bg-gold' : 'bg-gradient-to-r from-primary to-accent'}`}
                    style={{ width: `${pct}%` }} />
                </div>
                <p className={`text-[12px] font-bold mt-1 ${done ? 'text-gold' : 'text-text-muted'}`}>
                  {done ? '✅' : t('home.needPeople', { count: gift.required_invites })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="px-4 mt-4">
        <button onClick={() => navigate('/tasks')}
          className="w-full py-3.5 bg-gradient-to-r from-[#c8a06e] via-[#b8905e] to-[#a07840] text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm">
          📨 {t('home.inviteNow')}
        </button>
      </div>

      {/* ── Recent Claims ── */}
      {claims.length > 0 && (
        <div className="px-4 mt-4 mb-6">
          <h3 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-2">{t('home.recentActivity')}</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-separator divide-y divide-separator">
            {claims.slice(0, 6).map((c) => (
              <div key={c.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-lg shrink-0">🧧</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-text">{tg({ name: c.gift_name }).name}</p>
                  <p className="text-[12px] text-text-muted">{(c.claimed_at || '').slice(0, 10)}</p>
                </div>
                <span className="text-sm font-black text-[#FF6B00]">+${c.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Envelope Modal ── */}
      {showEnv && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowEnv(false)}>
          <div className="text-center animate-env-open" onClick={e => e.stopPropagation()}>
            <div className="text-[100px] cursor-pointer select-none">🧧</div>
            <p className="text-white font-bold text-2xl mt-3 drop-shadow-lg">${totalEarned.toFixed(0)}</p>
            <p className="text-white/70 text-sm mt-1">{t('home.balanceBig')}</p>
            {floatCoins.map(c => (
              <span key={c.id} className="absolute top-1/2 left-1/2 text-2xl animate-float-up pointer-events-none"
                style={{ animationDelay: `${c.delay}s`, marginLeft: `${c.x}px` }}>💰</span>
            ))}
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
