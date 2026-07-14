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

const PRODUCTS = [
  { img:'1505740420928-5e560c06d30e', imgs:['1505740420928-5e560c06d30e','1598532163257-ae3c8b2b2b2b','1583394838336-acd977736f90','1523275335684-37898b6baf30'], name:'无线降噪蓝牙耳机 主动降噪 40小时续航 IPX5防水 蓝牙5.3 折叠便携', price:29.99, sold:8947, cat:'数码', rating:4.7, reviews:3241, specs:{'连接方式':'蓝牙5.3','续航时间':'40小时','降噪类型':'主动降噪 ANC','防水等级':'IPX5','充电接口':'Type-C','重量':'250g'}, desc:'采用最新主动降噪技术，可消除99%环境噪音。40小时超长续航，Type-C快充10分钟使用3小时。折叠设计方便携带，IPX5级防水防汗，适合运动使用。内置高清麦克风，通话清晰。' },
  { img:'1523275335684-37898b6baf30', imgs:['1523275335684-37898b6baf30','1505740420928-5e560c06d30e','1496181133206-80ce9b88a853'], name:'智能运动手表 1.85寸AMOLED屏 心率血氧监测 100+运动模式 IP68防水', price:59.99, sold:3401, cat:'数码', rating:4.5, reviews:1892, specs:{'屏幕尺寸':'1.85寸 AMOLED','电池续航':'14天','防水等级':'IP68','运动模式':'100+种','传感器':'心率/血氧/加速度','兼容系统':'iOS/Android'}, desc:'1.85寸AMOLED高清屏，Always-On Display常亮显示。支持心率、血氧、睡眠监测，100+运动模式自动识别。IP68级防水，游泳佩戴无忧。14天超长续航，磁吸充电方便快捷。' },
  { img:'1618366712010-f4ae9c647dcb', imgs:['1618366712010-f4ae9c647dcb','1505740420928-5e560c06d30e','1546868871-af0de0ae72be'], name:'头戴式电竞耳机 7.1虚拟环绕声 RGB炫光灯效 降噪麦克风 多平台兼容', price:39.99, sold:2098, cat:'数码', rating:4.6, reviews:1567, specs:{'声道':'7.1虚拟环绕声','连接方式':'USB/3.5mm','灯效':'RGB流光','麦克风':'降噪可拆卸','耳罩材质':'蛋白皮记忆棉','重量':'320g'}, desc:'专业电竞级7.1虚拟环绕声，精准听声辨位。50mm大驱动单元，低音震撼。RGB流光灯效，电竞氛围拉满。可拆卸降噪麦克风，团队语音清晰无杂音。蛋白皮记忆棉耳罩，长时间佩戴不疲劳。' },
  { img:'1583394838336-acd977736f90', imgs:['1583394838336-acd977736f90','1527814050087-3793815479db','1505740420928-5e560c06d30e'], name:'便携蓝牙音箱 30W大功率 360°环绕立体声 IPX7防水 20小时续航', price:49.99, sold:4521, cat:'数码', rating:4.4, reviews:2891, specs:{'功率':'30W','续航':'20小时','防水':'IPX7','连接':'蓝牙5.3/3.5mm','重量':'580g','尺寸':'18x7x7cm'}, desc:'30W大功率输出，360°环绕立体声，低音饱满高音清澈。IPX7级防水，泳池派对也不怕。20小时续航，Type-C快充。支持TWS串联，两个音箱组成立体声。内置麦克风，免提通话。' },
  { img:'1527814050087-3793815479db', imgs:['1527814050087-3793815479db','1546868871-af0de0ae72be','1496181133206-80ce9b88a853'], name:'RGB机械键盘 87键热插拔 青轴红轴可选 PBT键帽 全键无冲', price:79.99, sold:3210, cat:'数码', rating:4.8, reviews:4532, specs:{'键位':87,'轴体':'青轴/红轴可选','键帽':'PBT双色注塑','连接':'Type-C有线','背光':'RGB 1680万色','重量':'850g'}, desc:'87键紧凑布局，节省桌面空间。热插拔轴座，随心更换轴体。PBT双色键帽，耐磨不掉色。RGB背光1680万色可调，多种灯效模式。全键无冲，电竞级响应速度。铝合金面板，质感出众。' },
  { img:'1496181133206-80ce9b88a853', imgs:['1496181133206-80ce9b88a853','1527814050087-3793815479db','1516035069371-29a1b244cc32'], name:'静音无线鼠标 双模蓝牙/2.4G 6按键 可调DPI 16000DPI 人体工学', price:25.99, sold:6789, cat:'数码', rating:4.3, reviews:5678, specs:{'连接':'蓝牙5.0/2.4G双模','DPI':'800-16000可调','按键':'6键可编程','电池':'500mAh充电','重量':'89g','尺寸':'12.5x6.5x4cm'}, desc:'蓝牙/2.4G双模连接，一键切换3台设备。16000DPI高精度传感器，办公游戏两不误。静音微动按键，图书馆也不打扰别人。人体工学设计，长时间使用不疲劳。500mAh大电池，充电一次用3个月。' },
  { img:'1516035069371-29a1b244cc32', imgs:['1516035069371-29a1b244cc32','1496181133206-80ce9b88a853','1588872657578-7efd1f1555ed'], name:'轻薄笔记本电脑 15.6寸FHD屏 16GB内存 512GB固态 Win11办公本', price:699.00, sold:567, cat:'数码', rating:4.6, reviews:892, specs:{'屏幕':'15.6寸 FHD IPS','处理器':'Intel i5-1240P','内存':'16GB DDR4','硬盘':'512GB NVMe SSD','显卡':'Intel Iris Xe','系统':'Windows 11','重量':'1.65kg'}, desc:'15.6寸FHD IPS窄边框屏幕，178°广视角。12代i5处理器，16GB大内存，512GB高速固态，多任务办公流畅无卡顿。全金属机身仅1.65kg，轻薄便携。指纹解锁，背光键盘，10小时续航。' },
  { img:'1588872657578-7efd1f1555ed', imgs:['1588872657578-7efd1f1555ed','1592899677977-9c10ca588bbd','1516035069371-29a1b244cc32'], name:'单反相机镜头 50mm F1.8 大光圈定焦 自动对焦 人像摄影 全画幅', price:349.00, sold:432, cat:'数码', rating:4.9, reviews:654, specs:{'焦距':'50mm','光圈':'F1.8-F22','对焦':'STM步进马达','滤镜':'49mm','重量':'160g','卡口':'多卡口可选'}, desc:'F1.8大光圈，背景虚化柔美，人像摄影利器。STM步进马达，对焦安静迅速。光学镀膜减少眩光和鬼影。轻巧便携仅160g，日常挂机首选。全画幅兼容，成像锐利色彩真实。' },
  { img:'1592899677977-9c10ca588bbd', imgs:['1592899677977-9c10ca588bbd','1588872657578-7efd1f1555ed','1505740420928-5e560c06d30e'], name:'VR虚拟现实眼镜 4K分辨率 110°FOV 6DoF定位 Pico一体机 256G', price:299.00, sold:876, cat:'数码', rating:4.2, reviews:321, specs:{'分辨率':'4K (4320x2160)','FOV':'110°','追踪':'6DoF','存储':'256GB','电池':'5300mAh','重量':'295g'}, desc:'4K超清分辨率，110°超大视场角，沉浸式VR体验。6DoF精准定位，动作追踪无延迟。256GB大存储，海量VR游戏和应用。5300mAh大电池，连续使用3小时。295g轻量化设计，佩戴舒适。' },
  { img:'1505740420928-5e560c06d30e', imgs:['1505740420928-5e560c06d30e','1523275335684-37898b6baf30'], name:'无人机航拍器 4K相机 3轴云台 10公里图传 40分钟续航 一键返航', price:459.00, sold:345, cat:'数码', rating:4.7, reviews:234, specs:{'相机':'4K/60fps','图传':'10km','续航':'40分钟','云台':'3轴机械','重量':'249g','避障':'前后下三向'}, desc:'4K/60fps高清航拍，3轴机械云台画面稳定。10公里数字图传，实时观看航拍画面。40分钟超长续航，三向避障安全飞行。249g轻巧机身，无需注册即可飞行。一键短片、智能跟随、环绕拍摄。' },
  { img:'1595777457583-95e059d581b8', imgs:['1595777457583-95e059d581b8','1434389677669-e08b4cda5b60','1551232864-3f0890a3a0b6'], name:'法式碎花连衣裙 夏季新款 V领收腰 A字裙摆 雪纺面料 S-3XL', price:25.99, sold:3456, cat:'女装', rating:4.3, reviews:2345, specs:{'风格':'法式复古','面料':'雪纺','版型':'A字型','领型':'V领','袖长':'短袖','尺码':'S-3XL'}, desc:'进口雪纺面料，亲肤透气不闷汗。V领设计修饰脸型，收腰版型显瘦显高。A字裙摆飘逸灵动，搭配高跟鞋或平底鞋都好看。多色可选，适合日常通勤、约会度假。' },
  { img:'1593030761757-71fae45fa0e7', imgs:['1593030761757-71fae45fa0e7','1617137968427-85924c800a22','1596755094514-f87e34085b2c'], name:'意式修身西装外套 羊毛混纺 平驳领 双开叉 商务休闲 M-3XL', price:129.00, sold:1234, cat:'男装', rating:4.7, reviews:876, specs:{'面料':'70%羊毛30%聚酯','领型':'平驳领','版型':'修身','门襟':'两粒扣','开叉':'双开叉','尺码':'M-3XL'}, desc:'70%羊毛混纺面料，挺括有型不易皱。意式修身剪裁，显瘦不紧绷。平驳领经典大气，双开叉活动自如。商务会议或日常通勤皆宜，搭配西裤或牛仔裤都帅气。' },
  { img:'1586495777744-4413f21062fa', imgs:['1586495777744-4413f21062fa','1620916566398-39f1143ab7be','1596462502278-27bfdc403348'], name:'丝绒雾面唇釉套装 6色组合 哑光不沾杯 持久显色 防水不掉色', price:24.99, sold:4567, cat:'美妆', rating:4.5, reviews:3210, specs:{'质地':'哑光雾面','色号':'6色套装','功效':'持久/防水','容量':'6x3.5ml','适合':'所有肤质','保质期':'3年'}, desc:'6款热门色号一套拥有，温柔豆沙到气场正红。哑光雾面质地，上唇丝滑不拔干。成膜后不沾杯不掉色，吃饭喝水无压力。防水配方，健身出汗也不脱妆。' },
  { img:'1542291026-7eec264c27ff', imgs:['1542291026-7eec264c27ff','1560769629-975ec94e6a86','1543163521-1bf5397cc6f9'], name:'Air Max复古运动鞋 气垫减震 网面透气 潮流百搭 男女同款 36-45码', price:89.99, sold:5621, cat:'鞋靴', rating:4.6, reviews:4321, specs:{'鞋面':'飞织网面','鞋底':'Air Max气垫','闭合':'系带','适用':'跑步/休闲','重量':'280g(42码)','尺码':'36-45'}, desc:'Air Max可视化气垫，每一步都像踩在云上。飞织网面透气不闷脚，夏天穿也舒爽。经典复古鞋型，搭配牛仔裤、运动裤都好看。男女同款，情侣鞋首选。' },
  { img:'1555041469-a586c61ea9bc', imgs:['1555041469-a586c61ea9bc','1586023492125-27b2c045efd7','1507473885765-e6ed057ab6fe'], name:'北欧极简台灯 LED护眼 三档色温 无极调光 夹子底座两用 学生书桌', price:22.00, sold:2345, cat:'家居', rating:4.2, reviews:1876, specs:{'光源':'LED 12W','色温':'3000K/4500K/6000K','调光':'无极调光','供电':'USB充电','固定':'夹子+底座','材质':'铝合金+ABS'}, desc:'三档色温一键切换，暖光阅读、白光工作。无极调光，亮度随心调节。夹子底座两用，书桌床头都能用。LED护眼光源，无频闪不伤眼。USB充电，电脑充电宝都能供电。' },
];

