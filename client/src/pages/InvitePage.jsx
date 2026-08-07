import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { referralApi } from '../api/referral';
import toast from 'react-hot-toast';

export default function InvitePage() {
  const { t } = useTranslation();
  const [inviteData, setInviteData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const [codeRes, statsRes] = await Promise.all([referralApi.getCode(), referralApi.getStats()]);
      setInviteData(codeRes.data); setStats(statsRes.data);
    } catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };

  const copyToClipboard = async (text, label) => {
    try { await navigator.clipboard.writeText(text); toast.success(label); }
    catch { toast.error(t('common.operationFailed')); }
  };

  if (loading) return (
    <div className="p-4 space-y-3 animate-fade-in">
      <div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-40 rounded-2xl" />
    </div>
  );

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white shadow-lg shadow-primary/20 text-center">
        <p className="text-white/70 text-xs mb-1">{t('invite.invitedCount')}</p>
        <p className="text-4xl font-bold">{stats?.direct_count || 0}</p>
        <p className="text-white/60 text-xs mt-1">{t('invite.effectiveStats')} {stats?.effective_invites || 0} · {t('invite.totalStats')} {stats?.total_invites || 0}</p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-text-primary text-sm mb-3">🔑 {t('invite.myCode')}</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-warm-bg rounded-xl px-4 py-3 text-center font-mono text-xl font-bold text-primary tracking-widest select-all">{inviteData?.referral_code}</div>
          <button onClick={() => copyToClipboard(inviteData?.referral_code, t('invite.codeCopied'))} className="bg-primary text-white px-4 py-3 rounded-xl font-medium text-sm active:scale-95 transition-transform">{t('invite.copy')}</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-text-primary text-sm mb-3">🔗 {t('invite.shareLink')}</h3>
        <div className="bg-warm-bg rounded-xl p-3 text-xs text-text-secondary break-all mb-3 select-all">{inviteData?.share_link}</div>
        <button onClick={() => copyToClipboard(inviteData?.share_link, t('invite.linkCopied'))} className="w-full py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all text-sm">📋 {t('invite.copyLink')}</button>
      </div>

<div className="bg-gold-light/50 rounded-2xl p-5 border border-gold/30">
        <h3 className="font-semibold text-text-primary text-sm mb-3">💡 {t('invite.shareTips')}</h3>
        <div className="space-y-2 text-xs text-text-secondary">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex gap-2"><span className="text-base">{i}️⃣</span><span>{t(`invite.tip${i}`)}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
