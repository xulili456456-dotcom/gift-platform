import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { Crown, ShoppingCart, X, Flame, Store, Search, Star, ChevronRight, Package, DollarSign, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const TIER_INFO = {
  small:  { nameKey: 'store.small',  capital: 1,  daily: 10, min: 0.05, max: 0.3,  color: '#F59E0B', tag: 'Lv.1' },
  medium: { nameKey: 'store.medium', capital: 3,  daily: 20, min: 0.1,  max: 0.5,  color: '#8B5CF6', tag: 'Lv.2', need: 50 },
  large:  { nameKey: 'store.large',  capital: 10, daily: 40, min: 0.2,  max: 1.0,  color: '#EF4444', tag: 'Lv.3', need: 200 },
};

const CATEGORIES = ['全部', '数码', '女装', '男装', '美妆', '鞋靴', '家居', '配饰', '食品', '潮玩'];

const PRODUCTS = [
  { img:'1505740420928-5e560c06d30e', name:'无线降噪蓝牙耳机', price:29.99, sold:8947, cat:'数码', rating:4.7, reviews:3241 },
  { img:'1523275335684-37898b6baf30', name:'智能运动手表', price:59.99, sold:3401, cat:'数码', rating:4.5, reviews:1892 },
  { img:'1618366712010-f4ae9c647dcb', name:'头戴式电竞耳机', price:39.99, sold:2098, cat:'数码', rating:4.6, reviews:1567 },
  { img:'1583394838336-acd977736f90', name:'便携蓝牙音箱', price:49.99, sold:4521, cat:'数码', rating:4.4, reviews:2891 },
  { img:'1527814050087-3793815479db', name:'RGB机械键盘', price:79.99, sold:3210, cat:'数码', rating:4.8, reviews:4532 },
  { img:'1496181133206-80ce9b88a853', name:'静音无线鼠标', price:25.99, sold:6789, cat:'数码', rating:4.3, reviews:5678 },
  { img:'1516035069371-29a1b244cc32', name:'轻薄笔记本电脑', price:699.00, sold:567, cat:'数码', rating:4.6, reviews:892 },
  { img:'1588872657578-7efd1f1555ed', name:'单反相机镜头', price:349.00, sold:432, cat:'数码', rating:4.9, reviews:654 },
  { img:'1592899677977-9c10ca588bbd', name:'VR虚拟现实眼镜', price:299.00, sold:876, cat:'数码', rating:4.2, reviews:321 },
  { img:'1505740420928-5e560c06d30e', name:'无人机航拍器', price:459.00, sold:345, cat:'数码', rating:4.7, reviews:234 },
  { img:'1523275335684-37898b6baf30', name:'手机云台稳定器', price:89.99, sold:2345, cat:'数码', rating:4.5, reviews:1234 },
  { img:'1618366712010-f4ae9c647dcb', name:'无线充电底座', price:19.99, sold:7654, cat:'数码', rating:4.3, reviews:3210 },
  { img:'1583394838336-acd977736f90', name:'大容量充电宝', price:35.00, sold:9876, cat:'数码', rating:4.4, reviews:5432 },
  { img:'1527814050087-3793815479db', name:'高清网络摄像头', price:45.00, sold:2987, cat:'数码', rating:4.1, reviews:876 },
  { img:'1496181133206-80ce9b88a853', name:'iPad保护壳', price:15.99, sold:8901, cat:'数码', rating:4.0, reviews:4321 },
  { img:'1516035069371-29a1b244cc32', name:'便携微型投影仪', price:159.00, sold:987, cat:'数码', rating:4.5, reviews:567 },
  { img:'1588872657578-7efd1f1555ed', name:'专业录音麦克风', price:69.00, sold:2345, cat:'数码', rating:4.6, reviews:1234 },
  { img:'1592899677977-9c10ca588bbd', name:'27寸4K显示器', price:329.00, sold:765, cat:'数码', rating:4.7, reviews:456 },
  { img:'1595777457583-95e059d581b8', name:'法式碎花连衣裙', price:25.99, sold:3456, cat:'女装', rating:4.3, reviews:2345 },
  { img:'1595777457583-95e059d581b8', name:'针织开衫外套', price:35.00, sold:2345, cat:'女装', rating:4.4, reviews:1876 },
  { img:'1595777457583-95e059d581b8', name:'高腰阔腿裤', price:28.00, sold:4567, cat:'女装', rating:4.2, reviews:3210 },
  { img:'1595777457583-95e059d581b8', name:'纯棉短袖T恤', price:12.99, sold:10987, cat:'女装', rating:4.5, reviews:5678 },
  { img:'1595777457583-95e059d581b8', name:'真丝围巾礼盒', price:22.00, sold:3210, cat:'女装', rating:4.6, reviews:1234 },
  { img:'1595777457583-95e059d581b8', name:'白色衬衫女', price:24.00, sold:5678, cat:'女装', rating:4.1, reviews:2345 },
  { img:'1595777457583-95e059d581b8', name:'牛仔外套女', price:42.00, sold:3456, cat:'女装', rating:4.4, reviews:1876 },
  { img:'1595777457583-95e059d581b8', name:'百褶半身裙', price:19.99, sold:7890, cat:'女装', rating:4.3, reviews:4321 },
  { img:'1593030761757-71fae45fa0e7', name:'意式修身西装外套', price:129.00, sold:1234, cat:'男装', rating:4.7, reviews:876 },
  { img:'1617137968427-85924c800a22', name:'商务休闲长裤', price:48.00, sold:3456, cat:'男装', rating:4.4, reviews:2345 },
  { img:'1596755094514-f87e34085b2c', name:'纯棉Polo衫', price:25.99, sold:6789, cat:'男装', rating:4.5, reviews:4321 },
  { img:'1593030761757-71fae45fa0e7', name:'羊绒围巾', price:38.00, sold:2345, cat:'男装', rating:4.6, reviews:1234 },
  { img:'1617137968427-85924c800a22', name:'真皮夹克男', price:149.00, sold:876, cat:'男装', rating:4.8, reviews:567 },
  { img:'1596755094514-f87e34085b2c', name:'直筒牛仔裤男', price:42.00, sold:5678, cat:'男装', rating:4.3, reviews:3210 },
  { img:'1586495777744-4413f21062fa', name:'丝绒雾面唇釉套装', price:24.99, sold:4567, cat:'美妆', rating:4.5, reviews:3210 },
  { img:'1620916566398-39f1143ab7be', name:'玻尿酸精华液', price:32.00, sold:7890, cat:'美妆', rating:4.7, reviews:5678 },
  { img:'1596462502278-27bfdc403348', name:'大地色眼影盘', price:18.00, sold:6543, cat:'美妆', rating:4.4, reviews:4321 },
  { img:'1522335789203-aabd1fc54bc9', name:'女士香水50ml', price:55.00, sold:3210, cat:'美妆', rating:4.8, reviews:2345 },
  { img:'1542291026-7eec264c27ff', name:'Air Max复古运动鞋', price:89.99, sold:5621, cat:'鞋靴', rating:4.6, reviews:4321 },
  { img:'1560769629-975ec94e6a86', name:'经典帆布鞋', price:35.00, sold:7890, cat:'鞋靴', rating:4.4, reviews:5678 },
  { img:'1542291026-7eec264c27ff', name:'真皮乐福鞋', price:65.00, sold:2109, cat:'鞋靴', rating:4.5, reviews:1234 },
  { img:'1560769629-975ec94e6a86', name:'透气跑步鞋', price:55.00, sold:4321, cat:'鞋靴', rating:4.3, reviews:3210 },
  { img:'1555041469-a586c61ea9bc', name:'北欧极简台灯', price:22.00, sold:2345, cat:'家居', rating:4.2, reviews:1876 },
  { img:'1586023492125-27b2c045efd7', name:'简约布艺沙发', price:189.00, sold:876, cat:'家居', rating:4.6, reviews:432 },
  { img:'1555041469-a586c61ea9bc', name:'北欧餐椅四件套', price:159.00, sold:654, cat:'家居', rating:4.5, reviews:321 },
  { img:'1572635196237-14b3f281503f', name:'复古圆框太阳镜', price:15.99, sold:6723, cat:'配饰', rating:4.4, reviews:4321 },
  { img:'1606760227091-3dd870d97f1d', name:'真皮钱包', price:28.00, sold:3456, cat:'配饰', rating:4.5, reviews:2345 },
  { img:'1559056199-641a0ac8b55e', name:'埃塞俄比亚咖啡豆', price:18.00, sold:3456, cat:'食品', rating:4.7, reviews:1876 },
  { img:'1556679343-c7306c1976bc', name:'龙井明前茶礼盒', price:55.00, sold:1678, cat:'食品', rating:4.8, reviews:987 },
  { img:'1559715541-5daf8a5c3e0d', name:'限量版潮玩公仔', price:69.99, sold:1234, cat:'潮玩', rating:4.6, reviews:876 },
  { img:'1566576912221-025448b8c2be', name:'高达模型套件', price:45.00, sold:2345, cat:'潮玩', rating:4.7, reviews:1234 },
];

function genProducts(tier, cat, sort) {
  const ti = TIER_INFO[tier];
  let filtered = cat === '全部' ? [...PRODUCTS] : PRODUCTS.filter(p => p.cat === cat);
  if (sort === 'rating') filtered.sort((a,b) => b.rating - a.rating);
  if (sort === 'sales') filtered.sort((a,b) => b.sold - a.sold);
  if (sort === 'price') filtered.sort((a,b) => a.price - b.price);
  return filtered.map((p, i) => ({
    ...p, id: i,
    img: `https://images.unsplash.com/photo-${p.img}?w=400&h=400&fit=crop`,
    capital: ti.capital,
    profit: Math.round((ti.min + Math.random() * (ti.max - ti.min)) * 100) / 100,
    roi: Math.round(((ti.max) / ti.capital) * 100),
  }));
}

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11} fill={i <= Math.round(rating) ? '#F59E0B' : 'none'} stroke={i <= Math.round(rating) ? '#F59E0B' : '#D1D5DB'} />
      ))}
      <span className="text-[11px] text-amber-600 font-bold ml-1">{rating}</span>
    </div>
  );
}