const EXTRA_IMGS = ['1523275335684-37898b6baf30','1598532163257-ae3c8b2b2b2b','1583394838336-acd977736f90','1546868871-af0de0ae72be','1618366712010-f4ae9c647dcb','1496181133206-80ce9b88a853','1516035069371-29a1b244cc32','1588872657578-7efd1f1555ed','1592899677977-9c10ca588bbd'];

function genProducts(tier, cat, search) {
  const ti = TIER_INFO[tier];
  let filtered = cat === '全部' ? [...PRODUCTS] : PRODUCTS.filter(p => p.cat === cat);
  if (search) filtered = filtered.filter(p => p.name.includes(search) || p.cat.includes(search));
  filtered.sort((a,b) => b.sold - a.sold);
  return filtered.map((p, i) => ({
    ...p, id: i,
    img: `https://images.unsplash.com/photo-${p.img}?w=600&h=600&fit=crop`,
    imgs: p.imgs.map(id => `https://images.unsplash.com/photo-${id}?w=600&h=600&fit=crop`),
    capital: ti.capital,
    profit: Math.round((ti.min + Math.random() * (ti.max - ti.min)) * 100) / 100,
  }));
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
  const [detailImg, setDetailImg] = useState(0);

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
          {/* Image gallery */}
          <div className="relative">
            <img src={p.imgs[detailImg] || p.img} alt={p.name} className="w-full aspect-square object-cover bg-gray-50" />
            <div className="flex gap-1 px-4 mt-2 overflow-x-auto pb-2">
              {p.imgs.map((img, i) => (
                <button key={i} onClick={() => setDetailImg(i)} className={`shrink-0 w-10 h-10 rounded border-2 overflow-hidden ${i === detailImg ? 'border-[#e77600] shadow-md' : 'border-gray-200'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
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
                <span className="text-xs text-gray-500">-</span>
                <span className="text-3xl font-medium text-gray-900">${p.capital}</span>
                <span className="text-xs text-gray-500">垫付本金</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 line-through">市场价: ${p.price}</span>
                <span className="text-sm text-green-600 font-bold">利润 +${p.profit.toFixed(2)}</span>
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
            <p className="text-lg font-bold text-gray-900">${p.capital} <span className="text-xs font-normal text-gray-500">本金</span></p>
            <p className="text-xs text-green-600">+${p.profit.toFixed(2)} 利润</p>
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
          {!s.canAfford && s.remaining > 0 && <span className="text-red-500">余额不足${ti.capital}</span>}
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
                  <span className="text-[10px] text-gray-400 line-through">${p.price}</span>
                  <div><span className="text-lg font-bold text-gray-900">${p.capital}</span><span className="text-xs text-gray-500 ml-1">本金</span><span className="ml-2 text-sm font-bold text-green-600">+${p.profit.toFixed(2)}</span></div>
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
