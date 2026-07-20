import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { giftsApi } from '../api/gifts';
import { claimsApi } from '../api/claims';
import { referralApi } from '../api/referral';
import toast from 'react-hot-toast';

export default function GiftHallPage() {
  const { t, i18n } = useTranslation();
  const [gifts, setGifts] = useState([]);

  // Translate gift name/description using i18n giftData
  const tg = (gift) => {
    const key = gift.name; // raw gift name from server, used as giftData translation key
    const gd = i18n.getResource(i18n.language, 'translation', 'giftData');
    if (gd && gd[key]) return gd[key];
    return { name: gift.name, desc: gift.description };
  };
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [detailGift, setDetailGift] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [giftsRes, statsRes] = await Promise.all([giftsApi.list(), referralApi.getStats()]);
      setGifts(giftsRes.data);
      setStats(statsRes.data);
    } catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };

  const handleClaim = async (gift) => {
    setClaiming(gift.id);
    try {
      await claimsApi.create(gift.id);
      toast.success(`✅ ${tg(gift).name} claimed!`);
      setDetailGift(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.operationFailed'));
    } finally { setClaiming(null); }
  };

  const effective = stats?.effective_invites || 0;
  const nextGift = gifts.find(g => g.required_invites > effective);

  if (loading) return (
    <div className="p-4 space-y-3 animate-fade-in">
      <div className="skeleton h-24 rounded-2xl" />
      <div className="skeleton h-40 rounded-2xl" />
      <div className="skeleton h-40 rounded-2xl" />
    </div>
  );

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="bg-gradient-to-br from-primary via-primary to-primary-dark rounded-2xl p-5 text-white shadow-lg shadow-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/80 text-xs mb-0.5">{t('gifts.effectiveInvites')}</p>
            <p className="text-3xl font-bold">{effective}</p>
          </div>
          <div className="text-4xl">🎯</div>
        </div>
        {nextGift ? (
          <div className="bg-white/15 rounded-xl p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-white/80">{t('gifts.nextGoal')}: {tg(nextGift).name}</span>
              <span className="text-xs text-white/80">{effective}/{nextGift.required_invites}</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gold rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (effective / nextGift.required_invites) * 100)}%` }} />
            </div>
            <p className="text-xs mt-1.5 text-white/70">
              {t('gifts.needMore')} <strong className="text-gold-light">{nextGift.required_invites - effective}</strong> {t('gifts.peopleToGet')}{nextGift.value}
            </p>
          </div>
        ) : (
          <p className="text-white/80 text-sm mt-1">{t('gifts.allDone')}</p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">🎁 {t('gifts.title')}</h2>
        {gifts.map((gift) => {
          const canClaim = effective >= gift.required_invites;
          const progress = Math.min(100, (effective / gift.required_invites) * 100);
          return (
            <div key={gift.id} onClick={() => setDetailGift(gift)} className={`bg-white rounded-2xl p-4 shadow-sm border transition-all active:scale-[0.98] cursor-pointer ${canClaim ? 'border-primary/30 shadow-primary/10' : 'border-gray-100 hover:border-gray-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${canClaim ? 'bg-primary/10' : 'bg-gray-100'}`}>
                    {gift.gift_type === 'cash' ? '🧧' : gift.gift_type === 'physical' ? '📦' : '🎟️'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary text-sm">{tg(gift).name}</h3>
                    <p className="text-xs text-text-muted mt-0.5">{tg(gift).desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">${gift.value}</p>
                  <p className="text-[11px] text-text-muted">{gift.gift_type === 'cash' ? t('gifts.cash') : gift.gift_type === 'physical' ? t('gifts.physical') : t('gifts.virtual')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${canClaim ? 'text-success' : 'text-text-muted'}`}>
                  {canClaim ? `✅ ${t('gifts.claimable')}` : `${t('gifts.needInvite')} ${gift.required_invites} ${t('gifts.people')}`}
                </span>
                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${canClaim ? 'bg-success' : 'bg-gold'}`} style={{ width: `${progress}%` }} />
                </div>
              </div>
              {gift.stock > 0 && <p className="text-[11px] text-text-muted mt-2">{t('gifts.remaining')} {gift.stock} {t('gifts.copies')}</p>}
            </div>
          );
        })}
      </div>

      {detailGift && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailGift(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-[480px] p-6 animate-slide-up max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="text-center mb-6">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-5xl mx-auto mb-3 ${effective >= detailGift.required_invites ? 'bg-primary/10' : 'bg-gray-100'}`}>{detailGift.gift_type === 'cash' ? '🧧' : '🎁'}</div>
              <h2 className="text-xl font-bold text-text-primary">{tg(detailGift).name}</h2>
              <p className="text-3xl font-bold text-primary mt-1">${detailGift.value}</p>
              <p className="text-sm text-text-muted mt-1">{tg(detailGift).desc}</p>
            </div>
            <div className="bg-warm-bg rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm mb-2"><span className="text-text-secondary">{t('gifts.detail.requiredInvites')}</span><span className="font-semibold text-text-primary">{detailGift.required_invites} {t('common.people')}</span></div>
              <div className="flex justify-between text-sm mb-2"><span className="text-text-secondary">{t('gifts.detail.currentInvites')}</span><span className="font-semibold text-text-primary">{effective} {t('common.people')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-secondary">{t('gifts.detail.progress')}</span><span className={`font-semibold ${effective >= detailGift.required_invites ? 'text-success' : 'text-primary'}`}>{Math.min(100, Math.round((effective / detailGift.required_invites) * 100))}%</span></div>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden"><div className={`h-full rounded-full transition-all ${effective >= detailGift.required_invites ? 'bg-success' : 'bg-gold'}`} style={{ width: `${Math.min(100, (effective / detailGift.required_invites) * 100)}%` }} /></div>
            </div>
            <button onClick={() => handleClaim(detailGift)} disabled={effective < detailGift.required_invites || claiming}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${effective >= detailGift.required_invites ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/25' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {claiming === detailGift.id ? t('gifts.claiming') : effective >= detailGift.required_invites ? `🎁 ${t('gifts.claimNow')}` : `${detailGift.required_invites - effective} ${t('gifts.cantClaim')}`}
            </button>
            <button onClick={() => setDetailGift(null)} className="w-full py-3 mt-2 text-text-muted text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">{t('gifts.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
