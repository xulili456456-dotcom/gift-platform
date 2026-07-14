import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { Crown, ShoppingCart, X, Flame, Store, Search, Star, ChevronRight, ChevronLeft, Truck, Shield, RotateCcw, BadgePercent } from 'lucide-react';
import toast from 'react-hot-toast';

const TIER_INFO = {
  small:  { nameKey: 'store.small',  capital: 1,  daily: 10, min: 0.05, max: 0.3,  color: '#F59E0B', tag: 'Lv.1' },
  medium: { nameKey: 'store.medium', capital: 3,  daily: 20, min: 0.1,  max: 0.5,  color: '#8B5CF6', tag: 'Lv.2', need: 50 },
  large:  { nameKey: 'store.large',  capital: 10, daily: 40, min: 0.2,  max: 1.0,  color: '#EF4444', tag: 'Lv.3', need: 200 },
};

const CATEGORIES = ['全部', '数码', '女装', '男装', '美妆', '鞋靴', '家居', '配饰', '食品', '潮玩'];

// 商品列表 — 亮哥逐个添加
// 格式: { img:'图片URL', name:'商品名称', price:市场价, sold:销量, cat:'分类', rating:评分, reviews:评论数, specs:{'参数':'值'}, desc:'描述' }
const PRODUCTS = [
  { img:'/products/1.jpg', name:'Samsung 14" Galaxy Chromebook Go Laptop - Intel Celeron N4500, 4GB RAM, 64GB Storage, ChromeOS, Silver', price:212.22, sold:6500, cat:'数码', rating:4.3, reviews:656, specs:{'屏幕':'14" HD','处理器':'Intel Celeron N4500','内存':'4GB','存储':'64GB eMMC','系统':'ChromeOS','型号':'XE340XDA-KA2US'}, desc:'轻便Chromebook，适合学生和日常使用。14英寸屏，WiFi6，Type-C充电。' },
  { img:'/products/2.jpg', name:'HP OmniBook 3 14" Next Gen AI PC - Snapdragon X, 16GB RAM, 512GB SSD, 2K Display, Windows 11 Home', price:599.99, sold:1200, cat:'数码', rating:4.3, reviews:28, specs:{'屏幕':'14" 2K IPS 300nit','处理器':'Snapdragon X X1-26-100','内存':'16GB LPDDR5x','存储':'512GB SSD','显卡':'Qualcomm Adreno','系统':'Windows 11 Home','颜色':'Glacier Silver'}, desc:'HP OmniBook 3 新一代AI PC。Snapdragon X处理器，16GB高速内存，512GB固态硬盘。14英寸2K超清屏幕，轻薄便携。Windows 11 Home系统，AI智能助手。长续航，Type-C快充。' },
  { img:'/products/3.jpg', name:'ASUS ROG Astral NVIDIA GeForce RTX 5080 16GB GDDR7 OC Edition Gaming Graphics Card', price:1843.99, sold:230, cat:'数码', rating:4.4, reviews:167, specs:{'芯片':'NVIDIA RTX 5080','显存':'16GB GDDR7','频率':'2790MHz OC','接口':'PCIe 5.0','输出':'DP 2.1a x3 + HDMI 2.1b x2','散热':'3.8槽 4风扇 均热板','保修':'3年'}, desc:'ASUS ROG Astral RTX 5080 OC版旗舰显卡。16GB GDDR7高速显存，PCIe 5.0接口。4风扇设计+专利均热板散热。支持DLSS 4、光线追踪。' },
  { img:'/products/4.jpg', name:'ASUS ROG Astral NVIDIA GeForce RTX 5090 32GB GDDR7 OC Edition Gaming Graphics Card', price:4329.99, sold:65, cat:'数码', rating:4.5, reviews:234, specs:{'芯片':'NVIDIA RTX 5090','显存':'32GB GDDR7','频率':'2512MHz OC','接口':'PCIe 5.0','输出':'DP 2.1a + HDMI 2.1b','散热':'3.8槽 4风扇 均热板','保修':'3年'}, desc:'ASUS ROG Astral RTX 5090 OC版旗舰显卡。32GB GDDR7超大显存，性能巅峰。4风扇+专利均热板散热。支持DLSS 4、光线追踪。4K/8K游戏无压力。' },
  { img:'/products/5.jpg', name:'Meta Quest 3 512GB VR Headset - Wireless, 100+ Games, 3-Month Meta Horizon+ Trial Included', price:599.00, sold:4200, cat:'数码', rating:4.5, reviews:5918, specs:{'平台':'Meta Quest','存储':'512GB','连接':'WiFi 6E 无线','显示':'4K+ Infinite Display','音频':'3D空间音频','重量':'515g','内容':'100+游戏 + 3月Meta Horizon+'}, desc:'Meta Quest 3 512GB无线VR一体机。4K+超清显示，全彩透视混合现实。无需PC或线缆，开机即玩。100+款游戏，3个月Meta Horizon+会员。轻量化515g，长时间佩戴也舒适。' },
  { img:'/products/6.jpg', name:'Sony Alpha 7 IV Full-Frame Mirrorless Camera with 28-70mm Zoom Lens Kit', price:2198.00, sold:120, cat:'数码', rating:4.8, reviews:18, specs:{'传感器':'33MP Exmor R CMOS','处理器':'BIONZ XR','视频':'4K 60p','对焦':'759点相位检测','防抖':'5轴机身防抖','屏幕':'Vari-Angle翻转屏','卡口':'Sony E/FE'}, desc:'Sony A7 IV全画幅微单相机。33MP Exmor R传感器，BIONZ XR处理器。4K 60p视频，759点高速对焦。5轴防抖，翻转屏。含28-70mm镜头，一机走天下。' },
  { img:'/products/7.jpg', name:'Sony Alpha 7 V Full-Frame Hybrid Mirrorless Camera Body Only', price:2898.00, sold:120, cat:'数码', rating:4.7, reviews:89, specs:{'传感器':'33MP Stacked Exmor RS CMOS','处理器':'BIONZ XR2 with AI','连拍':'30fps Blackout-Free','防抖':'5轴IBIS 7.5档','视频':'4K 120p','对焦':'AI智能对焦'}, desc:'Sony A7 V全画幅微单旗舰。33MP堆栈式Exmor RS传感器，BIONZ XR2 AI处理器。30fps无黑视连拍，AI智能对焦。5轴防抖7.5档，4K120p视频。专业摄影首选。' },
  { img:'/products/8.jpg', name:'Apple iPhone 17 Pro 256GB Unlocked - Cosmic Orange (Renewed Premium)', price:1069.00, sold:320, cat:'数码', rating:4.3, reviews:249, specs:{'存储':'256GB','屏幕':'6.3" ProMotion','芯片':'A19 Pro','摄像头':'48MP三摄','网络':'5G eSIM','颜色':'Cosmic Orange','系统':'iOS 19'}, desc:'Apple iPhone 17 Pro 256GB解锁版。A19 Pro芯片，48MP三摄系统。6.3寸ProMotion屏幕，5G网络。Cosmic Orange配色，Amazon Renewed Premium认证翻新。' },
  { img:'/products/9.jpg', name:'Apple Studio Display XDR 27" 5K Monitor - Standard Glass, VESA Mount Adapter', price:2889.00, sold:8, cat:'数码', rating:4.2, reviews:5, specs:{'屏幕':'27" 5K Retina','分辨率':'5120x2880 218ppi','亮度':'1600nit XDR','接口':'Thunderbolt 4 x1 + USB-C x3','音频':'6扬声器 空间音频','摄像头':'12MP Ultra Wide','芯片':'Apple A13'}, desc:'Apple Studio Display XDR 27寸5K显示器。5120x2880分辨率，1600nit峰值亮度。Thunderbolt 4接口，6扬声器空间音频。12MP超广角摄像头，人物居中功能。' },
  { img:'/products/10.jpg', name:'LG 83" OLED evo AI 4K G5 Smart TV Dolby Atmos Vision HDR10', price:4999.99, sold:55, cat:'数码', rating:4.6, reviews:297, specs:{'屏幕':'83" OLED evo 4K','处理器':'AI α11 Gen2','音频':'Dolby Atmos','HDR':'Dolby Vision/HDR10'}, desc:'LG 83英寸OLED evo G5旗舰。AI处理器，4K超清。Dolby全景声+视界。' },
  { img:'/products/11.jpg', name:'Acer Chromebook Plus 515 Laptop 15.6" FHD Touch - Intel Core i3-1305U, 8GB RAM, 256GB SSD, Chrome OS', price:469.00, sold:280, cat:'数码', rating:4.3, reviews:259, specs:{'屏幕':'15.6" FHD IPS 触摸','处理器':'Intel Core i3-1305U','内存':'8GB LPDDR5X','存储':'256GB SSD','系统':'Chrome OS','网络':'WiFi 6E','功能':'Google AI Gemini'}, desc:'Acer Chromebook Plus 515。15.6寸FHD触摸屏，Core i3处理器，8GB内存，256GB固态。Chrome OS系统，内置Google AI助手。WiFi 6E快速连接。' },
  { img:'/products/12.jpg', name:'ASUS Chromebook Flip CX1 14" FHD 360° Touch - Celeron N4500, 8GB RAM, 128GB eMMC, ChromeOS', price:438.00, sold:560, cat:'数码', rating:4.4, reviews:549, specs:{'屏幕':'14" FHD NanoEdge 触摸','处理器':'Intel Celeron N4500','内存':'8GB RAM','存储':'128GB eMMC','系统':'Chrome OS','翻转':'360°翻转触屏','颜色':'Transparent Silver'}, desc:'ASUS Chromebook Flip CX1 14寸360度翻转触摸屏。NanoEdge窄边框，Celeron处理器，8GB内存。ChromeOS系统，平板/笔记本一键切换。' },
  { img:'/products/13.jpg', name:'ASUS Chromebook CX15 15.6" FHD Anti-Glare - Intel N50, 8GB RAM, 128GB SSD, ChromeOS', price:383.00, sold:55, cat:'数码', rating:4.4, reviews:42, specs:{'屏幕':'15.6" FHD 防眩光','处理器':'Intel N50','内存':'8GB RAM','存储':'128GB','系统':'Chrome OS','安全':'Titan C2芯片','颜色':'Pure Grey'}, desc:'ASUS Chromebook CX15。15.6寸FHD防眩光大屏，Intel N50处理器，8GB内存。ChromeOS系统，Titan C2安全芯片。NanoEdge窄边框设计。' },
];