function ProcessingModal({ product, onDone }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (step >= 3) { setDone(true); const t = setTimeout(onDone, 1000); return () => clearTimeout(t); }
    const t = setTimeout(() => setStep(s => s + 1), 2000); return () => clearTimeout(t);
  }, [step]);
  if (done) return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl p-8 text-center animate-burst shadow-2xl w-full max-w-sm">
        <div className="w-16 h-16 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>
        <p className="text-sm text-text-muted">交易完成</p>
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

export default function StorePage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [showProcess, setShowProcess] = useState(false);
  const [processingProduct, setProcessingProduct] = useState(null);
  const [category, setCategory] = useState('数码');
  const [sort, setSort] = useState('sales');
  const [search, setSearch] = useState('');

  const loadStatus = useCallback(async () => {
    try { const { data } = await client.get('/store/status'); setStatus(data); } catch { /* */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadStatus(); }, []);

  const products = useMemo(() => {
    if (!status?.hasStore) return [];
    const prods = genProducts(status.store.tier, category, sort);
    if (!search.trim()) return prods;
    return prods.filter(p => p.name.includes(search) || p.cat.includes(search));
  }, [status?.hasStore, status?.store?.tier, status?.store?.doneToday, category, sort, search]);

  const handleOpen = async () => {
    setOpening(true);
    try { const { data } = await client.post('/store/open'); setStatus({ hasStore: true, store: data }); toast.success('开店成功！'); }
    catch (err) { toast.error(err.response?.data?.error || '操作失败'); }
    finally { setOpening(false); }
  };

  const handleBuy = async (product) => {
    setProcessingProduct(product);
    setShowProcess(true);
    try {
      await client.post('/store/orders/process');
      setTimeout(async () => { setShowProcess(false); setProcessingProduct(null); await loadStatus(); }, 7200);
    } catch (err) { setShowProcess(false); setProcessingProduct(null); toast.error(err.response?.data?.error || '操作失败'); }
  };

  const handleClose = async () => {
    if (!confirm('确定关店？')) return;
    try { await client.post('/store/close'); setStatus({ hasStore: false }); toast.success('已关店'); }
    catch (err) { toast.error(err.response?.data?.error || '操作失败'); }
  };

  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!status?.hasStore) return (
    <div className="min-h-screen bg-bg safe-top safe-bottom flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FF6B00] to-[#FFB800] flex items-center justify-center mb-4 shadow-xl shadow-orange-500/20"><Store size={36} className="text-white" /></div>
      <h1 className="text-2xl font-black text-text mb-2">电商</h1>
      <p className="text-sm text-text-muted mb-6">免费开店 · 选品进货 · 卖出赚差价</p>
      <div className="bg-white rounded-2xl p-4 border border-separator shadow-sm w-full max-w-xs mb-6 text-left space-y-2 text-sm">
        <div className="flex items-center gap-2"><Store size={16} className="text-amber-500" /><span>开店即送 <b>Lv.1 小店</b></span></div>
        <div className="flex items-center gap-2"><ShoppingCart size={16} className="text-blue-500" /><span>每单垫付 <b>$1</b> 本金</span></div>
        <div className="flex items-center gap-2"><Crown size={16} className="text-violet-500" /><span>完成 <b>50单</b> 升级中店</span></div>
      </div>
      <button onClick={handleOpen} disabled={opening} className="w-full max-w-xs py-4 bg-gradient-to-r from-[#FF6B00] to-[#FFB800] text-white font-bold rounded-2xl shadow-xl shadow-orange-500/25 active:scale-[0.98] transition-all text-base">
        {opening ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : '免费开店'}
      </button>
    </div>
  );

  const s = status.store;
  const ti = TIER_INFO[s.tier];
  const dayPct = s.dailyOrders > 0 ? (s.doneToday / s.dailyOrders) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#f5f5f5] safe-top safe-bottom flex flex-col page-container">
      {/* Amazon-style header */}
      <div className="shrink-0 bg-gradient-to-r from-[#131921] to-[#232f3e] text-white">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-black" style={{ background: ti.color }}><Store size={16} /></div>
          <div className="flex-1">
            <p className="text-[10px] text-white/60">{t(ti.nameKey)} · {ti.tag}</p>
            <p className="text-[13px] font-bold">累计{s.totalOrders}单 · 日限{s.dailyOrders}单</p>
          </div>
          <button onClick={handleClose} className="text-[10px] text-white/60 px-2 py-1 rounded border border-white/20">关店</button>
        </div>
        {/* Search bar */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="flex-1 flex items-center bg-white rounded-lg overflow-hidden">
            <Search size={14} className="ml-3 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索商品名称..." className="flex-1 px-2 py-2 text-[13px] text-gray-800 bg-transparent outline-none" />
            {search && <button onClick={() => setSearch('')} className="px-2 text-gray-400"><X size={14} /></button>}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-white/10 text-white text-[11px] px-2 rounded-lg outline-none border border-white/20">
            <option value="sales" className="text-gray-800">畅销</option>
            <option value="rating" className="text-gray-800">评分</option>
            <option value="price" className="text-gray-800">价格</option>
          </select>
        </div>
      </div>

      {/* Category bar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-2 flex gap-1 overflow-x-auto native-scroll scrollbar-none py-2">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium ${category === c ? 'bg-[#131921] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4 text-[10px] text-gray-500">
        <span>今日 <b className="text-gray-800">{s.doneToday}/{s.dailyOrders}</b></span>
        <span>利润 <b className="text-green-600">${s.todayEarnings.toFixed(2)}</b></span>
        <span>余额 <b className="text-gray-800">${s.balance.toFixed(2)}</b></span>
        {s.nextTier && <span className="ml-auto text-amber-600 flex items-center gap-0.5"><Crown size={10} />{s.totalOrders}/{s.nextTier.threshold}</span>}
      </div>

      {/* Level progress */}
      {s.nextTier && (
        <div className="shrink-0 bg-white px-4 py-1 border-b border-gray-200">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <span>距{t(s.nextTier.nameKey)}</span>
            <div className="flex-1 h-1 bg-gray-100 rounded-full"><div className="h-full rounded-full" style={{width:`${Math.min(100,(s.totalOrders/s.nextTier.threshold)*100)}%`,background:ti.color}} /></div>
            <span>{s.totalOrders}/{s.nextTier.threshold}</span>
          </div>
        </div>
      )}

      {/* Product list - Amazon style */}
      <div className="flex-1 overflow-y-auto native-scroll">
        <div className="px-4 py-2 text-[11px] text-gray-500 flex justify-between">
          <span>{products.length} 件商品</span>
          {!s.canAfford && s.remaining > 0 && <span className="text-red-500">余额不足，需要${ti.capital}</span>}
        </div>
        <div className="divide-y divide-gray-100 bg-white border-y border-gray-200">
          {products.map(p => (
            <div key={p.id} className="flex gap-3 px-4 py-3 active:bg-gray-50 cursor-pointer" onClick={() => handleBuy(p)}>
              {/* Product image */}
              <div className="w-[100px] h-[100px] shrink-0 bg-gray-100 rounded-lg overflow-hidden relative">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                {p.sold > 5000 && <span className="absolute top-1 left-1 text-[9px] px-1 py-0.5 rounded bg-red-500 text-white font-bold">Best</span>}
              </div>
              {/* Product info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <p className="text-[13px] text-gray-900 leading-tight line-clamp-2 font-medium">{p.name}</p>
                  <Stars rating={p.rating} />
                  <p className="text-[10px] text-gray-500 mt-0.5">{p.sold.toLocaleString()}件已售 · {p.cat}</p>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-gray-400 line-through">${p.price}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-gray-500">利润</span>
                      <span className="text-base font-bold text-green-600">+${p.profit.toFixed(2)}</span>
                      <span className="text-[10px] text-gray-400">/单</span>
                    </div>
                  </div>
                  <button className="shrink-0 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[11px] font-bold active:scale-95">
                    进货
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {products.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            {search ? '没有找到匹配的商品' : '该分类暂无商品'}
          </div>
        )}
      </div>

      {/* Processing overlay */}
      {showProcess && processingProduct && <ProcessingModal product={processingProduct} onDone={() => {}} />}
    </div>
  );
}
