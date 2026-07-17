import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { claimsApi } from '../api/claims';
import { giftsApi } from '../api/gifts';
import { referralApi } from '../api/referral';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import { Users, CreditCard, Bell, Globe, Lock, Shield, LogOut, Crown, Star, ChevronRight, Info, ArrowUpRight, MessageCircle, Camera, BellRing, Store } from 'lucide-react';
import toast from 'react-hot-toast';

const langs = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
];

export default function MinePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [claims, setClaims] = useState([]);
  const [eligibleGifts, setEligibleGifts] = useState([]);
  const [effectiveInvites, setEffectiveInvites] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLang, setShowLang] = useState(false);
  const [claimingGift, setClaimingGift] = useState(null);
  const [showClaimConfirm, setShowClaimConfirm] = useState(null);

  useEffect(() => { loadData(); window.addEventListener('taskEarning', loadData); return () => window.removeEventListener('taskEarning', loadData); }, []);
  const loadData = async () => {
    try {
      const [c, g, s, b] = await Promise.all([claimsApi.list(), giftsApi.eligible(), referralApi.getStats(), client.get('/tasks/balance').catch(() => ({ data: { total: 0 } }))]);
      setClaims(c.data);
      setEligibleGifts(g.data?.eligible || []);
      setEffectiveInvites(g.data?.effective_invites || 0);
      setStats(s.data);
      setTaskBalance(b.data?.total || 0);
    } catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };
  const [taskBalance, setTaskBalance] = useState(0);

  const tgName = (name) => {
    const gd = i18n.getResource(i18n.language, 'translation', 'giftData');
    return (gd && gd[name]) ? gd[name].name : name;
  };

  const handleClaim = async (gift) => {
    setClaimingGift(gift.id);
    try {
      await claimsApi.create(gift.id);
      toast.success(t('claim.submitOk'));
      setShowClaimConfirm(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || t('claim.submitFail'));
    } finally { setClaimingGift(null); }
  };

  const handleLogout = () => {
    if (confirm(t('mine.logoutConfirm'))) {
      logout();
      window.location.replace('/login');
    }
  };

  if (loading) return (
    <div className="p-4 space-y-3">
      <div className="skeleton h-32 rounded-3xl" /><div className="skeleton h-48 rounded-2xl" />
    </div>
  );

  const totalEarned = claims.filter(c => c.status !== 'rejected').reduce((s, c) => s + (c.value || 0), 0) + taskBalance;
  const pendingClaims = claims.filter(c => c.status === 'pending');
  const deliveredClaims = claims.filter(c => c.status === 'delivered');
  const current = langs.find(l => l.code === i18n.language) || langs[0];

  return (
    <div className="tab-enter bg-gradient-to-b from-[#ffffff] to-[#f5f5f5] min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#FF5000] via-[#FF5000] to-[#E04500] px-5 pt-10 pb-5 shadow-xl shadow-purple-500/20 overflow-hidden"
        style={{ backgroundSize: '200% 200%', animation: 'gradientShift 4s ease-in-out infinite' }}>
        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: `${3 + Math.random() * 6}px`, height: `${3 + Math.random() * 6}px`,
              left: `${5 + i * 8}%`, top: `${10 + Math.random() * 80}%`,
              opacity: 0.1 + Math.random() * 0.2,
              animation: `particleFloat ${2.5 + Math.random() * 3}s ease-in-out ${i * 0.3}s infinite`,
            }} />
        ))}
        <div className="h-4 relative z-10" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-[64px] h-[64px] rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold ring-3 ring-white/10 shrink-0">
            {(user?.name || user?.email || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg">{user?.name || user?.email}</h2>
            <div className="mt-1 bg-white/15 rounded-full px-2.5 py-0.5 inline-block">
              <span className="text-white/50 text-[12px]">{t('mine.myCode')}: </span>
              <span className="text-gold font-mono font-bold text-xs tracking-widest">{user?.referral_code || '------'}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-around mt-4 bg-white/10 backdrop-blur rounded-xl py-2.5 relative z-10">
          {[
            { v: stats?.direct_count || 0, l: t('mine.directInvites') },
            { v: effectiveInvites, l: t('mine.effectiveInvites') },
            { v: pendingClaims.length, l: t('claim.pending') },
            { v: deliveredClaims.length, l: t('claim.delivered') },
          ].map((x, i) => (
            <div key={i} className="text-center"><p className="text-white font-bold text-lg">{x.v}</p><p className="text-white/40 text-[12px]">{x.l}</p></div>
          ))}
        </div>
      </div>


      {/* ═══ Membership Tier ═══ */}
      <div className="mx-4 mb-3 cursor-pointer" onClick={() => navigate('/mine/vip')}>
        <MembershipCard effectiveInvites={effectiveInvites} t={t} /></div>

      <div className="mx-4 space-y-4">
        {/* ═══ Claimable ═══ */}
        {eligibleGifts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-separator">
            <div className="px-4 py-3 border-b border-separator bg-gradient-to-r from-[#1E1E32]/50 to-transparent flex items-center gap-2">
              <span className="text-lg">🎁</span>
              <span className="text-[14px] font-bold text-text">{t('claim.available')}</span>
              <span className="text-[12px] bg-gold text-white px-2 py-0.5 rounded-full font-bold animate-bounce-pulse">{eligibleGifts.length}</span>
            </div>
            {eligibleGifts.map((gift) => (
              <div key={gift.id} className="px-4 py-3 flex items-center gap-3 border-b border-separator last:border-0">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-xl shrink-0">🧧</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-text">{tgName(gift.name)}</p>
                  <p className="text-[12px] text-text-muted">{t('claim.effectiveCount')}: {effectiveInvites} / {gift.required_invites}</p>
                </div>
                <button
                  onClick={() => setShowClaimConfirm(gift)}
                  className="bg-gradient-to-r from-[#FF5000] to-[#E04500] text-white px-4 py-2 rounded-xl text-[12px] font-bold active:scale-95 transition-transform shadow-md shadow-purple-500/20">
                  ${gift.value} {t('gifts.claimNow')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ═══ Under Review ═══ */}
        {pendingClaims.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-separator">
            <div className="px-4 py-3 border-b border-separator flex items-center gap-2">
              <span className="text-lg">⏳</span>
              <span className="text-[14px] font-bold text-text">{t('claim.pending')}</span>
              <span className="text-[12px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">{pendingClaims.length}</span>
            </div>
            {pendingClaims.map((c) => (
              <div key={c.id} className="px-4 py-3 flex items-center gap-3 border-b border-separator last:border-0">
                <span className="text-xl">🧧</span>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-text">{tgName(c.gift_name)}</p>
                  <p className="text-[12px] text-text-muted">{t('claim.submittedAt')}: {(c.claimed_at || '').slice(0, 10)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-bold text-primary">${c.value}</p>
                  <span className="text-[12px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{t('rewards.status.pending')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

{/* Withdraw */}
        <button onClick={() => navigate('/mine/withdraw')}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
          <ArrowUpRight size={22} className="text-green-500 shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-[14px] font-bold text-text">{t('withdraw.title')}</p>
            <p className="text-[12px] text-text-muted">{t('withdraw.balance')}: ${totalEarned.toFixed(2)}</p>
          </div>
          <ChevronRight size={16} className="text-text-muted shrink-0" />
        </button>


        {/* Deposit */}
        <button onClick={() => document.dispatchEvent(new CustomEvent('showContactSupport'))}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
          <CreditCard size={22} className="text-[#FF5000] shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-[14px] font-bold text-text">Deposit</p>
            <p className="text-[12px] text-text-muted">Contact support to deposit</p>
          </div>
          <ChevronRight size={16} className="text-text-muted shrink-0" />
        </button>
        {/* Staking */}
        <button onClick={() => navigate('/mine/staking')}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
          <Lock size={22} className="text-amber-500 shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-[14px] font-bold text-text">{t('stake.title')}</p>
            <p className="text-[12px] text-text-muted">{t('stake.howItWorks')}</p>
          </div>
          <ChevronRight size={16} className="text-text-muted shrink-0" />
        </button>

        {/* ═══ Sub-pages ═══ */}
        {[
          { Icon: Users, label: t('mine.myTeam'), desc: t('mine.myTeamDesc'), to: '/mine/team' },
          { Icon: CreditCard, label: t('mine.myWallet'), desc: t('mine.myWalletDesc'), to: '/mine/wallet' },
          { Icon: Store, label: t('mine.myStore'), desc: t('mine.myStoreDesc'), to: '/store' },
          { Icon: Bell, label: t('mine.messages'), desc: t('mine.messagesDesc'), to: '/mine/messages' },
        ].map(({ Icon, label, desc, to }, i) => (
          <button key={i} onClick={() => navigate(to)}
            className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
            <Icon size={22} className="text-primary shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-[14px] font-bold text-text">{label}</p>
              <p className="text-[12px] text-text-muted">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-text-muted shrink-0" />
          </button>
        ))}

        {/* Language */}
        <button onClick={() => setShowLang(!showLang)}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
          <Globe size={22} className="text-primary shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-[14px] font-bold text-text">{t('common.language')}</p>
            <p className="text-[12px] text-text-muted">{current.flag} {current.label}</p>
          </div>
          <ChevronRight size={16} className={`text-text-muted shrink-0 transition-transform ${showLang ? 'rotate-90' : ''}`} />
        </button>
        {showLang && (
          <div className="bg-white rounded-2xl shadow-sm border border-separator p-2 grid grid-cols-4 gap-2 animate-scale-in">
            {langs.map((l) => (
              <button key={l.code}
                onClick={() => { i18n.changeLanguage(l.code); localStorage.setItem('lang', l.code); setShowLang(false); }}
                className={`py-2.5 rounded-xl text-center text-sm transition-all ${i18n.language === l.code ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-bg'}`}>
                <span className="text-2xl block mb-0.5">{l.flag}</span>
                <span className={`text-[12px] font-semibold ${i18n.language === l.code ? 'text-primary' : 'text-text-secondary'}`}>{l.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* KYC */}
        <button onClick={() => navigate('/mine/kyc')}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
          <Shield size={22} className="text-primary shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-[14px] font-bold text-text">{t('kyc.title')}</p>
            <p className="text-[12px] text-text-muted">{t('kyc.unverifiedDesc')}</p>
          </div>
          <ChevronRight size={16} className="text-text-muted shrink-0" />
        </button>

        {/* Notifications */}
        <button onClick={() => navigate('/mine/notifications')}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
          <Bell size={22} className="text-primary shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-[14px] font-bold text-text">Notification Center</p>
            <p className="text-[12px] text-text-muted">View system notifications and messages</p>
          </div>
          <ChevronRight size={16} className="text-text-muted shrink-0" />
        </button>

        {/* Verify */}
        <button onClick={() => navigate('/mine/verify')}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
          <Camera size={22} className="text-primary shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-[14px] font-bold text-text">{t('verify.title')}</p>
            <p className="text-[12px] text-text-muted">{t('verify.howTo')}</p>
          </div>
          <ChevronRight size={16} className="text-text-muted shrink-0" />
        </button>

        {/* Support */}
        <button onClick={() => document.dispatchEvent(new CustomEvent('showContactSupport'))}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
          <MessageCircle size={22} className="text-primary shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-[14px] font-bold text-text">{t('support.title')}</p>
            <p className="text-[12px] text-text-muted">{t('support.online')}</p>
          </div>
          <ChevronRight size={16} className="text-text-muted shrink-0" />
        </button>

        {/* Legal */}
        <button onClick={() => navigate('/mine/legal')}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
          <Info size={22} className="text-primary shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-[14px] font-bold text-text">{t('legal.title')}</p>
            <p className="text-[12px] text-text-muted">{t('legal.terms')} · {t('legal.privacy')} · {t('legal.about')}</p>
          </div>
          <ChevronRight size={16} className="text-text-muted shrink-0" />
        </button>

        {/* Security */}
        <button onClick={() => navigate('/mine/security')}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
          <Lock size={22} className="text-primary shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-[14px] font-bold text-text">{t('security.title')}</p>
            <p className="text-[12px] text-text-muted">{t('security.subtitle')}</p>
          </div>
          <ChevronRight size={16} className="text-text-muted shrink-0" />
        </button>

        {/* Admin */}
        {user?.is_admin == true && (
          <button onClick={() => navigate('/admin')}
            className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
            <Lock size={22} className="text-primary shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-[14px] font-bold text-text">{t('mine.adminPanel')}</p>
              <p className="text-[12px] text-text-muted">{t('mine.adminDesc')}</p>
            </div>
            <ChevronRight size={16} className="text-text-muted shrink-0" />
          </button>
        )}

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-separator active:bg-bg transition-colors">
          <LogOut size={22} className="text-red-400 shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-[14px] font-bold text-red-500">{t('mine.logout')}</p>
            <p className="text-[12px] text-text-muted">{t('mine.logoutConfirm')}</p>
          </div>
        </button>
      </div>

      <p className="text-center text-[12px] text-text-muted mt-6 mb-8">{t('app.name')}</p>

      {/* ═══ Claim Confirm Modal ═══ */}
      {showClaimConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowClaimConfirm(null)}>
          <div className="bg-white rounded-3xl w-[90%] max-w-[340px] p-6 text-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="text-6xl mb-3">🧧</div>
            <h3 className="text-lg font-bold text-text mb-1">{tgName(showClaimConfirm.name)}</h3>
            <p className="text-3xl font-black text-primary">${showClaimConfirm.value}</p>
            <p className="text-[12px] text-text-muted mt-2 mb-5">
              {t('claim.confirmHint', { count: showClaimConfirm.required_invites })}<br />
              {t('claim.willSendTo')}: <strong className="text-text">{user?.phone || user?.email}</strong>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowClaimConfirm(null)}
                className="flex-1 py-3 bg-bg rounded-xl text-[13px] font-semibold text-text-secondary">{t('common.cancel')}</button>
              <button onClick={() => handleClaim(showClaimConfirm)} disabled={claimingGift === showClaimConfirm.id}
                className="flex-1 py-3 bg-gradient-to-r from-[#FF5000] to-[#E04500] text-white rounded-xl text-[13px] font-bold active:scale-95 transition-transform">
                {claimingGift === showClaimConfirm.id ? '...' : t('gifts.claimNow')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TIERS = [
  { nameKey: 'vip.tier0', icon: Star, min: 0, color: 'text-text-muted', bg: 'bg-bg', border: 'border-separator' },
  { nameKey: 'vip.tier1', icon: Crown, min: 5, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' },
  { nameKey: 'vip.tier2', icon: Crown, min: 15, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  { nameKey: 'vip.tier3', icon: Crown, min: 50, color: 'text-indigo-400', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { nameKey: 'vip.tier4', icon: Crown, min: 150, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
];

function MembershipCard({ effectiveInvites, t }) {
  // Find current tier and next tier
  let currentTier = TIERS[0];
  let nextTier = TIERS[1];
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (effectiveInvites >= TIERS[i].min) { currentTier = TIERS[i]; nextTier = TIERS[i + 1] || null; break; }
  }

  const CurrentIcon = currentTier.icon;
  const NextIcon = nextTier?.icon || Crown;
  const progress = nextTier ? Math.min(100, ((effectiveInvites - currentTier.min) / (nextTier.min - currentTier.min)) * 100) : 100;
  const needMore = nextTier ? nextTier.min - effectiveInvites : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-separator overflow-hidden">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-5 text-white overflow-hidden"
        style={{ backgroundSize: '200% 200%', animation: 'gradientShift 5s ease-in-out infinite' }}>
        {/* Glow particles */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-amber-400"
            style={{
              width: `${2 + Math.random() * 4}px`, height: `${2 + Math.random() * 4}px`,
              left: `${5 + i * 12}%`, top: `${15 + Math.random() * 70}%`,
              opacity: 0.15 + Math.random() * 0.25,
              animation: `particleFloat ${2 + Math.random() * 2}s ease-in-out ${i * 0.3}s infinite`,
            }} />
        ))}
        {/* Glow ring */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-amber-400/10 blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-amber-400/5 blur-xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="flex items-center justify-between mb-3 relative z-10">
          <span className="text-white/60 text-[11px] font-medium uppercase tracking-wider">{t('vip.title')}</span>
          {nextTier && (
            <span className="text-white/40 text-[10px]">{t('vip.nextTier')}: {t(nextTier.nameKey)}</span>
          )}
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className={`w-12 h-12 rounded-full ${currentTier.bg} flex items-center justify-center`}>
            <CurrentIcon size={24} className={currentTier.color} />
          </div>
          <div>
            <p className="text-lg font-bold">{t(currentTier.nameKey)}</p>
            <p className="text-white/50 text-[11px]">{t('vip.effectiveInvites')}: {effectiveInvites}</p>
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
              <span>{t(currentTier.nameKey)}</span>
              <span>{t('vip.needMore', { count: needMore })} {t(nextTier.nameKey)}</span>
            </div>
            <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between mt-1.5">
              {TIERS.map((tier, i) => (
                <div key={i} className={`text-[9px] font-semibold ${effectiveInvites >= tier.min ? 'text-amber-400' : 'text-white/20'}`}>
                  {tier.min}
                </div>
              ))}
            </div>
          </div>
        )}
        {!nextTier && (
          <p className="mt-3 text-amber-400 text-[11px] font-semibold">{t('vip.maxLevel')}</p>
        )}
      </div>

      {/* Benefits */}
      <div className="p-4">
        <p className="text-[12px] font-bold text-text mb-3">{t('vip.benefits')}</p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {[
            { l: t('vip.b1'), v: ['1.0x', '1.05x', '1.1x', '1.15x', '1.2x'][TIERS.indexOf(currentTier)] },
            { l: t('vip.b2'), v: currentTier.min < 15 ? '❌' : '✅' },
            { l: t('vip.b3'), v: currentTier.min < 50 ? '❌' : '✅' },
            { l: t('vip.b4'), v: currentTier.min < 5 ? '❌' : '✅' },
          ].map((b, i) => (
            <div key={i} className="bg-bg rounded-xl px-3 py-2.5 flex justify-between items-center">
              <span className="text-text-secondary">{b.l}</span>
              <span className="font-bold text-text">{b.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
