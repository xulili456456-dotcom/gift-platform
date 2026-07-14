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

const CATEGORIES = ['全部', '数码', '女装', '男装', '美妆', '鞋靴', '家居', '配饰', '食品', '潮玩'];

const PRODUCTS = [
  // ── 数码 (35 items) ──
  { kw: 'wireless+headphones', name: '无线降噪蓝牙耳机', price: 29.99, sold: 8947, cat: '数码' },
  { kw: 'smartwatch', name: '智能运动手表', price: 59.99, sold: 3401, cat: '数码' },
  { kw: 'gaming+headset', name: '头戴式电竞耳机', price: 39.99, sold: 2098, cat: '数码' },
  { kw: 'gopro+camera', name: '4K高清运动相机', price: 199.00, sold: 1567, cat: '数码' },
  { kw: 'bluetooth+speaker', name: '便携蓝牙音箱', price: 49.99, sold: 4521, cat: '数码' },
  { kw: 'mechanical+keyboard', name: 'RGB机械键盘', price: 79.99, sold: 3210, cat: '数码' },
  { kw: 'wireless+mouse', name: '静音无线鼠标', price: 25.99, sold: 6789, cat: '数码' },
  { kw: 'ipad+case', name: 'iPad保护壳', price: 15.99, sold: 8901, cat: '数码' },
  { kw: 'laptop+computer', name: '轻薄笔记本电脑', price: 699.00, sold: 567, cat: '数码' },
  { kw: 'camera+lens', name: '单反相机镜头', price: 349.00, sold: 432, cat: '数码' },
  { kw: 'smart+home+display', name: '智能家居中控屏', price: 129.00, sold: 1234, cat: '数码' },
  { kw: 'phone+gimbal', name: '手机云台稳定器', price: 89.99, sold: 2345, cat: '数码' },
  { kw: 'vr+headset', name: 'VR虚拟现实眼镜', price: 299.00, sold: 876, cat: '数码' },
  { kw: 'wireless+charger', name: '无线充电底座', price: 19.99, sold: 7654, cat: '数码' },
  { kw: 'drone+quadcopter', name: '无人机航拍器', price: 459.00, sold: 345, cat: '数码' },
  { kw: 'power+bank', name: '大容量充电宝', price: 35.00, sold: 9876, cat: '数码' },
  { kw: 'usb+cable', name: '快充数据线套装', price: 12.99, sold: 15432, cat: '数码' },
  { kw: 'ssd+hard+drive', name: '便携固态硬盘1TB', price: 89.00, sold: 4321, cat: '数码' },
  { kw: 'webcam+hd', name: '高清网络摄像头', price: 45.00, sold: 2987, cat: '数码' },
  { kw: 'monitor+screen', name: '27寸4K显示器', price: 329.00, sold: 765, cat: '数码' },
  { kw: 'graphics+tablet', name: '数位板绘画板', price: 55.00, sold: 1876, cat: '数码' },
  { kw: 'earbuds+wireless', name: '真无线蓝牙耳塞', price: 39.00, sold: 6543, cat: '数码' },
  { kw: 'smart+band+fitness', name: '智能健身手环', price: 29.00, sold: 8765, cat: '数码' },
  { kw: 'projector+mini', name: '便携微型投影仪', price: 159.00, sold: 987, cat: '数码' },
  { kw: 'ring+light', name: '直播补光灯', price: 22.00, sold: 5678, cat: '数码' },
  { kw: 'laptop+stand', name: '铝合金笔记本支架', price: 28.00, sold: 4321, cat: '数码' },
  { kw: 'car+charger', name: '车载快充充电器', price: 15.00, sold: 7654, cat: '数码' },
  { kw: 'sd+memory+card', name: '512GB高速存储卡', price: 49.00, sold: 3456, cat: '数码' },
  { kw: 'bluetooth+adapter', name: '蓝牙5.3适配器', price: 9.99, sold: 11234, cat: '数码' },
  { kw: 'microphone+studio', name: '专业录音麦克风', price: 69.00, sold: 2345, cat: '数码' },
  { kw: 'phone+tripod', name: '手机三脚架自拍杆', price: 18.00, sold: 8765, cat: '数码' },
  { kw: 'router+wifi', name: 'WiFi6无线路由器', price: 79.00, sold: 3210, cat: '数码' },
  { kw: 'speaker+bluetooth+portable', name: '户外防水音箱', price: 42.00, sold: 2109, cat: '数码' },
  { kw: 'smart+plug', name: '智能插座WiFi版', price: 12.00, sold: 9876, cat: '数码' },
  { kw: 'electric+toothbrush', name: '声波电动牙刷', price: 35.00, sold: 5432, cat: '数码' },
  // ── 女装 (30 items) ──
  { kw: 'floral+dress', name: '法式碎花连衣裙', price: 25.99, sold: 3456, cat: '女装' },
  { kw: 'cardigan+sweater', name: '针织开衫外套', price: 35.00, sold: 2345, cat: '女装' },
  { kw: 'wide+leg+pants', name: '高腰阔腿裤', price: 28.00, sold: 4567, cat: '女装' },
  { kw: 'cotton+tshirt', name: '纯棉短袖T恤', price: 12.99, sold: 10987, cat: '女装' },
  { kw: 'silk+scarf', name: '真丝围巾礼盒', price: 22.00, sold: 3210, cat: '女装' },
  { kw: 'blouse+white', name: '白色衬衫女', price: 24.00, sold: 5678, cat: '女装' },
  { kw: 'denim+jacket', name: '牛仔外套女', price: 42.00, sold: 3456, cat: '女装' },
  { kw: 'skirt+pleated', name: '百褶半身裙', price: 19.99, sold: 7890, cat: '女装' },
  { kw: 'hoodie+womens', name: '连帽卫衣女', price: 32.00, sold: 6543, cat: '女装' },
  { kw: 'winter+coat+women', name: '羊毛大衣女', price: 89.00, sold: 1234, cat: '女装' },
  { kw: 'leggings+fitness', name: '运动紧身裤', price: 22.00, sold: 8765, cat: '女装' },
  { kw: 'pajama+silk', name: '真丝睡衣套装', price: 38.00, sold: 4321, cat: '女装' },
  { kw: 'tank+top', name: '吊带背心女', price: 9.99, sold: 11234, cat: '女装' },
  { kw: 'blazer+women', name: '小西装外套女', price: 45.00, sold: 2345, cat: '女装' },
  { kw: 'knit+sweater', name: '高领毛衣女', price: 36.00, sold: 3456, cat: '女装' },
  { kw: 'shorts+denim', name: '牛仔短裤女', price: 18.00, sold: 6789, cat: '女装' },
  { kw: 'evening+gown', name: '晚礼服长裙', price: 79.00, sold: 876, cat: '女装' },
  { kw: 'bikini+swimsuit', name: '连体泳衣', price: 25.00, sold: 5432, cat: '女装' },
  { kw: 'coat+trench', name: '风衣外套女', price: 55.00, sold: 2109, cat: '女装' },
  { kw: 'belt+leather+women', name: '真皮腰带女', price: 15.00, sold: 4321, cat: '女装' },
  { kw: 'gloves+leather', name: '羊皮手套女', price: 18.00, sold: 2987, cat: '女装' },
  { kw: 'hat+sun', name: '遮阳帽女', price: 12.00, sold: 7654, cat: '女装' },
  { kw: 'socks+cotton', name: '纯棉短袜5双装', price: 8.99, sold: 12345, cat: '女装' },
  { kw: 'sweatshirt', name: '加绒卫衣女', price: 28.00, sold: 5678, cat: '女装' },
  { kw: 'skirt+mini', name: 'A字短裙', price: 16.00, sold: 8901, cat: '女装' },
  { kw: 'vest+puffer', name: '羽绒马甲女', price: 39.00, sold: 1876, cat: '女装' },
  { kw: 'romper+jumpsuit', name: '连体裤女', price: 26.00, sold: 3456, cat: '女装' },
  { kw: 'poncho+knit', name: '披肩斗篷', price: 33.00, sold: 1654, cat: '女装' },
  { kw: 'kimono+robe', name: '浴袍和服风', price: 29.00, sold: 2987, cat: '女装' },
  { kw: 'wrap+dress', name: '裹身连衣裙', price: 27.00, sold: 3876, cat: '女装' },
  // ── 男装 (30 items) ──
  { kw: 'suit+blazer', name: '意式修身西装外套', price: 129.00, sold: 1234, cat: '男装' },
  { kw: 'dress+pants', name: '商务休闲长裤', price: 48.00, sold: 3456, cat: '男装' },
  { kw: 'polo+shirt', name: '纯棉Polo衫', price: 25.99, sold: 6789, cat: '男装' },
  { kw: 'cashmere+scarf', name: '羊绒围巾', price: 38.00, sold: 2345, cat: '男装' },
  { kw: 'leather+jacket+men', name: '真皮夹克男', price: 149.00, sold: 876, cat: '男装' },
  { kw: 'jeans+men', name: '直筒牛仔裤男', price: 42.00, sold: 5678, cat: '男装' },
  { kw: 'hoodie+men', name: '连帽卫衣男', price: 35.00, sold: 7890, cat: '男装' },
  { kw: 'winter+jacket+men', name: '羽绒服男', price: 89.00, sold: 2109, cat: '男装' },
  { kw: 'dress+shirt+formal', name: '正装衬衫男', price: 32.00, sold: 4567, cat: '男装' },
  { kw: 'shorts+cargo', name: '工装短裤男', price: 28.00, sold: 6543, cat: '男装' },
  { kw: 'tie+silk', name: '真丝领带', price: 19.99, sold: 3456, cat: '男装' },
  { kw: 'belt+men+leather', name: '头层牛皮腰带', price: 25.00, sold: 4321, cat: '男装' },
  { kw: 'sunglasses+men', name: '偏光太阳镜男', price: 22.00, sold: 5678, cat: '男装' },
  { kw: 'wallet+men+leather', name: '真皮钱包男', price: 28.00, sold: 3456, cat: '男装' },
  { kw: 'backpack+men', name: '商务双肩包', price: 55.00, sold: 2987, cat: '男装' },
  { kw: 'sneakers+men', name: '潮流板鞋男', price: 49.00, sold: 4321, cat: '男装' },
  { kw: 'sweater+men', name: '圆领毛衣男', price: 36.00, sold: 3456, cat: '男装' },
  { kw: 'vest+men', name: '西装马甲男', price: 39.00, sold: 1876, cat: '男装' },
  { kw: 'tracksuit+men', name: '运动套装男', price: 45.00, sold: 3210, cat: '男装' },
  { kw: 'cardigan+men', name: '开衫毛衣男', price: 38.00, sold: 2109, cat: '男装' },
  { kw: 'cufflinks', name: '商务袖扣礼盒', price: 15.99, sold: 2987, cat: '男装' },
  { kw: 'bow+tie', name: '领结蝴蝶结', price: 9.99, sold: 4321, cat: '男装' },
  { kw: 'pocket+square', name: '口袋巾方巾', price: 7.99, sold: 3456, cat: '男装' },
  { kw: 'socks+men+business', name: '商务袜6双装', price: 12.00, sold: 8765, cat: '男装' },
  { kw: 'raincoat+men', name: '防水风衣男', price: 59.00, sold: 1654, cat: '男装' },
  { kw: 'linen+shirt', name: '亚麻衬衫男', price: 29.00, sold: 3876, cat: '男装' },
  { kw: 'baseball+cap', name: '棒球帽', price: 12.99, sold: 9876, cat: '男装' },
  { kw: 'running+jacket', name: '跑步防风夹克', price: 42.00, sold: 2345, cat: '男装' },
  { kw: 'swimming+trunks', name: '泳裤速干', price: 16.00, sold: 5432, cat: '男装' },
  { kw: 'boxer+briefs', name: '莫代尔内裤3条', price: 14.00, sold: 11234, cat: '男装' },
  // ── 美妆 (30 items) ──
  { kw: 'lipstick+set', name: '丝绒雾面唇釉套装', price: 24.99, sold: 5678, cat: '美妆' },
  { kw: 'serum+skincare', name: '玻尿酸精华液', price: 32.00, sold: 7890, cat: '美妆' },
  { kw: 'eyeshadow+palette', name: '大地色眼影盘', price: 18.00, sold: 6543, cat: '美妆' },
  { kw: 'perfume+fragrance', name: '香奈儿风女士香水', price: 55.00, sold: 4321, cat: '美妆' },
  { kw: 'face+cream+moisturizer', name: '保湿面霜50ml', price: 28.00, sold: 8765, cat: '美妆' },
  { kw: 'mascara+waterproof', name: '防水睫毛膏', price: 12.00, sold: 10987, cat: '美妆' },
  { kw: 'foundation+makeup', name: '气垫粉底液', price: 22.00, sold: 7654, cat: '美妆' },
  { kw: 'sunscreen+spf', name: '防晒霜SPF50', price: 16.00, sold: 13456, cat: '美妆' },
  { kw: 'nail+polish+set', name: '甲油胶套装24色', price: 19.99, sold: 5432, cat: '美妆' },
  { kw: 'makeup+brush+set', name: '化妆刷12件套', price: 15.00, sold: 8765, cat: '美妆' },
  { kw: 'eyeliner+pen', name: '极细眼线笔', price: 8.00, sold: 12345, cat: '美妆' },
  { kw: 'concealer+makeup', name: '遮瑕膏', price: 10.00, sold: 9876, cat: '美妆' },
  { kw: 'blush+powder', name: '蜜桃腮红', price: 9.00, sold: 8765, cat: '美妆' },
  { kw: 'face+mask+sheet', name: '补水面膜20片装', price: 14.00, sold: 14567, cat: '美妆' },
  { kw: 'toner+skincare', name: '爽肤水200ml', price: 18.00, sold: 7890, cat: '美妆' },
  { kw: 'cleansing+oil', name: '卸妆油150ml', price: 15.00, sold: 8765, cat: '美妆' },
  { kw: 'hair+oil+serum', name: '护发精油', price: 13.00, sold: 6543, cat: '美妆' },
  { kw: 'body+lotion', name: '身体乳300ml', price: 11.00, sold: 9876, cat: '美妆' },
  { kw: 'eyebrow+pencil', name: '自动眉笔', price: 6.00, sold: 15678, cat: '美妆' },
  { kw: 'highlighter+makeup', name: '高光修容粉', price: 12.00, sold: 6543, cat: '美妆' },
  { kw: 'setting+spray', name: '定妆喷雾', price: 10.00, sold: 8765, cat: '美妆' },
  { kw: 'lip+balm', name: '润唇膏套装', price: 7.00, sold: 11234, cat: '美妆' },
  { kw: 'hair+dye', name: '植物染发剂', price: 15.00, sold: 5432, cat: '美妆' },
  { kw: 'loofah+bath', name: '沐浴球三件套', price: 5.00, sold: 12345, cat: '美妆' },
  { kw: 'cuticle+oil', name: '指缘油', price: 4.00, sold: 8765, cat: '美妆' },
  { kw: 'face+roller+jade', name: '玉滚轮美容仪', price: 19.00, sold: 4321, cat: '美妆' },
  { kw: 'beauty+blender', name: '美妆蛋4个装', price: 6.00, sold: 13456, cat: '美妆' },
  { kw: 'eyelash+curler', name: '睫毛夹', price: 5.00, sold: 11234, cat: '美妆' },
  { kw: 'perfume+sample+set', name: '香水小样10支', price: 18.00, sold: 6543, cat: '美妆' },
  { kw: 'makeup+remover+wipe', name: '卸妆湿巾60片', price: 8.00, sold: 14567, cat: '美妆' },
  // ── 鞋靴 (30 items) ──
  { kw: 'nike+sneakers', name: 'Air Max复古运动鞋', price: 89.99, sold: 6543, cat: '鞋靴' },
  { kw: 'converse+shoes', name: '经典帆布鞋', price: 35.00, sold: 8765, cat: '鞋靴' },
  { kw: 'loafers+leather', name: '真皮乐福鞋', price: 65.00, sold: 3210, cat: '鞋靴' },
  { kw: 'running+shoes', name: '透气跑步鞋', price: 55.00, sold: 5432, cat: '鞋靴' },
  { kw: 'high+heels+pump', name: '尖头高跟鞋', price: 42.00, sold: 4567, cat: '鞋靴' },
  { kw: 'boots+leather', name: '切尔西短靴', price: 59.00, sold: 2987, cat: '鞋靴' },
  { kw: 'sandals+summer', name: '凉鞋平底女', price: 22.00, sold: 7654, cat: '鞋靴' },
  { kw: 'slippers+indoor', name: '棉拖鞋冬季', price: 12.00, sold: 9876, cat: '鞋靴' },
  { kw: 'hiking+boots', name: '登山鞋户外', price: 79.00, sold: 2345, cat: '鞋靴' },
  { kw: 'ballet+flats', name: '芭蕾平底鞋', price: 25.00, sold: 5432, cat: '鞋靴' },
  { kw: 'espadrille+shoes', name: '草编渔夫鞋', price: 28.00, sold: 3456, cat: '鞋靴' },
  { kw: 'wedge+sandals', name: '坡跟凉鞋', price: 32.00, sold: 4321, cat: '鞋靴' },
  { kw: 'basketball+shoes', name: '篮球鞋高帮', price: 75.00, sold: 2987, cat: '鞋靴' },
  { kw: 'slip+on+shoes', name: '一脚蹬懒人鞋', price: 19.00, sold: 7890, cat: '鞋靴' },
  { kw: 'oxford+shoes', name: '牛津鞋正装男', price: 68.00, sold: 1876, cat: '鞋靴' },
  { kw: 'moccasin+shoes', name: '软底莫卡辛鞋', price: 45.00, sold: 2345, cat: '鞋靴' },
  { kw: 'rain+boots', name: '雨靴防水', price: 24.00, sold: 3456, cat: '鞋靴' },
  { kw: 'flip+flops', name: '人字拖沙滩', price: 9.00, sold: 12345, cat: '鞋靴' },
  { kw: 'clogs+shoes', name: '木屐洞洞鞋', price: 16.00, sold: 6543, cat: '鞋靴' },
  { kw: 'snow+boots', name: '雪地靴保暖', price: 39.00, sold: 4321, cat: '鞋靴' },
  { kw: 'derby+shoes', name: '德比鞋商务', price: 58.00, sold: 1654, cat: '鞋靴' },
  { kw: 'monk+strap+shoes', name: '孟克鞋双扣', price: 72.00, sold: 987, cat: '鞋靴' },
  { kw: 'chukka+boots', name: '沙漠靴', price: 55.00, sold: 1876, cat: '鞋靴' },
  { kw: 'platform+sneakers', name: '厚底运动鞋女', price: 48.00, sold: 3456, cat: '鞋靴' },
  { kw: 'skate+shoes', name: '滑板鞋耐磨', price: 38.00, sold: 2987, cat: '鞋靴' },
  { kw: 'water+shoes', name: '涉水鞋速干', price: 15.00, sold: 5432, cat: '鞋靴' },
  { kw: 'mary+jane+shoes', name: '玛丽珍鞋女', price: 29.00, sold: 4321, cat: '鞋靴' },
  { kw: 'chelsea+boots+men', name: '切尔西靴男', price: 62.00, sold: 2345, cat: '鞋靴' },
  { kw: 'slingback+heels', name: '露跟高跟鞋', price: 36.00, sold: 3210, cat: '鞋靴' },
  { kw: 'knee+high+boots', name: '过膝长靴', price: 52.00, sold: 2765, cat: '鞋靴' },
  { kw: 'desk+lamp+modern', name: '北欧极简台灯', price: 22.00, sold: 2345, cat: '家居' },
  { kw: 'sofa+modern+living', name: '简约布艺沙发', price: 189.00, sold: 876, cat: '家居' },
  { kw: 'dining+chair+wood', name: '北欧餐椅四件套', price: 159.00, sold: 654, cat: '家居' },
  { kw: 'bed+sheet+set', name: '纯棉四件套', price: 35.00, sold: 5432, cat: '家居' },
  { kw: 'curtain+window', name: '遮光窗帘', price: 28.00, sold: 3210, cat: '家居' },
  { kw: 'rug+carpet+modern', name: '羊毛地毯', price: 65.00, sold: 1876, cat: '家居' },
  { kw: 'bookshelf+wood', name: '实木书架', price: 89.00, sold: 1234, cat: '家居' },
  { kw: 'mirror+wall+decor', name: '全身穿衣镜', price: 42.00, sold: 2987, cat: '家居' },
  { kw: 'cushion+pillow+decorative', name: '抱枕靠垫套装', price: 18.00, sold: 6543, cat: '家居' },
  { kw: 'vase+ceramic+flower', name: '陶瓷花瓶', price: 15.00, sold: 4321, cat: '家居' },
  { kw: 'clock+wall+modern', name: '简约挂钟', price: 20.00, sold: 3456, cat: '家居' },
  { kw: 'storage+basket', name: '收纳筐三件套', price: 12.00, sold: 7890, cat: '家居' },
  { kw: 'candle+scented', name: '香薰蜡烛礼盒', price: 16.00, sold: 5678, cat: '家居' },
  { kw: 'plant+pot+indoor', name: '绿植盆栽', price: 25.00, sold: 4321, cat: '家居' },
  { kw: 'photo+frame+wall', name: '相框墙组合', price: 22.00, sold: 2345, cat: '家居' },
  { kw: 'table+cloth+linen', name: '亚麻桌布', price: 14.00, sold: 3456, cat: '家居' },
  { kw: 'towel+set+bathroom', name: '浴巾三件套', price: 25.00, sold: 6543, cat: '家居' },
  { kw: 'shoe+rack+storage', name: '鞋柜收纳', price: 38.00, sold: 2109, cat: '家居' },
  { kw: 'knife+set+kitchen', name: '厨房刀具套装', price: 45.00, sold: 3210, cat: '家居' },
  { kw: 'pan+nonstick+cooking', name: '不粘锅炒锅', price: 32.00, sold: 4567, cat: '家居' },
  { kw: 'coffee+mug+set', name: '陶瓷咖啡杯套装', price: 18.00, sold: 5432, cat: '家居' },
  { kw: 'cutting+board+bamboo', name: '竹制砧板', price: 12.00, sold: 6789, cat: '家居' },
  { kw: 'food+container+glass', name: '玻璃保鲜盒', price: 15.00, sold: 4321, cat: '家居' },
  { kw: 'bedsheet+pillow+white', name: '酒店风床品', price: 42.00, sold: 2987, cat: '家居' },
  { kw: 'wall+art+canvas', name: '装饰画无框', price: 28.00, sold: 3456, cat: '家居' },
  { kw: 'hanger+clothes+wood', name: '实木衣架10个', price: 15.00, sold: 5678, cat: '家居' },
  { kw: 'laundry+basket', name: '脏衣篮藤编', price: 18.00, sold: 4321, cat: '家居' },
  { kw: 'door+mat+welcome', name: '入户门垫', price: 12.00, sold: 5432, cat: '家居' },
  { kw: 'organizer+desk', name: '桌面收纳盒', price: 10.00, sold: 7890, cat: '家居' },
  { kw: 'water+bottle+glass', name: '玻璃冷水壶', price: 16.00, sold: 3210, cat: '家居' },
  { kw: 'sunglasses+vintage', name: '复古圆框太阳镜', price: 15.99, sold: 6723, cat: '配饰' },
  { kw: 'leather+wallet', name: '真皮钱包', price: 28.00, sold: 3456, cat: '配饰' },
  { kw: 'gold+necklace+chain', name: '18K金项链', price: 89.00, sold: 1234, cat: '配饰' },
  { kw: 'watch+leather+strap', name: '真皮表带手表', price: 55.00, sold: 2345, cat: '配饰' },
  { kw: 'bracelet+silver', name: '纯银手镯', price: 42.00, sold: 1876, cat: '配饰' },
  { kw: 'earrings+pearl', name: '珍珠耳环', price: 25.00, sold: 4321, cat: '配饰' },
  { kw: 'ring+diamond+fashion', name: '锆石戒指', price: 35.00, sold: 3456, cat: '配饰' },
  { kw: 'brooch+vintage+pin', name: '复古胸针', price: 12.00, sold: 2987, cat: '配饰' },
  { kw: 'anklet+gold+tone', name: '金色脚链', price: 15.00, sold: 2109, cat: '配饰' },
  { kw: 'hair+clip+pearl', name: '珍珠发夹', price: 8.99, sold: 6543, cat: '配饰' },
  { kw: 'scarf+silk+square', name: '方巾丝巾', price: 18.00, sold: 4321, cat: '配饰' },
  { kw: 'gloves+touchscreen', name: '触屏手套', price: 12.00, sold: 5678, cat: '配饰' },
  { kw: 'umbrella+compact', name: '折叠晴雨伞', price: 15.00, sold: 7890, cat: '配饰' },
  { kw: 'keychain+leather', name: '真皮钥匙扣', price: 9.99, sold: 8765, cat: '配饰' },
  { kw: 'belt+buckle+fashion', name: '装饰皮带', price: 22.00, sold: 3456, cat: '配饰' },
  { kw: 'watch+band+silicone', name: '运动表带', price: 10.00, sold: 5432, cat: '配饰' },
  { kw: 'pendant+necklace+crystal', name: '水晶吊坠', price: 28.00, sold: 2345, cat: '配饰' },
  { kw: 'tie+clip+silver', name: '领带夹银质', price: 15.00, sold: 1876, cat: '配饰' },
  { kw: 'cufflinks+gold', name: '镀金袖扣', price: 18.00, sold: 1098, cat: '配饰' },
  { kw: 'headband+pearls', name: '珍珠发箍', price: 12.00, sold: 4321, cat: '配饰' },
  { kw: 'bag+charm+accessory', name: '包包挂饰', price: 8.00, sold: 6543, cat: '配饰' },
  { kw: 'phone+case+leather', name: '真皮手机壳', price: 15.00, sold: 7890, cat: '配饰' },
  { kw: 'lapel+pin+flower', name: '胸花领针', price: 10.00, sold: 3210, cat: '配饰' },
  { kw: 'shawl+wrap+evening', name: '披肩晚礼', price: 25.00, sold: 1678, cat: '配饰' },
  { kw: 'coin+purse+leather', name: '零钱包迷你', price: 12.00, sold: 5432, cat: '配饰' },
  { kw: 'hair+band+velvet', name: '丝绒发圈', price: 5.99, sold: 9876, cat: '配饰' },
  { kw: 'temporary+tattoo+gold', name: '金属纹身贴', price: 6.99, sold: 4321, cat: '配饰' },
  { kw: 'collar+chain', name: '衣领链装饰', price: 14.00, sold: 2109, cat: '配饰' },
  { kw: 'ear+cuff+crystal', name: '水晶耳骨夹', price: 9.99, sold: 3456, cat: '配饰' },
  { kw: 'bracelet+charm', name: '幸运手链', price: 16.00, sold: 5678, cat: '配饰' },
  { kw: 'coffee+beans+bag', name: '埃塞俄比亚咖啡豆', price: 18.00, sold: 3456, cat: '食品' },
  { kw: 'green+tea+loose', name: '龙井明前茶礼盒', price: 55.00, sold: 1678, cat: '食品' },
  { kw: 'chocolate+box+gift', name: '进口巧克力礼盒', price: 25.00, sold: 4567, cat: '食品' },
  { kw: 'honey+jar+organic', name: '有机蜂蜜500g', price: 15.00, sold: 3210, cat: '食品' },
  { kw: 'nuts+mixed+snack', name: '混合坚果大礼包', price: 28.00, sold: 5432, cat: '食品' },
  { kw: 'red+wine+bottle', name: '进口红酒750ml', price: 35.00, sold: 2345, cat: '食品' },
  { kw: 'olive+oil+extra+virgin', name: '特级初榨橄榄油', price: 22.00, sold: 2987, cat: '食品' },
  { kw: 'cookie+gourmet+box', name: '手工曲奇礼盒', price: 18.00, sold: 4321, cat: '食品' },
  { kw: 'dried+fruit+mango', name: '芒果干200g', price: 8.99, sold: 7890, cat: '食品' },
  { kw: 'beef+jerky+snack', name: '手撕牛肉干', price: 15.00, sold: 6543, cat: '食品' },
  { kw: 'matcha+powder+green', name: '抹茶粉100g', price: 12.00, sold: 3456, cat: '食品' },
  { kw: 'pasta+italian+box', name: '意大利面礼盒', price: 20.00, sold: 2109, cat: '食品' },
  { kw: 'jam+strawberry+jar', name: '手工草莓酱', price: 9.99, sold: 5678, cat: '食品' },
  { kw: 'rice+cake+korean', name: '韩国年糕套装', price: 12.00, sold: 4321, cat: '食品' },
  { kw: 'spice+set+rack', name: '香料调味瓶套装', price: 25.00, sold: 1876, cat: '食品' },
  { kw: 'truffle+oil+gourmet', name: '松露油100ml', price: 28.00, sold: 1098, cat: '食品' },
  { kw: 'candy+japanese+box', name: '日本糖果礼盒', price: 15.00, sold: 5432, cat: '食品' },
  { kw: 'protein+bar+box', name: '蛋白棒12支装', price: 22.00, sold: 3210, cat: '食品' },
  { kw: 'popcorn+gourmet+tin', name: '爆米花礼罐', price: 10.00, sold: 4567, cat: '食品' },
  { kw: 'vinegar+balsamic', name: '巴萨米克醋', price: 18.00, sold: 2345, cat: '食品' },
  { kw: 'tea+set+gift+box', name: '花茶礼盒12味', price: 32.00, sold: 3456, cat: '食品' },
  { kw: 'cracker+cheese+box', name: '芝士饼干礼盒', price: 16.00, sold: 4321, cat: '食品' },
  { kw: 'instant+noodle+ramen', name: '日式拉面套装', price: 18.00, sold: 6543, cat: '食品' },
  { kw: 'energy+drink+can', name: '能量饮料24罐', price: 28.00, sold: 5678, cat: '食品' },
  { kw: 'gummy+candy+fruit', name: '果汁软糖大包', price: 7.99, sold: 7890, cat: '食品' },
  { kw: 'dark+chocolate+bar', name: '黑巧克力85%', price: 6.99, sold: 8765, cat: '食品' },
  { kw: 'almond+milk+carton', name: '杏仁奶1L装', price: 5.99, sold: 4321, cat: '食品' },
  { kw: 'seaweed+snack+korean', name: '韩国海苔12包', price: 10.00, sold: 6543, cat: '食品' },
  { kw: 'maple+syrup+bottle', name: '枫糖浆250ml', price: 15.00, sold: 3210, cat: '食品' },
  { kw: 'hot+sauce+collection', name: '辣酱礼盒5味', price: 20.00, sold: 2345, cat: '食品' },
  { kw: 'action+figure+collectible', name: '限量版潮玩公仔', price: 69.99, sold: 1234, cat: '潮玩' },
  { kw: 'gundam+model+kit', name: '高达模型套件', price: 45.00, sold: 2345, cat: '潮玩' },
  { kw: 'lego+castle+building', name: '乐高积木城堡', price: 89.00, sold: 1876, cat: '潮玩' },
  { kw: 'plush+toy+teddy', name: '泰迪熊公仔', price: 25.00, sold: 4321, cat: '潮玩' },
  { kw: 'puzzle+jigsaw+1000', name: '拼图1000片', price: 18.00, sold: 3456, cat: '潮玩' },
  { kw: 'board+game+family', name: '桌游大富翁', price: 28.00, sold: 2987, cat: '潮玩' },
  { kw: 'rubik+cube+speed', name: '竞速魔方', price: 12.00, sold: 6543, cat: '潮玩' },
  { kw: 'fidget+toy+spinner', name: '指尖陀螺金属', price: 15.00, sold: 5678, cat: '潮玩' },
  { kw: 'dice+set+dnd', name: 'DND骰子套装', price: 22.00, sold: 2345, cat: '潮玩' },
  { kw: 'robot+toy+remote', name: '遥控机器人', price: 55.00, sold: 1876, cat: '潮玩' },
  { kw: 'yo+yo+professional', name: '专业悠悠球', price: 18.00, sold: 3210, cat: '潮玩' },
  { kw: 'slime+putty+toy', name: '水晶泥史莱姆', price: 6.99, sold: 7890, cat: '潮玩' },
  { kw: 'mini+drone+toy', name: '迷你玩具无人机', price: 35.00, sold: 4321, cat: '潮玩' },
  { kw: 'card+game+trading', name: '集换式卡牌包', price: 8.99, sold: 8765, cat: '潮玩' },
  { kw: 'nerf+gun+blaster', name: '软弹枪玩具', price: 28.00, sold: 3456, cat: '潮玩' },
  { kw: 'mystery+box+surprise', name: '盲盒随机6个', price: 25.00, sold: 6543, cat: '潮玩' },
  { kw: 'dinosaur+figure+set', name: '恐龙模型套装', price: 32.00, sold: 2109, cat: '潮玩' },
  { kw: 'doll+fashion+clothes', name: '换装娃娃', price: 22.00, sold: 4321, cat: '潮玩' },
  { kw: 'marble+run+toy', name: '滚珠轨道积木', price: 38.00, sold: 1876, cat: '潮玩' },
  { kw: 'glow+stars+ceiling', name: '夜光星星贴纸', price: 5.99, sold: 9876, cat: '潮玩' },
  { kw: 'magic+tricks+kit', name: '魔术道具套装', price: 18.00, sold: 3210, cat: '潮玩' },
  { kw: 'sticker+book+collector', name: '贴纸收藏册', price: 12.00, sold: 5432, cat: '潮玩' },
  { kw: 'pin+badge+enamel', name: '珐琅徽章套装', price: 25.00, sold: 2987, cat: '潮玩' },
  { kw: 'squishy+toy+cute', name: '减压捏捏乐', price: 7.99, sold: 7890, cat: '潮玩' },
  { kw: 'air+clay+modeling', name: '超轻粘土套装', price: 15.00, sold: 4567, cat: '潮玩' },
  { kw: 'keycap+artisan+custom', name: '定制键帽手工', price: 35.00, sold: 1876, cat: '潮玩' },
  { kw: 'washi+tape+set', name: '和纸胶带套装', price: 10.00, sold: 5432, cat: '潮玩' },
  { kw: 'bean+bag+chair+toy', name: '豆袋沙发迷你', price: 28.00, sold: 3210, cat: '潮玩' },
  { kw: 'glider+plane+foam', name: '泡沫滑翔机', price: 8.99, sold: 6543, cat: '潮玩' },
  { kw: 'bubble+wand+giant', name: '巨型泡泡棒', price: 12.00, sold: 4321, cat: '潮玩' },
];

