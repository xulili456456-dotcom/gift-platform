import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { TrendingUp, Package, DollarSign, Clock, ArrowRight, Eye, ShoppingCart, Star, Zap, ArrowDownUp } from 'lucide-react';
import toast from 'react-hot-toast';

const TIERS = {
  small:  { nameKey: 'store.small',  capital: 1,  daily: 10, min: 0.05, max: 0.3,  color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600', icon: '🏪' },
  medium: { nameKey: 'store.medium', capital: 3,  daily: 20, min: 0.1,  max: 0.5,  color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600', icon: '🏬', rec: true },
  large:  { nameKey: 'store.large',  capital: 10, daily: 40, min: 0.2,  max: 1.0,  color: 'from-rose-500 to-red-600', bg: 'bg-rose-50', text: 'text-rose-600', icon: '🏢' },
};

const PROCESS_STEPS = [
  { icon: Eye, label: '浏览商品', time: '3s', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: ShoppingCart, label: '下单购买', time: '2s', color: 'text-green-500', bg: 'bg-green-50' },
  { icon: Star, label: '确认好评', time: '1s', color: 'text-yellow-500', bg: 'bg-yellow-50' },
];

function ProcessingModal({ onDone, capital, profit }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (step >= 3) { setShowResult(true); const tm = setTimeout(onDone, 1000); return () => clearTimeout(tm); }
    const durations = [3000, 2000, 1000];
    const tm = setTimeout(() => setStep(s => s + 1), durations[step]);
    return () => clearTimeout(tm);
  }, [step]);

  if (showResult) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 text-center animate-burst shadow-2xl mx-4 w-80">
          <div className="w-16 h-16 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="text-sm text-text-muted">货款退回 + 利润</p>
          <p className="text-3xl font-black text-primary mt-1">+${(capital + profit).toFixed(2)}</p>
          <div className="flex justify-center gap-4 mt-2 text-xs text-text-muted">
            <span>货款 ${capital}</span>
            <span className="text-success font-bold">+${profit} 利润</span>
          </div>
        </div>
      </div>
    );
  }

  const s = PROCESS_STEPS[step];
  if (!s) return null;
  const Icon = s.icon;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 text-center animate-scale-in shadow-2xl mx-4 w-80">
        <div className={`w-16 h-16 mx-auto mb-4 ${s.bg} rounded-full flex items-center justify-center animate-bounce-pulse`}>
          <Icon size={32} className={s.color} />
        </div>
        <h3 className="text-lg font-bold text-text mb-1">{s.label}</h3>
        <p className="text-text-muted text-sm mb-4">{s.time}</p>
        <div className="flex gap-1.5 justify-center">
          {PROCESS_STEPS.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-primary scale-125' : i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StoreSelection({ onOpen, loading }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState('medium');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5F5] to-bg safe-top safe-bottom">
      <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] px-5 pt-8 pb-12 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({length: 20}).map((_,i) => (
            <div key={i} className="absolute text-2xl animate-env-rain" style={{left:`${5 + (i*5)%90}%`, top:'-20px', animationDuration:`${4+(i%3)*2}s`, animationDelay:`${i*0.3}s`}}>
              {['📦','🛍️','🏷️','💳'][i%4]}
            </div>
          ))}
        </div>
        <div className="relative z-10">
          <div className="w-16 h-16 mx-auto mb-3 bg-white/15 rounded-2xl flex items-center justify-center text-3xl backdrop-blur">🛒</div>
          <h1 className="text-2xl font-black tracking-tight mb-1">{t('store.title')}</h1>
          <p className="text-white/60 text-sm">{t('store.subtitle')}</p>
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-3 pb-24">
        {Object.entries(TIERS).map(([key, tier]) => {
          const isSelected = selected === key;
          return (
            <div key={key} onClick={() => setSelected(key)}
              className={`relative bg-white rounded-2xl p-4 border-2 transition-all cursor-pointer ${
                isSelected ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : 'border-separator shadow-sm'}`}>
              {tier.rec && <span className="absolute -top-2 right-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow">🔥 推荐</span>}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl ${tier.bg} flex items-center justify-center text-2xl`}>{tier.icon}</div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-text">{t(tier.nameKey)}</h3>
                  <p className="text-[11px] text-text-muted">每单垫付 <b className="text-text">${tier.capital}</b> 货款 · 每日 {tier.daily} 单</p>
                </div>
                {isSelected && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white" /></div>}
              </div>
              <div className={`rounded-xl p-3 grid grid-cols-3 gap-2 text-center ${isSelected ? 'bg-primary/5' : 'bg-bg'}`}>
                <div><p className="text-[10px] text-text-muted">每单垫付</p><p className="text-sm font-black text-primary">${tier.capital}</p></div>
                <div><p className="text-[10px] text-text-muted">每单利润</p><p className="text-sm font-black text-success">${tier.min}-{tier.max}</p></div>
                <div><p className="text-[10px] text-text-muted">日理论收益</p><p className="text-sm font-black text-amber-500">${(tier.daily * tier.max).toFixed(0)}</p></div>
              </div>
            </div>
          );
        })}

        <button onClick={() => onOpen(selected)} disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-[#FF6B00] via-[#FF8C00] to-[#FFB800] text-white font-bold rounded-2xl shadow-xl shadow-orange-500/25 active:scale-[0.98] transition-all disabled:opacity-50 text-base flex items-center justify-center gap-2">
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>🆓 {t('store.openFree')}</>}
        </button>
      </div>
    </div>
  );
}

function StoreDashboard({ store: s, onProcess, onClose, processing }) {
  const { t } = useTranslation();
  const tier = TIERS[s.tier];
  const pct = s.dailyOrders > 0 ? (s.doneToday / s.dailyOrders) * 100 : 0;
  const allDone = s.remaining <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5F5] to-bg safe-top safe-bottom">
      <div className={`bg-gradient-to-br ${tier.color} px-5 pt-8 pb-6 text-white relative overflow-hidden shadow-lg`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/20" />
          <div className="absolute -left-5 -bottom-5 w-24 h-24 rounded-full bg-white/10" />
        </div>
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur">{tier.icon}</div>
            <div>
              <h1 className="text-lg font-bold">{t(tier.nameKey)}</h1>
              <p className="text-white/70 text-xs">每单垫付 ${tier.capital} · {tier.daily}单/天</p>
            </div>
          </div>
          <button onClick={onClose} className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full text-white/80 transition-colors">
            {t('store.closeStore')}
          </button>
        </div>

        <div className="relative z-10 bg-white/15 backdrop-blur rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">📋 {t('store.todayProgress')}</span>
            <span className="text-white font-black text-lg">{s.doneToday}<span className="text-white/50 text-sm font-normal">/{s.dailyOrders}</span></span>
          </div>
          <div className="w-full h-3 bg-white/15 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-white/80 via-white to-yellow-200 rounded-full transition-all duration-700 progress-glow"
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/60">
            <span>{t('store.todayEarnings')}: <b className="text-white">${s.todayEarnings.toFixed(2)}</b></span>
            <span>余额: <b className="text-white">${s.balance.toFixed(2)}</b></span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-3 relative z-10 pb-24 space-y-4">
        {/* Process Button */}
        <button onClick={onProcess} disabled={allDone || processing || !s.canAfford}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
            allDone ? 'bg-green-50 text-green-600 shadow-green-100'
            : !s.canAfford ? 'bg-gray-100 text-text-muted'
            : 'bg-gradient-to-r from-[#FF6B00] via-[#FF8C00] to-[#FFB800] text-white shadow-orange-500/25'
          } disabled:opacity-80`}>
          {processing ? <><div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> {t('store.processing')}</>
          : allDone ? <>🎉 {t('store.allDone')}</>
          : !s.canAfford ? <>⚠️ 余额不足，需要 ${tier.capital} 货款</>
          : <><Package size={20} /> {t('store.processOrder')} <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">{s.remaining}</span></>}
        </button>

        {/* Capital flow info */}
        <div className="bg-white rounded-2xl shadow-sm border border-separator p-4">
          <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
            <ArrowDownUp size={16} className="text-violet-500" /> 货款流转
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
              <p className="text-text-muted mb-0.5">垫付货款</p>
              <p className="text-lg font-black text-red-500">-${tier.capital}</p>
            </div>
            <ArrowRight size={16} className="text-text-muted" />
            <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-text-muted mb-0.5">处理订单</p>
              <p className="text-xs">3步流程</p>
            </div>
            <ArrowRight size={16} className="text-text-muted" />
            <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
              <p className="text-text-muted mb-0.5">货款+利润</p>
              <p className="text-lg font-black text-green-500">+${(tier.capital + tier.max).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Process Flow */}
        <div className="bg-white rounded-2xl shadow-sm border border-separator p-4">
          <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
            <Zap size={16} className="text-amber-500" /> {t('store.howToProcess')}
          </h3>
          <div className="flex items-center gap-1">
            {PROCESS_STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`flex-1 ${step.bg} rounded-xl p-2 text-center`}>
                  <step.icon size={18} className={`${step.color} mx-auto mb-1`} />
                  <p className="text-[10px] font-semibold text-text">{step.label}</p>
                  <p className="text-[10px] text-text-muted">{step.time}</p>
                </div>
                {i < 2 && <ArrowRight size={14} className="text-text-muted shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-separator">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center"><TrendingUp size={16} className="text-blue-500" /></div>
              <span className="text-[11px] text-text-muted">今日已完成</span>
            </div>
            <p className="text-2xl font-black text-text">{s.doneToday}<span className="text-sm font-normal text-text-muted">/{s.dailyOrders}</span></p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-separator">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center"><DollarSign size={16} className="text-green-500" /></div>
              <span className="text-[11px] text-text-muted">今日利润</span>
            </div>
            <p className="text-2xl font-black text-green-500">${s.todayEarnings.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-separator">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center"><Package size={16} className="text-amber-500" /></div>
              <span className="text-[11px] text-text-muted">累计订单</span>
            </div>
            <p className="text-2xl font-black text-text">{s.totalOrders}<span className="text-sm font-normal text-text-muted"> 单</span></p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-separator">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center"><Clock size={16} className="text-violet-500" /></div>
              <span className="text-[11px] text-text-muted">每单货款</span>
            </div>
            <p className="text-2xl font-black text-text">${tier.capital}</p>
          </div>
        </div>

        <div className="bg-white/50 rounded-2xl p-3 border border-dashed border-separator text-center">
          <p className="text-xs text-text-muted">💡 每单需垫付 <b className="text-text">${tier.capital}</b> 货款，完成后货款 + 利润一起返还</p>
        </div>
      </div>
    </div>
  );
}

export default function StorePage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showProcess, setShowProcess] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const loadStatus = useCallback(async () => {
    try { const { data } = await client.get('/store/status'); setStatus(data); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStatus(); }, []);

  const handleOpen = async (tier) => {
    setOpening(true);
    try {
      const { data } = await client.post('/store/open', { tier });
      setStatus({ hasStore: true, store: data });
      toast.success(t('store.openSuccess'));
    } catch (err) { toast.error(err.response?.data?.error || t('common.operationFailed')); }
    finally { setOpening(false); }
  };

  const handleProcess = async () => {
    setShowProcess(true);
    try {
      const { data } = await client.post('/store/orders/process');
      setLastResult(data);
      setTimeout(async () => {
        setShowProcess(false);
        setProcessing(false);
        await loadStatus();
        toast.success(`💰 货款退回 + 利润 +$${(data.capital + data.profit).toFixed(2)}`, { duration: 3000 });
      }, 7000);
    } catch (err) {
      setShowProcess(false);
      setProcessing(false);
      toast.error(err.response?.data?.error || t('common.operationFailed'));
    }
  };

  const handleClose = async () => {
    if (!confirm(t('store.closeConfirm'))) return;
    try {
      await client.post('/store/close');
      setStatus({ hasStore: false });
      toast.success(t('store.closeStore'));
    } catch (err) { toast.error(err.response?.data?.error || t('common.operationFailed')); }
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-text-muted text-sm">{t('app.loading')}</span>
      </div>
    </div>
  );

  if (showProcess) {
    return (
      <>
        {status?.hasStore ? <StoreDashboard store={status.store} onProcess={handleProcess} onClose={handleClose} processing={true} /> : null}
        <ProcessingModal onDone={() => {}} capital={status?.store?.capital || 0} profit={lastResult?.profit || 0} />
      </>
    );
  }

  if (!status?.hasStore) return <StoreSelection onOpen={handleOpen} loading={opening} />;

  return <StoreDashboard store={status.store} onProcess={handleProcess} onClose={handleClose} processing={processing} />;
}
