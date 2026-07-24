import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { giftsApi } from '../api/gifts';
import { claimsApi } from '../api/claims';
import { referralApi } from '../api/referral';
import { Gift, TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GiftDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [gift, setGift] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    Promise.all([giftsApi.detail(id), referralApi.getStats()])
      .then(([g, s]) => { setGift(g.data); setStats(s.data); })
      .catch(() => toast.error(t('common.loadingFailed')))
      .finally(() => setLoading(false));
  }, [id]);

  const tg = (name) => {
    const gd = i18n.getResource(i18n.language, 'translation', 'giftData');
    return (gd && gd[name]) ? gd[name] : { name, desc: '' };
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await claimsApi.create(gift.id);
      toast.success(t('claim.submitOk'));
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.error || t('claim.submitFail'));
    } finally { setClaiming(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-bg p-4 space-y-4">
      <div className="skeleton h-8 w-32" /><div className="skeleton h-56 rounded-2xl" /><div className="skeleton h-48 rounded-2xl" />
    </div>
  );
  if (!gift) return (
    <div style={{minHeight:'100vh',background:'#f2f2f7',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{fontSize:13,color:'#999'}}>Gift not found</p>
    </div>
  );

  const effective = stats?.effective_invites || 0;
  const canClaim = effective >= gift.required_invites;
  const pct = Math.min(100, (effective / gift.required_invites) * 100);

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-separator">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary font-medium text-sm pr-2 py-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          {t('common.back')}
        </button>
        <h2 className="text-[16px] font-bold text-text">{tg(gift.name).name}</h2>
      </div>

      <div className="p-4 space-y-5">
        {/* Gift Hero */}
        <div className={`rounded-2xl p-6 text-center shadow-xl ${
          canClaim
            ? 'bg-gradient-to-br from-[#1E1E32] to-[#262636] border-2 border-gold'
            : 'bg-white border border-separator'
        }`}>
          <div className="text-6xl mb-4">{gift.gift_type === 'cash' ? '🧧' : '🎁'}</div>
          <p className="text-3xl font-black text-primary">${gift.value}</p>
          <p className="text-[13px] text-text-secondary mt-2">{tg(gift.name).desc}</p>
        </div>

        {/* KYC Notice */}
        <div className="bg-[#FFF3E0] rounded-xl border border-[#FFB74D] border-l-4 border-l-[#FF9800] p-4 flex gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-[#E65100] mb-1">{t('gifts.kycNotice')}</p>
            <p className="text-[12px] text-[#8D6E63] leading-relaxed">{t('gifts.kycNoticeDesc')}</p>
          </div>
        </div>

        {/* KYC Steps */}
        <div className="bg-[#F5F7FA] rounded-xl p-4">
          <p className="text-[12px] font-bold text-[#546E7A] mb-3 uppercase tracking-wide">📋 {t('gifts.kycStepsTitle')}</p>
          {[
            { key: 'kycStep1', done: true },
            { key: 'kycStep2', done: true },
            { key: 'kycStep3', done: false },
            { key: 'kycStep4', done: false },
          ].map((step, i) => (
            <div key={step.key} className="flex items-center gap-2.5 py-2">
              <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${step.done ? 'bg-[#4CAF50] text-white' : 'bg-[#FF9800] text-white'}`}>{i + 1}</span>
              <span className={`text-[12px] ${step.done ? 'text-[#388E3C] font-semibold' : 'text-[#607D8B]'}`}>{t(`gifts.${step.key}`)}</span>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-separator p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-text mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            {t('gifts.detail.progress')}
          </h3>
          <div className="flex items-center justify-between text-[13px] mb-2">
            <span className="text-text-secondary">{t('gifts.detail.requiredInvites')}</span>
            <span className="font-bold text-text">{gift.required_invites} {t('common.people')}</span>
          </div>
          <div className="flex items-center justify-between text-[13px] mb-3">
            <span className="text-text-secondary">{t('gifts.kycEffectiveInvites')}</span>
            <span className="font-bold text-text">{effective} {t('common.people')}</span>
          </div>
          <div className="w-full h-3 bg-bg rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${
              canClaim ? 'bg-success' : 'bg-gradient-to-r from-primary to-accent'
            }`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            {canClaim ? `✅ ${t('gifts.claimable')}` : `${t('gifts.cantClaim')} ${gift.required_invites - effective} ${t('common.people')}`}
          </p>
        </div>

        {/* Gift Info */}
        <div className="bg-white rounded-2xl border border-separator p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-text mb-4 flex items-center gap-2">
            <Gift size={18} className="text-primary" />
            {t('gifts.title')}
          </h3>
          <div className="space-y-3 text-[13px]">
            <div className="flex justify-between py-2 border-b border-separator">
              <span className="text-text-secondary">{t('gifts.detail.requiredInvites')}</span>
              <span className="font-semibold">{gift.required_invites} {t('common.people')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-separator">
              <span className="text-text-secondary">{t('admin.giftForm.type')}</span>
              <span className="font-semibold">{gift.gift_type === 'cash' ? t('gifts.cash') : t('gifts.physical')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-separator">
              <span className="text-text-secondary">{t('gifts.detail.progress')}</span>
              <span className={`font-semibold ${canClaim ? 'text-success' : 'text-primary'}`}>{Math.round(pct)}%</span>
            </div>
            {gift.stock > 0 && (
              <div className="flex justify-between py-2 border-b border-separator">
                <span className="text-text-secondary">{t('gifts.remaining')}</span>
                <span className="font-semibold">{gift.stock} {t('gifts.copies')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Claim Button */}
        <button onClick={handleClaim} disabled={!canClaim || claiming}
          className={`w-full py-4 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98] ${
            canClaim
              ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/20'
              : 'bg-gray-200 text-gray-400'
          }`}>
          {claiming ? '...' : canClaim ? `🎁 ${t('gifts.claimNow')} $${gift.value}` : `${t('gifts.cantClaim')} ${gift.required_invites - effective} ${t('common.people')}`}
        </button>
      </div>
    </div>
  );
}
