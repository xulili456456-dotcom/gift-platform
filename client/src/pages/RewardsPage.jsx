import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { claimsApi } from '../api/claims';
import toast from 'react-hot-toast';

export default function RewardsPage() {
  const { t, i18n } = useTranslation();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const tgName = (name) => {
    const gd = i18n.getResource(i18n.language, 'translation', 'giftData');
    if (gd && gd[name]) return gd[name].name;
    return name;
  };

  useEffect(() => { loadClaims(); }, []);
  const loadClaims = async () => {
    try { const { data } = await claimsApi.list(); setClaims(data); }
    catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };

  const statusConfig = {
    pending: { label: t('rewards.status.pending'), color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
    claimed: { label: t('rewards.status.claimed'), color: 'bg-blue-100 text-blue-700', icon: '✅' },
    delivered: { label: t('rewards.status.delivered'), color: 'bg-success-light text-success', icon: '🎉' },
    rejected: { label: t('rewards.status.rejected'), color: 'bg-red-100 text-red-600', icon: '❌' },
  };

  if (loading) return (
    <div className="p-4 space-y-3 animate-fade-in">
      <div className="skeleton h-20 rounded-2xl" /><div className="skeleton h-20 rounded-2xl" /><div className="skeleton h-20 rounded-2xl" />
    </div>
  );

  const totalEarned = claims.filter(c => c.status !== 'rejected').reduce((sum, c) => sum + (c.value || 0), 0);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="bg-gradient-to-br from-gold to-gold/80 rounded-2xl p-5 text-white shadow-lg shadow-gold/20 text-center">
        <p className="text-white/80 text-xs mb-1">{t('rewards.totalEarned')}</p>
        <p className="text-4xl font-bold">¥{totalEarned}</p>
        <p className="text-white/70 text-xs mt-1">{claims.length} {t('rewards.claimRecords')}</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">📋 {t('rewards.title')}</h2>
        {claims.length > 0 ? claims.map((claim) => {
          const config = statusConfig[claim.status] || statusConfig.pending;
          return (
            <div key={claim.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">{claim.gift_type === 'cash' ? '🧧' : '🎁'}</div>
                  <div>
                    <h3 className="font-semibold text-text-primary text-sm">{tgName(claim.gift_name)}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{t('rewards.claimTime')}: {(claim.claimed_at||'').slice(0, 16).replace('T', ' ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">¥{claim.value}</p>
                  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${config.color}`}>{config.icon} {config.label}</span>
                </div>
              </div>
              {claim.admin_note && <p className="mt-3 text-xs text-text-muted bg-warm-bg rounded-xl p-2.5">💬 {claim.admin_note}</p>}
            </div>
          );
        }) : (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <p className="text-4xl mb-3">🎁</p>
            <p className="text-text-secondary text-sm font-medium">{t('rewards.noRecords')}</p>
            <p className="text-text-muted text-xs mt-1">{t('rewards.noRecordsHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