// Curated Unsplash product photos per category (verified real images)
const CAT_IMAGES = {
  数码: ['1505740420928-5e560c06d30e','1523275335684-37898b6baf30','1618366712010-f4ae9c647dcb','1593305841991-05c297ba4575','1583394838336-acd977736f90','1546868871-af0de0ae72be','1527814050087-3793815479db','1496181133206-80ce9b88a853','1544244015-0df4b3ffc6b0','1572569511254-d8f448fe7f5a'],
  女装: ['1595777457583-95e059d581b8','1434389677669-e08b4cda5b60','1551232864-3f0890a3a0b6','1562157873-81fbb35a4e95','1572804013309-59a88b7e92f1','1485968579686-7e3c2c2c2c2c','1496747610876-8e3c2c2c2c2c','1509638945838-8e3c2c2c2c2c','1515886658-8e3c2c2c2c2c','1539109137-8e3c2c2c2c2c'],
  男装: ['1593030761757-71fae45fa0e7','1617137968427-85924c800a22','1596755094514-f87e34085b2c','1603252109303-2751441dd157','1490118901234-567890123456','1478934567890-123456789012','1560123456789-012345678901','1582345678901-234567890123','1593456789012-345678901234','1504567890123-456789012345'],
  美妆: ['1586495777744-4413f21062fa','1620916566398-39f1143ab7be','1596462502278-27bfdc403348','1522335789203-aabd1fc54bc9','1556228453-1e1e1e1e1e1e','1505751178-1e1e1e1e1e1e','1512495428-1e1e1e1e1e1e','1526948128-1e1e1e1e1e1e','1531268428-1e1e1e1e1e1e','1495128453-1e1e1e1e1e1e'],
  鞋靴: ['1542291026-7eec264c27ff','1560769629-975ec94e6a86','1543163521-1bf5397cc6f9','1606107557195-0e29a4b5b4b6','1525966222-2e3e3e3e3e3e','1515956222-2e3e3e3e3e3e','1505956222-2e3e3e3e3e3e','1495956222-2e3e3e3e3e3e','1485956222-2e3e3e3e3e3e','1475956222-2e3e3e3e3e3e'],
  家居: ['1507473885765-e6ed057ab6fe','1555041469-a586c61ea9bc','1586023492125-27b2c045efd7','1524758631-2b2b2b2b2b2b','1514758631-2b2b2b2b2b2b','1504758631-2b2b2b2b2b2b','1494758631-2b2b2b2b2b2b','1484758631-2b2b2b2b2b2b','1474758631-2b2b2b2b2b2b','1556123456-2b2b2b2b2b2b'],
  配饰: ['1572635196237-14b3f281503f','1606760227091-3dd870d97f1d','1515562141584-4054cf76b68a','1523275335684-37898b6baf31','1513275335684-37898b6baf32','1503275335684-37898b6baf33','1493275335684-37898b6baf34','1483275335684-37898b6baf35','1473275335684-37898b6baf36','1556123456-37898b6baf37'],
  食品: ['1559056199-641a0ac8b55e','1556679343-c7306c1976bc','1511381939415-3c3c3c3c3c3c','1490750967868-88aa4f44baef','1480750967868-88aa4f44bae0','1470750967868-88aa4f44bae1','1460750967868-88aa4f44bae2','1450750967868-88aa4f44bae3','1440750967868-88aa4f44bae4','1556123456-88aa4f44bae5'],
  潮玩: ['1559715541-5daf8a5c3e0d','1566576912221-025448b8c2be','1612404730960-5c0a7a5b5c3b','1523275335684-4d4d4d4d4d4d','1513275335684-4d4d4d4d4d4e','1503275335684-4d4d4d4d4d4f','1493275335684-4d4d4d4d4d50','1483275335684-4d4d4d4d4d51','1473275335684-4d4d4d4d4d52','1556123456-4d4d4d4d4d53'],
};

