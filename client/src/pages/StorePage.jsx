import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { TrendingUp, Package, DollarSign, Clock, ArrowRight, Eye, ShoppingCart, Star, Zap, ArrowDownUp, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const TIERS = {
  small:  { nameKey: 'store.small',  capital: 1,  daily: 10, min: 0.05, max: 0.3,  color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600', icon: '🏪' },
  medium: { nameKey: 'store.medium', capital: 3,  daily: 20, min: 0.1,  max: 0.5,  color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600', icon: '🏬', rec: true },
  large:  { nameKey: 'store.large',  capital: 10, daily: 40, min: 0.2,  max: 1.0,  color: 'from-rose-500 to-red-600', bg: 'bg-rose-50', text: 'text-rose-600', icon: '🏢' },
};

// Product catalog - random each time
const ALL_PRODUCTS = [
  { emoji: '👗', name: '夏季连衣裙', cat: '服装' },
  { emoji: '👟', name: '潮流运动鞋', cat: '鞋靴' },
  { emoji: '👜', name: '轻奢手提包', cat: '箱包' },
  { emoji: '📱', name: '蓝牙耳机', cat: '数码' },
  { emoji: '⌚', name: '智能手表', cat: '数码' },
  { emoji: '🕶️', name: '偏光太阳镜', cat: '配饰' },
  { emoji: '🧴', name: '精华面霜', cat: '美妆' },
  { emoji: '💄', name: '丝绒口红', cat: '美妆' },
  { emoji: '🎧', name: '降噪耳机', cat: '数码' },
  { emoji: '👔', name: '商务衬衫', cat: '服装' },
  { emoji: '🧸', name: '限量手办', cat: '潮玩' },
  { emoji: '🍵', name: '精品茶叶礼盒', cat: '食品' },
  { emoji: '📦', name: '收纳整理箱', cat: '家居' },
  { emoji: '💡', name: 'LED护眼台灯', cat: '家居' },
  { emoji: '🎮', name: '游戏手柄', cat: '数码' },
  { emoji: '🧢', name: '棒球帽', cat: '配饰' },
  { emoji: '👶', name: '婴儿推车', cat: '母婴' },
  { emoji: '🐶', name: '宠物智能喂食器', cat: '宠物' },
  { emoji: '🌹', name: '永生花礼盒', cat: '礼品' },
  { emoji: '🎂', name: '定制蛋糕', cat: '食品' },
  { emoji: '💻', name: '机械键盘', cat: '数码' },
  { emoji: '🧣', name: '羊绒围巾', cat: '服装' },
  { emoji: '☕', name: '精品咖啡豆', cat: '食品' },
  { emoji: '🔦', name: '强光手电筒', cat: '户外' },
  { emoji: '🎒', name: '户外双肩包', cat: '户外' },
];

function genProducts(tier, count = 12) {
  const shuffled = [...ALL_PRODUCTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((p, i) => ({
    ...p,
    id: i,
    capital: tier.capital,
    profit: Math.round((tier.min + Math.random() * (tier.max - tier.min)) * 100) / 100,
    roi: Math.round(((tier.max) / tier.capital) * 100),
  }));
}

const PROCESS_STEPS = [
  { icon: ShoppingCart, label: '进货下单', time: '2s', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: Package, label: '打包发货', time: '2s', color: 'text-amber-500', bg: 'bg-amber-50' },
  { icon: Star, label: '收货好评', time: '2s', color: 'text-green-500', bg: 'bg-green-50' },
];

// ── Product Picker Sheet ──
function ProductPicker({ tier, onPick, onClose }) {
  const { t } = useTranslation();
  const products = useMemo(() => genProducts(TIERS[tier]), [tier]);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[70vh] overflow-hidden animate-slide-up flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-separator">
          <h3 className="text-base font-bold text-text">🛍️ 选品进货</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="px-4 py-2 text-xs text-text-muted bg-amber-50 mx-4 mt-3 rounded-lg">
          💡 选择商品 → 垫付货款进货 → 卖出赚差价
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-2 native-scroll">
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              className="bg-bg rounded-2xl p-3 text-center hover:bg-separator/30 transition-colors active:scale-95"
            >
              <div className="text-3xl mb-2">{p.emoji}</div>
              <p className="text-[11px] font-semibold text-text leading-tight line-clamp-1">{p.name}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{p.cat}</p>
              <div className="mt-2 pt-2 border-t border-separator/50">
                <p className="text-[10px] text-text-muted">利润</p>
                <p className="text-sm font-black text-green-500">+${p.profit.toFixed(2)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Processing Modal ──
function ProcessingModal({ product, onDone }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (step >= 3) { setShowResult(true); const tm = setTimeout(onDone, 1200); return () => clearTimeout(tm); }
    const tm = setTimeout(() => setStep(s => s + 1), 2000);
    return () => clearTimeout(tm);
  }, [step]);

  if (showResult) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 text-center animate-burst shadow-2xl mx-4 w-80">
          <div className="w-16 h-16 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="text-4xl mb-2">{product.emoji}</p>
          <p className="text-sm text-text-muted">{product.name} 已卖出</p>
          <p className="text-3xl font-black text-primary mt-2">+${(product.capital + product.profit).toFixed(2)}</p>
          <div className="flex justify-center gap-4 mt-2 text-xs text-text-muted">
            <span>货款 ${product.capital}</span>
            <span className="text-green-500 font-bold">+${product.profit} 利润</span>
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
        <div className="text-5xl mb-3">{product.emoji}</div>
        <p className="text-sm font-semibold text-text mb-4">{product.name}</p>
        <div className={`w-14 h-14 mx-auto mb-3 ${s.bg} rounded-full flex items-center justify-center animate-bounce-pulse`}>
          <Icon size={28} className={s.color} />
        </div>
        <h3 className="text-base font-bold text-text mb-1">{s.label}</h3>
        <div className="flex gap-1.5 justify-center mt-3">
          {PROCESS_STEPS.map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === step ? 'bg-primary scale-125' : i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Store Selection ──
function StoreSelection({ onOpen, loading }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState('medium');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5F5] to-bg safe-top safe-bottom">
      <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] px-5 pt-8 pb-12 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({length: 16}).map((_,i) => (
            <div key={i} className="absolute text-xl animate-env-rain" style={{left:`${5+(i*6)%90}%`, top:'-20px', animationDuration:`${4+(i%3)*2}s`, animationDelay:`${i*0.3}s`}}>
              {['📦','🛍️','👗','👟','📱','💄'][i%6]}
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
                  <p className="text-[11px] text-text-muted">每单垫付 <b>${tier.capital}</b> · 日{tier.daily}单 · 利润率{tier.min*100}%-{tier.max*100}%</p>
                </div>
                {isSelected && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white" /></div>}
              </div>
              <div className={`rounded-xl p-3 grid grid-cols-3 gap-2 text-center ${isSelected ? 'bg-primary/5' : 'bg-bg'}`}>
                <div><p className="text-[10px] text-text-muted">垫付货款</p><p className="text-sm font-black text-primary">${tier.capital}</p></div>
                <div><p className="text-[10px] text-text-muted">每单利润</p><p className="text-sm font-black text-green-500">${tier.min}-${tier.max}</p></div>
                <div><p className="text-[10px] text-text-muted">商品可选</p><p className="text-sm font-black text-text">12款</p></div>
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

// ── Store Dashboard ──
function StoreDashboard({ store: s, onProcess, onClose, processing, showPicker, setShowPicker }) {
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
              <p className="text-white/70 text-xs">垫付${tier.capital}/单 · {tier.daily}单/天</p>
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
        <button onClick={() => setShowPicker(true)} disabled={allDone || processing || !s.canAfford}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
            allDone ? 'bg-green-50 text-green-600 shadow-green-100'
            : !s.canAfford ? 'bg-gray-100 text-text-muted'
            : 'bg-gradient-to-r from-[#FF6B00] via-[#FF8C00] to-[#FFB800] text-white shadow-orange-500/25'
          } disabled:opacity-80`}>
          {processing ? <><div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> {t('store.processing')}</>
          : allDone ? <>🎉 {t('store.allDone')}</>
          : !s.canAfford ? <>⚠️ 余额不足，需要 ${tier.capital}</>
          : <><ShoppingCart size={20} /> 选品进货 <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">{s.remaining}</span></>}
        </button>

        {/* Capital flow */}
        <div className="bg-white rounded-2xl shadow-sm border border-separator p-4">
          <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
            <ArrowDownUp size={16} className="text-violet-500" /> 进货流转
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 bg-red-50 rounded-xl p-2 text-center">
              <p className="text-text-muted mb-0.5">垫付货款</p>
              <p className="text-sm font-black text-red-500">-${tier.capital}</p>
            </div>
            <ArrowRight size={14} className="text-text-muted shrink-0" />
            <div className="flex-1 bg-blue-50 rounded-xl p-2 text-center">
              <p className="text-text-muted mb-0.5">选品卖出</p>
              <p className="text-[10px]">3步流程</p>
            </div>
            <ArrowRight size={14} className="text-text-muted shrink-0" />
            <div className="flex-1 bg-green-50 rounded-xl p-2 text-center">
              <p className="text-text-muted mb-0.5">货款+利润</p>
              <p className="text-sm font-black text-green-500">+${(tier.capital + tier.max).toFixed(1)}</p>
            </div>
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
          <p className="text-xs text-text-muted">💡 选品 → 垫付${tier.capital}货款 → 卖出后货款+利润一起返还</p>
        </div>
      </div>
    </div>
  );
}

// ── Main ──
export default function StorePage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showProcess, setShowProcess] = useState(false);
  const [pickedProduct, setPickedProduct] = useState(null);

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

  const handlePickProduct = (product) => {
    setPickedProduct(product);
    setShowPicker(false);
    // Start processing with the picked product
    processOrder(product);
  };

  const processOrder = async (product) => {
    setShowProcess(true);
    try {
      await client.post('/store/orders/process');
      setTimeout(async () => {
        setShowProcess(false);
        setPickedProduct(null);
        await loadStatus();
        toast.success(`💰 货款+利润已到账！`, { duration: 2500 });
      }, 7200);
    } catch (err) {
      setShowProcess(false);
      setPickedProduct(null);
      toast.error(err.response?.data?.error || t('common.operationFailed'));
    }
  };

  const handleClose = async () => {
    if (!confirm(t('store.closeConfirm'))) return;
    try {
      await client.post('/store/close');
      setStatus({ hasStore: false });
      toast.success('店铺已关闭');
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

  return (
    <>
      {/* Product Picker */}
      {showPicker && status?.hasStore && (
        <ProductPicker
          tier={status.store.tier}
          onPick={handlePickProduct}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Processing */}
      {showProcess && pickedProduct && (
        <ProcessingModal product={pickedProduct} onDone={() => {}} />
      )}

      {/* Main content */}
      {!status?.hasStore ? (
        <StoreSelection onOpen={handleOpen} loading={opening} />
      ) : (
        <StoreDashboard
          store={status.store}
          onProcess={() => setShowPicker(true)}
          onClose={handleClose}
          processing={showProcess}
          showPicker={showPicker}
          setShowPicker={setShowPicker}
        />
      )}
    </>
  );
}
