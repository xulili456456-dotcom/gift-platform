import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { referralApi } from '../api/referral';
import { Crown, Star, Check, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const TIERS = [
  { key: 'vip.tier0', icon: Star, min: 0, color: 'text-text-muted', bg: 'bg-bg', border: 'border-separator', gradient: 'from-gray-400 to-gray-500' },
  { key: 'vip.tier1', icon: Crown, min: 5, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', gradient: 'from-slate-400 to-slate-500' },
  { key: 'vip.tier2', icon: Crown, min: 15, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', gradient: 'from-amber-400 to-amber-500' },
  { key: 'vip.tier3', icon: Crown, min: 50, color: 'text-indigo-400', bg: 'bg-indigo-50', border: 'border-indigo-200', gradient: 'from-indigo-400 to-violet-500' },
  { key: 'vip.tier4', icon: Crown, min: 150, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20', gradient: 'from-primary to-accent' },
];

export default function VipPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    referralApi.getStats()
      .then(({ data }) => setStats(data))
      .catch(() => toast.error(t('common.loadingFailed')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-bg p-4 space-y-4">
      <div className="skeleton h-8 w-32" /><div className="skeleton h-48 rounded-2xl" /><div className="skeleton h-64 rounded-2xl" />
    </div>
  );

  const effective = stats?.effective_invites || 0;
  let currentIdx = 0, nextIdx = 1;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (effective >= TIERS[i].min) { currentIdx = i; nextIdx = i + 1; break; }
  }
  const currentTier = TIERS[currentIdx];
  const nextTier = TIERS[nextIdx] || null;
  const CurIcon = currentTier.icon;

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-separator">
        <button onClick={() => navigate('/mine')} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          {t('common.back')}
        </button>
        <h2 className="text-[16px] font-bold text-text">{t('vip.title')}</h2>
      </div>

      <div className="p-4 space-y-5">
        {/* Current Tier Hero */}
        <div className={`bg-gradient-to-br ${currentTier.gradient} rounded-2xl p-5 text-white shadow-xl`}>
          <p className="text-white/60 text-[11px] uppercase tracking-wider mb-1">{t('vip.title')}</p>
          <div className="flex items-center gap-3 mb-3">
            <CurIcon size={32} className="text-white" />
            <div>
              <p className="text-xl font-bold">{t(currentTier.key)}</p>
              <p className="text-white/60 text-[12px]">{t('vip.effectiveInvites')}: {effective}</p>
            </div>
          </div>
          {nextTier && (
            <div>
              <div className="flex justify-between text-[10px] text-white/50 mb-1">
                <span>{t(currentTier.key)}</span>
                <span>{t('vip.needMore', { count: nextTier.min - effective })} {t(nextTier.key)}</span>
              </div>
              <div className="w-full h-2.5 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((effective - currentTier.min) / (nextTier.min - currentTier.min)) * 100)}%` }} />
              </div>
            </div>
          )}
          {!nextTier && <p className="text-white/70 text-[12px] font-semibold">{t('vip.maxLevel')}</p>}
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-2xl border border-separator p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-text mb-4">{t('vip.benefits')}</h3>
          <div className="space-y-3 text-[13px]">
            {[
              { l: t('vip.b1'), v: ['1.0x', '1.05x', '1.1x', '1.15x', '1.2x'], c: t('vip.b1desc') },
              { l: t('vip.b2'), v: ['❌', '❌', '✅', '✅', '✅'], c: t('vip.b2desc') },
              { l: t('vip.b3'), v: ['❌', '❌', '❌', '✅', '✅'], c: t('vip.b3desc') },
              { l: t('vip.b4'), v: ['❌', '✅', '✅', '✅', '✅'], c: t('vip.b4desc') },
            ].map((b, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-separator last:border-0">
                <div>
                  <p className="font-semibold text-text">{b.l}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{b.c}</p>
                </div>
                <span className={`font-bold ${b.v[currentIdx] === '✅' ? 'text-success' : b.v[currentIdx] === '❌' ? 'text-text-muted' : 'text-primary'}`}>
                  {b.v[currentIdx]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* All Tiers */}
        <div>
          <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-3 ml-1">{t('vip.allTiers')}</h3>
          <div className="space-y-2">
            {TIERS.map((tier, i) => {
              const Icon = tier.icon;
              const achieved = effective >= tier.min;
              const isCurrent = i === currentIdx;
              return (
                <div key={i}
                  className={`bg-white rounded-xl p-4 flex items-center gap-3 border shadow-sm transition-all ${
                    isCurrent ? tier.border + ' ' + tier.bg : 'border-separator opacity-60'
                  }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${achieved ? tier.bg : 'bg-bg'}`}>
                    <Icon size={20} className={achieved ? tier.color : 'text-text-muted'} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold text-text">{t(tier.key)}</p>
                      {isCurrent && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{t('vip.current')}</span>}
                    </div>
                    <p className="text-[11px] text-text-muted">{t('vip.effectiveInvites')} ≥ {tier.min}</p>
                  </div>
                  {achieved && <Check size={18} className="text-success" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