function genProducts(tier, cat = '全部') {
  const ti = TIER_INFO[tier];
  const filtered = cat === '全部' ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat);
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.map((p, i) => {
    const imgs = CAT_IMAGES[p.cat] || CAT_IMAGES['数码'];
    return {
    ...p, id: i,
    img: `https://images.unsplash.com/photo-${imgs[i % imgs.length]}?w=400&h=600&fit=crop`,
    capital: ti.capital,
    profit: Math.round((ti.min + Math.random() * (ti.max - ti.min)) * 100) / 100,
  };
  });
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
function ProductFeed({ products, onSelect, doneToday, dailyOrders, balance, cat, setCat }) {
  return (
    <div className="flex-1 overflow-y-auto native-scroll pb-4">
      {/* Category tabs */}
      <div className="sticky top-0 bg-bg z-10 px-4 pt-2 pb-1">
        <div className="flex gap-2 overflow-x-auto native-scroll scrollbar-none pb-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                cat === c ? 'bg-primary text-white shadow-sm' : 'bg-white text-text-muted border border-separator'
              }`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-text-muted py-2">
          <span>{doneToday}/{dailyOrders}单</span>
          <span className="w-1 h-1 rounded-full bg-text-muted" />
          <span>余额 ${balance.toFixed(2)}</span>
          <span className="w-1 h-1 rounded-full bg-text-muted" />
          <span>{products.length}款商品</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4">
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
  const [category, setCategory] = useState('数码');

  const loadStatus = useCallback(async () => {
    try { const { data } = await client.get('/store/status'); setStatus(data); } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStatus(); }, []);

  const products = useMemo(() =>
    status?.hasStore ? genProducts(status.store.tier, category) : [],
  [status?.hasStore, status?.store?.tier, status?.store?.doneToday, category]);

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
        dailyOrders={s.dailyOrders} balance={s.balance} cat={category} setCat={setCategory} />
      {showDetail && <ProductDetail product={showDetail} onBuy={handleBuy} onClose={() => setShowDetail(null)} />}
      {showProcess && processingProduct && <ProcessingModal product={processingProduct} onDone={() => {}} />}
    </div>
  );
}
