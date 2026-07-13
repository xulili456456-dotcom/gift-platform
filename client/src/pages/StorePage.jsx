import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';

const TIER_ICONS = { small: '🏪', medium: '🏬', large: '🏢' };
const STEPS = [
  { icon: '📱', key: 'browse', duration: 3, label: '浏览商品' },
  { icon: '🛒', key: 'order', duration: 2, label: '下单购买' },
  { icon: '⭐', key: 'review', duration: 1, label: '确认好评' },
];

function TierCard({ tier, info, onOpen, loading }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl shadow-md border border-separator p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{TIER_ICONS[tier]}</span>
        <div>
          <h3 className="text-lg font-bold text-text">{info.name}</h3>
          <p className="text-xs text-text-muted">{t('store.dailyOrders', { n: info.dailyOrders })}</p>
        </div>
      </div>
      <div className="bg-bg rounded-xl p-3 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-text-muted">{t('store.deposit')}</span><span className="font-bold text-primary">${info.deposit}</span></div>
        <div className="flex justify-between"><span className="text-text-muted">{t('store.perOrder')}</span><span className="font-medium text-text">${info.minReward} - ${info.maxReward}</span></div>
        <div className="flex justify-between"><span className="text-text-muted">{t('store.dailyMax')}</span><span className="font-medium text-success">${(info.dailyOrders * info.maxReward).toFixed(0)}</span></div>
      </div>
      <button
        onClick={() => onOpen(tier)}
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
      >
        {loading ? t('common.loading') : t('store.openBtn', { deposit: info.deposit })}
      </button>
    </div>
  );
}

