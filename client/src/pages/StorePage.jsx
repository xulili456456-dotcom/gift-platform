import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { Crown, ShoppingCart, X, Flame, Store } from 'lucide-react';
import toast from 'react-hot-toast';

const TIER_INFO = {
  small:  { nameKey: 'store.small',  capital: 1,  daily: 10, min: 0.05, max: 0.3,  color: '#F59E0B', tag: 'Lv.1' },
  medium: { nameKey: 'store.medium', capital: 3,  daily: 20, min: 0.1,  max: 0.5,  color: '#8B5CF6', tag: 'Lv.2', need: 50 },
  large:  { nameKey: 'store.large',  capital: 10, daily: 40, min: 0.2,  max: 1.0,  color: '#EF4444', tag: 'Lv.3', need: 200 },
};

const PRODUCTS = [
  { img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=800&fit=crop', name: '法式碎花连衣裙', price: 19.99, sold: 2834, cat: '女装' },
  { img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=800&fit=crop', name: 'Air Max 复古运动鞋', price: 89.99, sold: 5621, cat: '鞋靴' },
  { img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=800&fit=crop', name: '轻奢链条斜挎包', price: 45.00, sold: 1892, cat: '箱包' },
  { img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=800&fit=crop', name: '无线降噪蓝牙耳机', price: 29.99, sold: 8947, cat: '数码' },
  { img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=800&fit=crop', name: '智能运动手表', price: 59.99, sold: 3401, cat: '数码' },
  { img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=800&fit=crop', name: '复古圆框太阳镜', price: 15.99, sold: 6723, cat: '配饰' },
  { img: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&h=800&fit=crop', name: '丝绒雾面唇釉套装', price: 24.99, sold: 4567, cat: '美妆' },
  { img: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600&h=800&fit=crop', name: '意式修身西装外套', price: 129.00, sold: 892, cat: '男装' },
  { img: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&h=800&fit=crop', name: '头戴式电竞耳机', price: 39.99, sold: 2098, cat: '数码' },
  { img: 'https://images.unsplash.com/photo-1559715541-5daf8a5c3e0d?w=600&h=800&fit=crop', name: '限量版潮玩公仔', price: 69.99, sold: 1234, cat: '潮玩' },
  { img: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&h=800&fit=crop', name: '埃塞俄比亚咖啡豆', price: 18.00, sold: 3456, cat: '食品' },
  { img: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600&h=800&fit=crop', name: '永生玫瑰花礼盒', price: 35.00, sold: 5678, cat: '礼品' },
  { img: 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=600&h=800&fit=crop', name: '北欧极简台灯', price: 22.00, sold: 2345, cat: '家居' },
  { img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop', name: '玻尿酸精华液', price: 32.00, sold: 7890, cat: '美妆' },
  { img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=800&fit=crop', name: '龙井明前茶礼盒', price: 55.00, sold: 1678, cat: '食品' },
];

function genProducts(tier) {
  const ti = TIER_INFO[tier];
  const shuffled = [...PRODUCTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 12).map((p, i) => ({
    ...p, id: i,
    capital: ti.capital,
    profit: Math.round((ti.min + Math.random() * (ti.max - ti.min)) * 100) / 100,
  }));
}

// ── Processing Overlay ──
function ProcessingModal({ product, onDone }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (step >= 3) { setDone(true); const t = setTimeout(onDone, 1200); return () => clearTimeout(t); }
    const t = setTimeout(() => setStep(s => s + 1), 2200); return () => clearTimeout(t);
  }, [step]);
  if (done) return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl p-8 text-center animate-burst shadow-2xl w-full max-w-sm">
        <img src={product.img} alt="" className="w-20 h-20 object-cover rounded-2xl mx-auto mb-3 shadow-md" />
        <p className="text-sm text-text-muted mb-1">交易完成</p>
        <p className="text-3xl font-black text-primary">+${(product.capital + product.profit).toFixed(2)}</p>
        <div className="flex justify-center gap-4 mt-2 text-xs"><span className="text-text-muted">本金${product.capital}</span><span className="text-green-500 font-bold">+${product.profit}利润</span></div>
      </div>
    </div>
  );
  const steps = ['已下单，等待发货...', '商品配送中...', '买家已确认收货！'];
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl p-8 text-center animate-scale-in shadow-2xl w-full max-w-sm">
        <img src={product.img} alt="" className="w-24 h-24 object-cover rounded-2xl mx-auto mb-4 shadow-md" />
        <p className="text-lg font-bold text-text">{steps[step]}</p>
        <div className="w-full h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-500" style={{width:`${((step+1)/3)*100}%`}} /></div>
      </div>
    </div>
  );
}

// ── Product Detail Sheet ──
function ProductDetail({ product, onBuy, onClose }) {
  return (
    <div className="fixed inset-0 z-[150] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-hidden animate-slide-up">
        <div className="relative h-64 overflow-hidden bg-gray-100">
          <img src={product.img} alt={product.name} className="w-full h-full object-cover absolute inset-0" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow"><X size={16} /></button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <p className="text-white text-sm font-bold">{product.name}</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{product.cat}</span>
            {product.sold > 5000 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold flex items-center gap-1"><Flame size={10} />热销</span>}
            <span className="text-xs text-text-muted ml-auto">已售{product.sold.toLocaleString()}件</span>
          </div>
          <div className="bg-bg rounded-2xl p-4 space-y-2">
            <div className="flex justify-between"><span className="text-sm text-text-muted">市场售价</span><span className="text-sm font-bold text-text line-through">${product.price}</span></div>
            <div className="flex justify-between"><span className="text-sm text-text-muted">垫付本金</span><span className="text-sm font-bold text-red-500">-${product.capital}</span></div>
            <div className="flex justify-between pt-2 border-t border-separator"><span className="text-sm font-bold text-text">预估利润</span><span className="text-lg font-black text-green-500">+${product.profit.toFixed(2)}</span></div>
          </div>
          <button onClick={() => onBuy(product)} className="w-full py-4 bg-gradient-to-r from-[#FF4D4D] via-[#FF6B6B] to-[#FF3366] text-white font-bold rounded-2xl shadow-lg shadow-red-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base">
            <ShoppingCart size={20} />立即进货
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product Feed ──
function ProductFeed({ products, onSelect, doneToday, dailyOrders, balance }) {
  return (
    <div className="flex-1 overflow-y-auto native-scroll px-4 pb-4">
      <div className="flex items-center gap-2 text-xs text-text-muted py-3 sticky top-0 bg-bg z-10">
        <span>{doneToday}/{dailyOrders}单</span>
        <span className="w-1 h-1 rounded-full bg-text-muted" />
        <span>余额 ${balance.toFixed(2)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {products.map(p => (
          <div key={p.id} onClick={() => onSelect(p)} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-separator active:scale-[0.97] transition-transform cursor-pointer">
            <div className="relative">
              <img src={p.img} alt={p.name} className="w-full aspect-[3/4] object-cover" loading="lazy" />
              {p.sold > 5000 && <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-md bg-black/50 text-white backdrop-blur flex items-center gap-0.5"><Flame size={10} />热销</span>}
              <div className="absolute bottom-2 left-2 text-[11px] px-2 py-1 rounded-lg bg-primary text-white font-bold">+${p.profit.toFixed(2)}</div>
            </div>
            <div className="p-2.5">
              <p className="text-[12px] font-semibold text-text line-clamp-2 leading-tight">{p.name}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-text-muted">{p.cat}</span>
                <span className="text-[10px] text-text-muted line-through">${p.price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Store Header ──
function StoreHeader({ tier, onClose, doneToday, dailyOrders, todayEarnings, balance, totalOrders, nextTier }) {
  const { t } = useTranslation();
  const ti = TIER_INFO[tier];
  const pct = dailyOrders > 0 ? (doneToday / dailyOrders) * 100 : 0;

  return (
    <div className="shrink-0 px-4 pt-3 pb-2 space-y-2 border-b border-separator bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black text-white" style={{ background: ti.color }}>
            <Store size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-text flex items-center gap-1.5">
              {t(ti.nameKey)}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold" style={{ background: ti.color }}>{ti.tag}</span>
            </h1>
            <p className="text-[10px] text-text-muted">累计{totalOrders}单 · 日限{dailyOrders}单</p>
          </div>
        </div>
        <button onClick={onClose} className="text-[11px] text-text-muted px-3 py-1 rounded-full bg-bg">关店</button>
      </div>

      {nextTier && (
        <div className="flex items-center gap-2 bg-bg rounded-lg px-3 py-1.5">
          <Crown size={12} className="text-amber-500 shrink-0" />
          <span className="text-[11px] text-text-muted flex-1">距{t(nextTier.nameKey)} <b className="text-text">{totalOrders}/{nextTier.threshold}</b></span>
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (totalOrders / nextTier.threshold) * 100)}%`, background: ti.color }} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: ti.color }} />
        </div>
        <span className="text-[11px] font-bold text-text shrink-0">{doneToday}/{dailyOrders}</span>
      </div>
      <div className="flex gap-4 text-[11px]">
        <span className="text-text-muted">今日利润 <b className="text-green-500">${todayEarnings.toFixed(2)}</b></span>
        <span className="text-text-muted">余额 <b className="text-text">${balance.toFixed(2)}</b></span>
      </div>
    </div>
  );
}

// ── Open Store ──
function OpenStore({ onOpen, loading }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-bg safe-top safe-bottom flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FF6B00] to-[#FFB800] flex items-center justify-center mb-4 shadow-xl shadow-orange-500/20">
        <Store size={36} className="text-white" />
      </div>
      <h1 className="text-2xl font-black text-text mb-2">{t('store.title')}</h1>
      <p className="text-sm text-text-muted mb-6">免费开店 · 选品进货 · 卖出赚差价</p>
      <div className="bg-white rounded-2xl p-4 border border-separator shadow-sm w-full max-w-xs mb-6 text-left space-y-2 text-sm">
        <div className="flex items-center gap-2"><Store size={16} className="text-amber-500" /><span>开店即送 <b>Lv.1 小店</b></span></div>
        <div className="flex items-center gap-2"><ShoppingCart size={16} className="text-blue-500" /><span>每单垫付 <b>$1</b> 本金</span></div>
        <div className="flex items-center gap-2"><Crown size={16} className="text-violet-500" /><span>完成 <b>50单</b> 自动升级中店</span></div>
      </div>
      <button onClick={onOpen} disabled={loading}
        className="w-full max-w-xs py-4 bg-gradient-to-r from-[#FF6B00] to-[#FFB800] text-white font-bold rounded-2xl shadow-xl shadow-orange-500/25 active:scale-[0.98] transition-all disabled:opacity-50 text-base">
        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : '免费开店'}
      </button>
    </div>
  );
}

// ── Main ──
export default function StorePage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showProcess, setShowProcess] = useState(false);
  const [processingProduct, setProcessingProduct] = useState(null);

  const loadStatus = useCallback(async () => {
    try { const { data } = await client.get('/store/status'); setStatus(data); } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStatus(); }, []);

  const products = useMemo(() =>
    status?.hasStore ? genProducts(status.store.tier) : [],
  [status?.hasStore, status?.store?.tier, status?.store?.doneToday]);

  const handleOpen = async () => {
    setOpening(true);
    try { const { data } = await client.post('/store/open'); setStatus({ hasStore: true, store: data }); toast.success('开店成功！'); }
    catch (err) { toast.error(err.response?.data?.error || '操作失败'); }
    finally { setOpening(false); }
  };

  const handleBuy = async (product) => {
    setShowDetail(null);
    setProcessingProduct(product);
    setShowProcess(true);
    try {
      await client.post('/store/orders/process');
      setTimeout(async () => { setShowProcess(false); setProcessingProduct(null); await loadStatus(); }, 7200);
    } catch (err) {
      setShowProcess(false); setProcessingProduct(null);
      toast.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleClose = async () => {
    if (!confirm('确定关店？')) return;
    try { await client.post('/store/close'); setStatus({ hasStore: false }); toast.success('已关店'); }
    catch (err) { toast.error(err.response?.data?.error || '操作失败'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!status?.hasStore) return <OpenStore onOpen={handleOpen} loading={opening} />;

  const s = status.store;

  return (
    <div className="min-h-screen bg-bg safe-top safe-bottom flex flex-col page-container">
      <StoreHeader tier={s.tier} onClose={handleClose} doneToday={s.doneToday} dailyOrders={s.dailyOrders}
        todayEarnings={s.todayEarnings} balance={s.balance} totalOrders={s.totalOrders} nextTier={s.nextTier} />
      <ProductFeed products={products} onSelect={(p) => setShowDetail(p)} doneToday={s.doneToday}
        dailyOrders={s.dailyOrders} balance={s.balance} />
      {showDetail && <ProductDetail product={showDetail} onBuy={handleBuy} onClose={() => setShowDetail(null)} />}
      {showProcess && processingProduct && <ProcessingModal product={processingProduct} onDone={() => {}} />}
    </div>
  );
}
