import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { referralApi } from '../api/referral';
import { giftsApi } from '../api/gifts';
import client from '../api/client';
import PullToRefresh from '../components/shared/PullToRefresh';
import { CheckCircle, Play, Flame, Copy, Info, Store, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

const TIER_ICONS = { small: '🏪', medium: '🏬', large: '🏢' };

export default function TasksPage() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState(null);
  const [gifts, setGifts] = useState([]);
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState({ available: 0, total: 0, checkedToday: false, adsToday: 0, streak: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [store, setStore] = useState(null);

  const loadAll = async () => {
    try {
      const [s, g, c, b, st] = await Promise.all([
        referralApi.getStats(), giftsApi.list(), referralApi.getCode(),
        client.get('/tasks/balance'), client.get('/store/status')
      ]);
      setStats(s.data); setGifts(g.data); setInviteData(c.data);
      setBalance(b.data); setStore(st.data);
    } catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); window.addEventListener('taskEarning', loadAll); return () => window.removeEventListener('taskEarning', loadAll); }, []);

  const doCheckin = async () => {
    setSubmitting(true);
    try {
      const { data } = await client.post('/tasks/checkin');
      toast.success(`✅ +$${data.amount} 签到成功`);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || '签到失败'); }
    finally { setSubmitting(false); }
  };

  const watchAd = async () => {
    setSubmitting(true);
    try {
      const { data } = await client.post('/tasks/ad');
      toast.success(`+$${data.amount} 广告奖励已到账`);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || '失败'); }
    finally { setSubmitting(false); }
  };

  const handleOpenStore = async (tier) => {
    setSubmitting(true);
    try {
      await client.post('/store/open', { tier });
      toast.success(t('store.openSuccess'));
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || t('common.operationFailed')); }
    finally { setSubmitting(false); }
  };

  const handleProcess = async () => {
    setSubmitting(true);
    try {
      const { data } = await client.post('/store/orders/process');
      toast.success(`📦 +$${data.amount} ${t('store.earned')}`);
      loadAll();
    } catch (err) { toast.error(err.response?.data?.error || t('common.operationFailed')); }
    finally { setSubmitting(false); }
  };

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error(t('common.operationFailed')); }
  };

  const tg = (gift) => {
    const gd = i18n.getResource(i18n.language, 'translation', 'giftData');
    return (gd && gd[gift.name]) ? gd[gift.name] : { name: gift.name, desc: gift.description };
  };

  if (loading) return (
    <div className="p-4 space-y-4"><div className="skeleton h-40 rounded-2xl" /><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-48 rounded-2xl" /></div>
  );

  const effective = stats?.effective_invites || 0;
  const breakdown = stats?.breakdown || { level1: 0, level2: 0, level3: 0 };

  return (
    <PullToRefresh onRefresh={loadAll}>
    <div className="tab-enter bg-gradient-to-b from-[#FFF0F3] to-[#FFF5F8] min-h-screen pb-4">
      <div className="bg-gradient-to-r from-[#E8225A] to-[#8B2FC9] px-5 py-3 text-white text-center">
        <p className="text-[11px] text-white/60">{t('mine.totalEarned')}</p>
        <p className="text-2xl font-black">${balance.total.toFixed(2)}</p>
      </div>
      <div className="p-4 space-y-5">
        {/* Check-in */}
        <div className="bg-white rounded-2xl border border-separator shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-separator flex items-center justify-between">
            <div className="flex items-center gap-2"><Flame size={20} className="text-amber-500" /><span className="text-[14px] font-bold text-text">{t('tasks.checkin')}</span></div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {[1,2,3,4,5,6,7].map(day => {
                const done = day <= balance.streak;
                return (
                  <div key={day} className={`text-center py-2 rounded-xl text-[10px] font-semibold ${done ? 'bg-amber-50 text-amber-600' : 'bg-bg text-text-muted'}`}>
                    <p>D{day}</p><p className="text-[11px] font-bold mt-0.5">${(0.1 * day).toFixed(1)}</p>
                    {done && <CheckCircle size={12} className="mx-auto mt-0.5 text-amber-500" />}
                  </div>
                );
              })}
            </div>
            <button onClick={doCheckin} disabled={balance.checkedToday || submitting}
              className={`w-full py-3 rounded-xl text-[13px] font-bold ${balance.checkedToday ? 'bg-bg text-text-muted' : 'bg-gradient-to-r from-amber-400 to-amber-500 text-white active:scale-[0.98]'}`}>
              {balance.checkedToday ? `✅ ${t('tasks.checkedIn')}` : `${t('tasks.checkinNow')} +$${0.1}`}
            </button>
          </div>
        </div>

        {/* Watch Ad */}
        <div className="bg-white rounded-2xl border border-separator shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Play size={20} className="text-primary" /><span className="text-[14px] font-bold text-text">{t('tasks.watchAd')}</span></div>
            <span className="text-[11px] text-text-muted">{balance.adsToday}/3</span>
          </div>
          <div className="flex gap-2 mb-3">
            {[1,2,3].map(i => (
              <div key={i} className={`flex-1 py-2 rounded-lg text-center text-[11px] font-semibold ${balance.adsToday >= i ? 'bg-success/10 text-success' : 'bg-bg text-text-muted'}`}>
                {balance.adsToday >= i ? '✅' : '📺'} $0.5
              </div>
            ))}
          </div>
          <button onClick={watchAd} disabled={balance.adsToday >= 3 || submitting}
            className={`w-full py-2.5 rounded-xl text-[13px] font-bold ${balance.adsToday >= 3 ? 'bg-bg text-text-muted' : 'bg-primary text-white active:scale-[0.98]'}`}>
            {balance.adsToday >= 3 ? t('tasks.adDone') : `${t('tasks.watchAdNow')} +$0.5`}
          </button>
        </div>

        {/* ── 电商 ── */}
        <div className="bg-white rounded-2xl border border-separator shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-separator flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#FF6B00]" />
            <span className="text-[14px] font-bold text-text">{t('store.title')}</span>
            {store?.hasStore && <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success font-bold">{TIER_ICONS[store.store.tier]} {store.store.tierName}</span>}
          </div>

          {store?.hasStore ? (
            <div className="p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">{t('store.todayProgress')}</span>
                <span className="font-bold text-text">{store.store.doneToday}/{store.store.dailyOrders}</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FFB800] rounded-full transition-all"
                  style={{ width: `${store.store.dailyOrders > 0 ? (store.store.doneToday / store.store.dailyOrders) * 100 : 0}%` }} />
              </div>
              <div className="flex justify-between text-xs text-text-muted mb-3">
                <span>{t('store.todayEarnings')}: <b className="text-success">${store.store.todayEarnings.toFixed(2)}</b></span>
                <span>{t('store.perOrder')}: ${store.store.minReward}-${store.store.maxReward}</span>
              </div>
              <button onClick={handleProcess} disabled={store.store.remaining <= 0 || submitting}
                className={`w-full py-2.5 rounded-xl text-[13px] font-bold ${store.store.remaining <= 0 ? 'bg-bg text-text-muted' : 'bg-gradient-to-r from-[#FF6B00] to-[#FFB800] text-white active:scale-[0.98]'}`}>
                {store.store.remaining > 0 ? `📦 ${t('store.processOrder')} (${store.store.remaining} ${t('store.remaining')})` : `✅ ${t('store.allDone')}`}
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              <p className="text-[12px] text-text-muted mb-2">{t('store.subtitle')}</p>
              {[
                { tier: 'small', name: t('store.small'), deposit: 10, daily: 10, range: '$0.05-0.3' },
                { tier: 'medium', name: t('store.medium'), deposit: 50, daily: 20, range: '$0.1-0.5' },
                { tier: 'large', name: t('store.large'), deposit: 200, daily: 40, range: '$0.2-1.0' },
              ].map(tier => (
                <button key={tier.tier} onClick={() => handleOpenStore(tier.tier)} disabled={submitting}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-bg hover:bg-separator/50 transition-colors disabled:opacity-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{TIER_ICONS[tier.tier]}</span>
                    <div className="text-left">
                      <p className="text-[13px] font-bold text-text">{tier.name}</p>
                      <p className="text-[10px] text-text-muted">{tier.daily}单/天 · {tier.range}/单</p>
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-primary">${tier.deposit}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Explanation Tooltip */}
        {showExplain && (
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl p-4 border border-primary/10 animate-scale-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-bold text-text">{t('team.title')}</span>
              <button onClick={() => setShowExplain(false)} className="text-text-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="space-y-1.5 text-[12px] text-text-secondary leading-relaxed">
              <div className="flex gap-2"><span className="text-primary font-bold shrink-0">{t('tasks.level1')}：</span><span dangerouslySetInnerHTML={{ __html: t('team.level1Desc') }} /></div>
              <div className="flex gap-2"><span className="text-purple-500 font-bold shrink-0">{t('tasks.level2')}：</span><span dangerouslySetInnerHTML={{ __html: t('team.level2Desc') }} /></div>
              <div className="flex gap-2"><span className="text-amber-500 font-bold shrink-0">{t('tasks.level3')}：</span><span dangerouslySetInnerHTML={{ __html: t('team.level3Desc') }} /></div>
            </div>
          </div>
        )}

        {/* Invite Progress */}
        <div>
          <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-3 ml-1">{t('tasks.inviteProgress')}</h3>
          <div className="bg-gradient-to-br from-[#E8225A] via-[#D4206A] to-[#8B2FC9] rounded-2xl p-5 text-white shadow-xl shadow-purple-500/20">
            <div className="flex items-center gap-4">
              <div className="relative w-[80px] h-[80px] shrink-0">
                <svg className="w-[80px] h-[80px] -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#FFB800" strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={`${Math.min(214, (effective / Math.max(...gifts.map(g => g.required_invites), 1)) * 214)} 214`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black">{effective}</span>
                  <button onClick={() => setShowExplain(!showExplain)} className="text-[8px] text-white/60 flex items-center gap-0.5 hover:text-white transition-colors">
                    {t('gifts.effectiveInvites')} <Info size={10} />
                  </button>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {[{ l: t('tasks.level1'), v: breakdown.level1, r: 'x1.0' }, { l: t('tasks.level2'), v: breakdown.level2, r: 'x0.5' }, { l: t('tasks.level3'), v: breakdown.level3, r: 'x0.25' }].map((x, i) => (
                  <div key={i} className="flex justify-between bg-white/10 rounded-lg px-3 py-1.5 text-[11px]"><span>{x.l} <span className="opacity-50">{x.r}</span></span><span className="font-bold">{x.v}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gift Milestones */}
        <div>
          <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-3 ml-1">🎯 {t('tasks.milestones')}</h3>
          <div className="bg-white rounded-2xl border border-separator divide-y divide-separator">
            {gifts.map(gift => {
              const done = effective >= gift.required_invites;
              return (
                <div key={gift.id} className={`px-4 py-3 flex items-center gap-3 ${done ? 'bg-gradient-to-r from-[#FFF9E6]/50' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${done ? 'bg-gold/10' : 'bg-bg'}`}>{done ? '✅' : '🧧'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1"><span className="text-[13px] font-semibold text-text">{tg(gift).name}</span><span className={`text-[14px] font-black ${done ? 'text-gold' : 'text-primary'}`}>${gift.value}</span></div>
                    <div className="w-full h-2 bg-bg rounded-full overflow-hidden"><div className={`h-full rounded-full ${done ? 'bg-gold' : 'bg-gradient-to-r from-primary to-accent'}`} style={{ width: `${Math.min(100, (effective / gift.required_invites) * 100)}%` }} /></div>
                    <p className="text-[11px] text-text-muted mt-1">{effective}/{gift.required_invites} {t('common.people')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite Tools */}
        <div>
          <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-3 ml-1">📨 {t('home.inviteTools')}</h3>
          <div className="bg-white rounded-2xl border border-separator overflow-hidden">
            <div className="px-4 py-3 border-b border-separator">
              <div className="flex items-center gap-2"><div className="flex-1 bg-bg rounded-xl px-3 py-2.5 text-center font-mono text-lg font-black text-primary select-all">{inviteData?.referral_code || '--------'}</div>
                <button onClick={() => copyText(inviteData?.referral_code)} className="bg-primary text-white px-4 py-2.5 rounded-xl text-[12px] font-bold active:scale-95">{copied ? '✓' : t('invite.copy')}</button>
              </div>
            </div>
            <div className="px-4 py-3 border-b border-separator">
              <p className="text-[11px] text-text-secondary break-all mb-2 font-mono bg-bg rounded-lg p-2 select-all">{inviteData?.share_link || ''}</p>
              <button onClick={() => copyText(inviteData?.share_link)} className="w-full py-2.5 bg-gradient-to-r from-[#E8225A] to-[#8B2FC9] text-white font-bold rounded-xl text-[12px] active:scale-[0.98]">📋 {t('invite.copyLink')}</button>
            </div>
            {inviteData?.qr_code && (
              <div className="px-4 py-4 text-center"><img src={inviteData.qr_code} alt="QR" className="w-36 h-36 mx-auto rounded-xl border border-separator" /><p className="text-[10px] text-text-muted mt-2">{t('invite.qrHint')}</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
    </PullToRefresh>
  );
}