function ProcessingOverlay({ onComplete }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (step >= STEPS.length) {
      setDone(true);
      const t = setTimeout(() => onComplete(), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(s => s + 1), STEPS[step].duration * 1000);
    return () => clearTimeout(t);
  }, [step]);

  if (done) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-10 text-center animate-scale-in shadow-2xl">
          <div className="text-6xl mb-4">💰</div>
          <h2 className="text-xl font-bold text-text mb-1">{t('store.orderDone')}</h2>
          <p className="text-text-muted text-sm">{t('store.rewardAdded')}</p>
        </div>
      </div>
    );
  }

  const s = STEPS[step];
  if (!s) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 text-center animate-scale-in shadow-2xl w-72">
        <div className="text-5xl mb-4 animate-bounce-pulse">{s.icon}</div>
        <h3 className="text-lg font-bold text-text mb-2">{s.label}</h3>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%`, transitionDuration: '0.3s' }} />
        </div>
        <p className="text-xs text-text-muted mt-2">{t('store.processing')}</p>
      </div>
    </div>
  );
}

export default function StorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const loadStatus = async () => {
    try {
      const { data } = await client.get('/store/status');
      setStatus(data);
    } catch { toast.error(t('common.loadingFailed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleOpen = async (tier) => {
    setOpening(true);
    try {
      const { data } = await client.post('/store/open', { tier });
      setStatus({ hasStore: true, store: data });
      toast.success(t('store.openSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.operationFailed'));
    } finally { setOpening(false); }
  };

  const handleProcess = async () => {
    setProcessing(true);
    // Processing animation handled by overlay, API called after
    try {
      const { data } = await client.post('/store/orders/process');
      setResult(data);
      // Reload status after a moment
      setTimeout(() => {
        setResult(null);
        setProcessing(false);
        loadStatus();
        toast.success(`+$${data.amount} ${t('store.earned')}`);
      }, 2000);
    } catch (err) {
      setProcessing(false);
      toast.error(err.response?.data?.error || t('common.operationFailed'));
    }
  };

  const handleClose = async () => {
    if (!confirm(t('store.closeConfirm'))) return;
    try {
      const { data } = await client.post('/store/close');
      setStatus({ hasStore: false });
      toast.success(data.message);
    } catch (err) {
      toast.error(err.response?.data?.error || t('common.operationFailed'));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // No store — show tier selection
  if (!status?.hasStore) {
    return (
      <div className="min-h-screen bg-bg safe-top safe-bottom page-container">
        <div className="p-4">
          <h1 className="text-xl font-bold text-text mb-1">🏪 {t('store.title')}</h1>
          <p className="text-sm text-text-muted mb-4">{t('store.subtitle')}</p>
          <div className="space-y-3">
            <TierCard tier="small" info={{ name: t('store.small'), deposit: 10, dailyOrders: 10, minReward: 0.05, maxReward: 0.3 }} onOpen={handleOpen} loading={opening} />
            <TierCard tier="medium" info={{ name: t('store.medium'), deposit: 50, dailyOrders: 20, minReward: 0.1, maxReward: 0.5 }} onOpen={handleOpen} loading={opening} />
            <TierCard tier="large" info={{ name: t('store.large'), deposit: 200, dailyOrders: 40, minReward: 0.2, maxReward: 1.0 }} onOpen={handleOpen} loading={opening} />
          </div>
        </div>
      </div>
    );
  }

  // Has store — show dashboard
  const s = status.store;
  const pct = s.dailyOrders > 0 ? (s.doneToday / s.dailyOrders) * 100 : 0;

  return (
    <div className="min-h-screen bg-bg safe-top safe-bottom page-container">
      {/* Processing overlay */}
      {processing && !result && (
        <ProcessingOverlay onComplete={() => {}} />
      )}

      {/* Result overlay */}
      {result && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setResult(null); loadStatus(); }}>
          <div className="bg-white rounded-3xl p-10 text-center animate-burst shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-3">🧧</div>
            <p className="text-3xl font-black text-primary">+${result.amount}</p>
            <p className="text-sm text-text-muted mt-1">{t('store.earned')}</p>
            <p className="text-xs text-text-muted mt-3">{result.totalDone}/{result.dailyOrders} {t('store.completed')}</p>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary via-primary to-primary-dark rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{TIER_ICONS[s.tier]}</span>
              <div>
                <h1 className="text-lg font-bold">{s.tierName}</h1>
                <p className="text-white/70 text-xs">{t('store.deposit')}: ${s.deposit}</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-xs bg-white/20 px-3 py-1.5 rounded-full text-white/80">
              {t('store.closeStore')}
            </button>
          </div>

          {/* Progress */}
          <div className="bg-black/20 rounded-xl p-3.5">
            <div className="flex justify-between text-sm mb-1.5">
              <span>{t('store.todayProgress')}</span>
              <span className="font-bold">{s.doneToday}/{s.dailyOrders}</span>
            </div>
            <div className="w-full h-2.5 bg-white/20 rounded-full progress-glow">
              <div className="h-full rounded-full bg-gradient-to-r from-gold to-[#FF6B00] transition-all duration-500"
                style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-1.5 text-white/60">
              <span>{t('store.todayEarnings')}: ${s.todayEarnings.toFixed(2)}</span>
              <span>{t('store.perOrder')}: ${s.minReward}-${s.maxReward}</span>
            </div>
          </div>
        </div>

        {/* Process Order Button */}
        <div className="mt-4">
          <button
            onClick={handleProcess}
            disabled={s.remaining <= 0}
            className="w-full py-4 bg-gradient-to-r from-[#FF6B00] via-[#FF8C00] to-[#FFB800] text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2 text-base"
          >
            {s.remaining > 0 ? (
              <>📦 {t('store.processOrder')} ({s.remaining} {t('store.remaining')})</>
            ) : (
              <>✅ {t('store.allDone')}</>
            )}
          </button>
        </div>

        {/* Steps Info */}
        <div className="mt-4 bg-white rounded-2xl shadow-sm border border-separator p-4">
          <h3 className="text-sm font-bold text-text mb-3">{t('store.howToProcess')}</h3>
          <div className="flex items-center gap-2">
            {STEPS.map((step, i) => (
              <div key={step.key} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-2xl">{step.icon}</span>
                  <span className="text-[10px] text-text-muted text-center">{step.label}</span>
                  <span className="text-[10px] text-text-muted">{step.duration}s</span>
                </div>
                {i < STEPS.length - 1 && <span className="text-text-muted text-xs mb-4">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-lg font-black text-primary">{s.dailyOrders}</p>
            <p className="text-[10px] text-text-muted">{t('store.dailyOrdersShort')}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-lg font-black text-success">{s.doneToday}</p>
            <p className="text-[10px] text-text-muted">{t('store.completedShort')}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-lg font-black text-gold">${s.todayEarnings.toFixed(2)}</p>
            <p className="text-[10px] text-text-muted">{t('store.earnedShort')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