function genProducts(tier, cat, search) {
  const ti = TIER_INFO[tier];
  let filtered = cat === '全部' ? [...PRODUCTS] : PRODUCTS.filter(p => p.cat === cat);
  if (search) filtered = filtered.filter(p => p.name.includes(search) || p.cat.includes(search));
  filtered.sort((a,b) => b.sold - a.sold);
  return filtered.map((p, i) => {
    const rate = 0.7 + Math.random() * 0.2; // 70%-90%
    const cost = Math.round(p.price * rate * 100) / 100;
    const profit = Math.round((p.price - cost) * 100) / 100;
    return { ...p, id: i, img: p.img, costPrice: cost, capital: cost, profit, dailyOrders: ti.dailyOrders };
  });
}

function Stars({ rating, reviews, showCount }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5">
        {[1,2,3,4,5].map(i => {
          const pct = Math.max(0, Math.min(100, (rating - i + 1) * 100));
          return (
            <span key={i} className="relative inline-block w-[14px] h-[14px]">
              <Star size={14} fill="none" stroke="#D1D5DB" />
              <span className="absolute inset-0 overflow-hidden" style={{width: `${i <= Math.floor(rating) ? 100 : i <= rating ? (rating % 1) * 100 : 0}%`}}>
                <Star size={14} fill="#F59E0B" stroke="#F59E0B" />
              </span>
            </span>
          );
        })}
      </span>
      {reviews != null && <span className="text-[#007185] text-xs hover:underline cursor-pointer">{rating} ({reviews.toLocaleString()})</span>}
    </span>
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
        <div className="flex justify-center gap-4 mt-2 text-xs"><span className="text-text-muted">本金${product.capital}</span><span className="text-green-500 font-bold">+${product.profit}</span></div>
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl p-8 text-center animate-scale-in shadow-2xl w-full max-w-sm">
        <div className="w-3 h-3 bg-primary rounded-full mx-auto mb-3 animate-bounce-pulse" />
        <p className="text-lg font-bold text-text">处理订单中...</p>
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
  const [category, setCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);

  const loadStatus = useCallback(async () => {
    try { const { data } = await client.get('/store/status'); setStatus(data); } catch { /* */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadStatus(); }, []);

  const products = useMemo(() => {
    if (!status?.hasStore) return [];
    return genProducts(status.store.tier, category, search);
  }, [status?.hasStore, status?.store?.tier, status?.store?.doneToday, category, search]);

  const handleOpen = async () => { /* same */ setOpening(true); try { const { data } = await client.post('/store/open'); setStatus({ hasStore: true, store: data }); toast.success('开店成功！'); } catch (err) { toast.error(err.response?.data?.error || '操作失败'); } finally { setOpening(false); } };
  const handleBuy = async (product) => { setProcessingProduct(product); setShowProcess(true); try { await client.post('/store/orders/process'); setTimeout(async () => { setShowProcess(false); setProcessingProduct(null); await loadStatus(); }, 7200); } catch (err) { setShowProcess(false); setProcessingProduct(null); toast.error(err.response?.data?.error || '操作失败'); } };
  const handleClose = async () => { if (!confirm('确定关店？')) return; try { await client.post('/store/close'); setStatus({ hasStore: false }); toast.success('已关店'); } catch (err) { toast.error(err.response?.data?.error || '操作失败'); } };
  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!status?.hasStore) return (
    <div className="min-h-screen bg-bg safe-top safe-bottom flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FF6B00] to-[#FFB800] flex items-center justify-center mb-4 shadow-xl"><Store size={36} className="text-white" /></div>
      <h1 className="text-2xl font-black text-text mb-2">电商</h1><p className="text-sm text-text-muted mb-6">免费开店 · 选品进货 · 卖出赚差价</p>
      <button onClick={handleOpen} disabled={opening} className="w-full max-w-xs py-4 bg-gradient-to-r from-[#FF6B00] to-[#FFB800] text-white font-bold rounded-2xl shadow-xl shadow-orange-500/25 active:scale-[0.98] transition-all text-base">{opening ? '...' : '免费开店'}</button>
    </div>
  );

  const s = status.store;
  const ti = TIER_INFO[s.tier];

  // Product detail page
  if (detail) {
    const p = detail;
    return (
      <div className="min-h-screen bg-white safe-top safe-bottom flex flex-col page-container">
        {/* Top nav */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200">
          <button onClick={() => setDetail(null)} className="text-gray-500"><ChevronLeft size={20} /></button>
          <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
        </div>

        <div className="flex-1 overflow-y-auto native-scroll">
          {/* Product image */}
          <div className="relative">
            <img src={p.img} alt={p.name} className="w-full aspect-square object-cover bg-gray-50" />
          </div>

          <div className="px-4 py-3">
            {/* Title */}
            <h1 className="text-base font-medium text-gray-900 leading-snug">{p.name}</h1>
            {/* Rating */}
            <div className="mt-1 flex items-center gap-2">
              <Stars rating={p.rating} reviews={p.reviews} />
              <span className="text-xs text-gray-500">|</span>
              <span className="text-xs text-[#007185] hover:underline cursor-pointer">{p.sold.toLocaleString()} 件已售</span>
            </div>
            {/* Limited deal */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold flex items-center gap-1"><BadgePercent size={12} />限时优惠</span>
            </div>
            {/* Price */}
            <div className="mt-2 pb-3 border-b border-gray-200">
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-gray-500">市场价</span>
                <span className="text-3xl font-medium text-gray-900">${p.price}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-500">进货价 <b className="text-red-500">${p.costPrice.toFixed(2)}</b></span>
                <span className="text-sm text-green-600 font-bold">赚 +${p.profit.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">完成后本金全额退回 + 利润到账</p>
            </div>

            {/* Specs */}
            <div className="py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-2">技术规格</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {Object.entries(p.specs || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs"><span className="text-gray-500">{k}</span><span className="text-gray-900 font-medium">{v}</span></div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-2">商品描述</h3>
              <p className="text-xs text-gray-700 leading-relaxed">{p.desc}</p>
            </div>

            {/* Delivery info */}
            <div className="py-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-700"><Truck size={14} className="text-gray-500" /> 免费配送 · 处理后7个工作日内到账</div>
              <div className="flex items-center gap-2 text-xs text-gray-700"><Shield size={14} className="text-gray-500" /> 本金保障 · 100%退还</div>
              <div className="flex items-center gap-2 text-xs text-gray-700"><RotateCcw size={14} className="text-gray-500" /> 利润即时到账 · 可提现</div>
            </div>
          </div>
        </div>

        {/* Bottom buy bar */}
        <div className="shrink-0 px-4 py-3 border-t border-gray-200 bg-white flex items-center gap-3 safe-bottom">
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-900">${p.costPrice.toFixed(2)} <span className="text-xs font-normal text-gray-500">进货价</span></p>
            <p className="text-xs text-green-600">卖出赚 +${p.profit.toFixed(2)}</p>
          </div>
          <button onClick={() => handleBuy(p)} disabled={!s.canAfford || s.remaining <= 0}
            className={`px-8 py-3 rounded-full font-bold text-sm ${!s.canAfford || s.remaining <= 0 ? 'bg-gray-300 text-gray-500' : 'bg-[#FFD814] hover:bg-[#F7CA00] text-gray-900 shadow-md active:scale-95'} transition-all`}>
            {s.remaining <= 0 ? '今日已满' : !s.canAfford ? '余额不足' : '立即进货'}
          </button>
        </div>

        {showProcess && processingProduct && <ProcessingModal product={processingProduct} onDone={() => {}} />}
      </div>
    );
  }

  // Product list page
  return (
    <div className="min-h-screen bg-[#f5f5f5] safe-top safe-bottom flex flex-col page-container">
      {/* Header */}
      <div className="shrink-0 bg-[#131921] text-white">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-black" style={{ background: ti.color }}><Store size={16} /></div>
          <div className="flex-1"><p className="text-[10px] text-white/60">{t(ti.nameKey)} · {ti.tag} · 日限{s.dailyOrders}单</p><p className="text-[13px] font-bold">今日利润 ${s.todayEarnings.toFixed(2)}</p></div>
          <button onClick={handleClose} className="text-[10px] text-white/60 px-2 py-1 rounded border border-white/20">关店</button>
        </div>
        <div className="px-4 pb-3 flex gap-2">
          <div className="flex-1 flex items-center bg-white rounded-lg overflow-hidden">
            <Search size={14} className="ml-3 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索商品..." className="flex-1 px-2 py-2 text-[13px] text-gray-800 bg-transparent outline-none" />
            {search && <button onClick={() => setSearch('')} className="px-2 text-gray-400"><X size={14} /></button>}
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-2 flex gap-1 overflow-x-auto native-scroll scrollbar-none py-2">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium ${category === c ? 'bg-[#131921] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{c}</button>
        ))}
      </div>

      {/* Stats */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4 text-[10px] text-gray-500">
        <span>今日 <b className="text-gray-800">{s.doneToday}/{s.dailyOrders}</b></span>
        <span>余额 <b className="text-gray-800">${s.balance.toFixed(2)}</b></span>
        {s.nextTier && <span className="ml-auto text-amber-600"><Crown size={10} /> {s.totalOrders}/{s.nextTier.threshold}</span>}
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto native-scroll pb-4">
        <div className="px-4 py-2 text-[11px] text-gray-500 flex justify-between">
          <span>{products.length} 件</span>
          {!s.canAfford && s.remaining > 0 && <span className="text-red-500">余额不足</span>}
        </div>
        {products.map(p => (
          <div key={p.id} onClick={() => setDetail(p)} className="bg-white border-b border-gray-200 flex gap-3 px-4 py-3 active:bg-gray-50 cursor-pointer">
            <div className="w-[110px] h-[110px] shrink-0 bg-gray-50 rounded-lg overflow-hidden relative">
              <img src={p.img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
              {p.sold > 5000 && <span className="absolute top-1 left-1 text-[9px] px-1 py-0.5 rounded bg-red-500 text-white font-bold">Best</span>}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <p className="text-[13px] text-gray-900 leading-tight line-clamp-2 font-medium">{p.name}</p>
                <Stars rating={p.rating} reviews={p.reviews} />
                <p className="text-[10px] text-gray-500 mt-0.5">{p.sold.toLocaleString()}件已售</p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-[10px] text-gray-500">市场价: <b className="text-gray-900">${p.price}</b></span>
                  <div><span className="text-xs text-gray-500">进货价</span> <span className="text-base font-bold text-red-500">${p.costPrice.toFixed(2)}</span><span className="ml-2 text-sm font-bold text-green-600">赚 +${p.profit.toFixed(2)}</span></div>
                </div>
                <button className="shrink-0 px-4 py-1.5 rounded-full bg-[#FFD814] text-gray-900 text-[11px] font-bold active:scale-95">进货</button>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && <div className="text-center py-16 text-gray-400 text-sm"><Search size={32} className="mx-auto mb-3 opacity-30" />{search ? '无匹配商品' : '暂无商品'}</div>}
      </div>

      {showProcess && processingProduct && <ProcessingModal product={processingProduct} onDone={() => {}} />}
    </div>
  );
}
