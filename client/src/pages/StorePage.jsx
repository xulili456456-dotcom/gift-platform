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
  { img:'/products/14.jpg', name:'Lenovo Chromebook 14" WUXGA IPS - MediaTek Kompanio 540, 8GB RAM, 64GB UFS, ChromeOS', price:428.00, sold:15, cat:'数码', rating:4.4, reviews:9, specs:{'屏幕':'14" WUXGA IPS','处理器':'MediaTek Kompanio 540','内存':'8GB RAM','存储':'64GB UFS','系统':'Chrome OS','AI':'Google Gemini','音频':'Waves MaxxAudio'}, desc:'Lenovo 2026款Chromebook。14寸WUXGA IPS高清屏，MediaTek Kompanio处理器。内置Google Gemini AI助手，Waves MaxxAudio音效。Cosmic Blue配色。' },
  { img:'/products/15.jpg', name:'Uniden SDS150 Digital Radio Scanner SDR Technology with Built-in GPS', price:949.99, sold:210, cat:'数码', rating:4.2, reviews:45, specs:{'技术':'SDR软件定义无线电','接收':'AM/NFM/FM/WFM/FMB','连接':'Bluetooth','定位':'内置GPS','功能':'气象警报','尺寸':'2.25x2x6.1英寸'}, desc:'Uniden SDS150旗舰数字扫描仪。SDR软件定义无线电技术，卓越的同步广播和弱信号接收性能。内置GPS，蓝牙连接。气象警报功能。' },
  { img:'/products/16.jpg', name:'Lenovo IdeaPad Slim 3i 15.6" FHD - Core i3-N305, 8GB RAM, 128GB UFS, Windows 11 S', price:393.00, sold:8, cat:'数码', rating:5.0, reviews:1, specs:{'屏幕':'15.6" FHD','处理器':'Intel Core i3-N305','内存':'8GB LPDDR5','存储':'128GB UFS','显卡':'Intel UHD','系统':'Windows 11 S','网络':'WiFi 6'}, desc:'Lenovo IdeaPad Slim 3i轻薄笔记本。15.6寸FHD屏，Core i3-N305处理器，8GB内存。Windows 11 S系统，WiFi 6。Arctic Gray配色。' },
  { img:'/products/17.jpg', name:'Vitamix Ascent X4 Gourmet SmartPrep Kitchen System - Professional Blender + 12-Cup Food Processor', price:899.95, sold:55, cat:'家居', rating:4.5, reviews:236, specs:{'容量':'48oz搅拌杯 + 12杯处理器','刀片':'不锈钢','附件':'4个切割盘','功能':'自检测技术','颜色':'White'}, desc:'Vitamix Ascent X4专业级厨房系统。智能搅拌机+12杯食物处理器。不锈钢刀片，4种切割盘。SELF-DETECT自动识别容器。' },
  { img:'/products/18.jpg', name:'Uniden R4W Extreme Long-Range Laser/Radar Detector with Wi-Fi, GPS, Bluetooth, Voice Alerts', price:422.99, sold:1200, cat:'数码', rating:4.6, reviews:198, specs:{'探测':'360°激光/雷达','定位':'内置GPS','连接':'WiFi/Bluetooth','警报':'语音+红绿灯+测速','屏幕':'OLED','App':'R/TACH'}, desc:'Uniden R4W旗舰雷达探测器。超远距离探测，360°全方位感知。内置GPS，WiFi/蓝牙连接。语音警报，红绿灯和测速摄像头提醒。' },
  { img:'/products/19.jpg', name:'Uniden R7 Extreme Long-Range Radar Detector - Dual Antennas, GPS, Directional Arrows, Voice Alerts', price:549.99, sold:1200, cat:'数码', rating:4.6, reviews:4186, specs:{'天线':'双天线前后','定位':'GPS实时警报','显示':'OLED','箭头':'方向指示','警报':'红绿灯+测速'}, desc:'Uniden R7旗舰雷达探测器。双天线前后探测，方向箭头指示。GPS实时警报，语音提醒。红绿灯和测速摄像头数据库。' },
  { img:'/products/20.jpg', name:'Uniden R8W Extreme Long Range Radar Detector - 360°, Directional Arrows, Wi-Fi, GPS, Bluetooth', price:799.99, sold:1100, cat:'数码', rating:4.3, reviews:419, specs:{'探测':'360°超远距离','天线':'方向箭头','连接':'WiFi/Bluetooth','定位':'GPS','警报':'语音+红绿灯+测速','屏幕':'OLED','App':'R/TACH'}, desc:'Uniden R8W最新旗舰。360°全方位超远距离探测，方向箭头指示。WiFi/蓝牙连接，GPS定位。R/TACH App远程控制。' },
  { img:'/products/21.jpg', name:'All-Clad D5 Stainless Steel 10-Piece Cookware Set - Made in USA, Induction Compatible', price:999.95, sold:210, cat:'家居', rating:4.6, reviews:1289, specs:{'材质':'D5不锈钢','件数':'10件套','适用':'电磁炉/烤箱','产地':'美国','包含':'煎锅+汤锅+炒锅+汤锅'}, desc:'All-Clad D5不锈钢锅具10件套。5层复合结构均匀导热，美国制造。电磁炉和烤箱兼容，专业厨房品质。' },
  { img:'/products/22.jpg', name:'Uniden SDS200 True I/Q TrunkTracker X Digital Base/Mobile Scanner', price:749.99, sold:120, cat:'数码', rating:4.5, reviews:892, specs:{'技术':'True I/Q TrunkTracker X','连接':'USB','类型':'台式/移动','尺寸':'8.5x12.75x3.75英寸'}, desc:'Uniden SDS200旗舰台式数字扫描仪。True I/Q TrunkTracker X技术，业界最佳数字解码性能。USB连接，适合固定或移动使用。' },
  { img:'/products/23.jpg', name:'DJI Osmo Action 4 - 4K/120fps Waterproof Action Camera, 1/1.3" Sensor, 160min Battery', price:231.00, sold:1900, cat:'数码', rating:4.6, reviews:1802, specs:{'视频':'4K/120fps','传感器':'1/1.3英寸CMOS','防水':'防水','续航':'160分钟','色彩':'10-bit D-Log M'}, desc:'DJI Osmo Action 4运动相机。4K/120fps超清录制，1/1.3英寸大底传感器。低光表现出色，10-bit D-Log M色彩。160分钟超长续航。' },
  { img:'/products/24.jpg', name:'DJI Osmo Action 6 Enhanced Combo - 8K Action Camera, Variable Aperture f/2.0-f/4.0, 2 Batteries', price:478.00, sold:740, cat:'数码', rating:4.5, reviews:725, specs:{'视频':'8K','传感器':'1/1.1英寸方形','光圈':'f/2.0-f/4.0可变','电池':'2块延长续航','屏幕':'2.5英寸'}, desc:'DJI Osmo Action 6增强版。8K超清运动相机，1/1.1英寸方形传感器。f/2.0-f/4.0可变光圈，双电池超长续航。专业户外拍摄利器。' },
  { img:'/products/25.jpg', name:'FOTILE ChefCubii 4-in-1 Combi-Steam Oven 1.1 cu.ft. - Steam-Bake, Air Fry, Convection, Dehydrator', price:664.05, sold:40, cat:'家居', rating:4.0, reviews:35, specs:{'容量':'1.1 cu.ft.','功能':'蒸烤/空气炸/对流/脱水','菜单':'50预设','水箱':'外置可拆卸','温控':'双区独立','颜色':'Beige'}, desc:'FOTILE ChefCubii 4合1蒸烤箱。蒸烤、空气炸、对流、脱水一体，50个预设菜单。双区独立温控，外置水箱。1.1立方英尺大容量。' },
  { img:'/products/26.jpg', name:'Insta360 GO 3S 64GB - 4K Tiny Portable Vlogging Camera, Hands-Free POV, 140min Battery, Waterproof', price:285.00, sold:65, cat:'数码', rating:4.3, reviews:62, specs:{'视频':'4K','存储':'64GB','续航':'140分钟','防水':'10m','屏幕':'2.2英寸','特色':'免提POV/磁吸安装'}, desc:'Insta360 GO 3S微型vlog相机。4K录制，64GB存储。免提POV拍摄，磁吸安装随处可贴。140分钟续航，10米防水。宠物视角神器。' },
  { img:'/products/27.jpg', name:'Robot Coupe R2N CLR Continuous Feed Food Processor 2.9L - 1HP, 120V Commercial Grade', price:1699.00, sold:65, cat:'家居', rating:4.5, reviews:61, specs:{'容量':'2.9L聚碳酸酯碗','功率':'1HP 1000W','电压':'120V','类型':'连续进料','尺寸':'15.75x8.75x19.25英寸'}, desc:'Robot Coupe R2N商用级食物处理器。1HP强劲马达，2.9L大容量碗。连续进料设计，适合餐厅和商用厨房。法国品牌，专业品质。' },
  { img:'/products/28.jpg', name:'Nilight 4" 60W LED Light Bar 2PCS - Flood Spot Combo Work Driving Lamp with Wiring Harness', price:26.99, sold:1300, cat:'数码', rating:4.6, reviews:7602, specs:{'功率':'60W x2','尺寸':'4英寸','类型':'泛光+聚光组合','防水':'IP65','附件':'12ft线束'}, desc:'Nilight 4寸LED工作灯2只装。60W大功率，泛光聚光组合。IP65防水，配12英尺线束。越野、卡车、工作灯多用途。' },
  { img:'/products/29.jpg', name:'XbotGo Chameleon AI Auto Sports Camera - 4K 60FPS Soccer/Basketball Tracking, Live Streaming', price:392.00, sold:930, cat:'数码', rating:4.0, reviews:917, specs:{'视频':'4K 60FPS','AI':'自动跟踪','运动':'足球/篮球','直播':'支持','兼容':'iOS/Android','颜色':'Lava Graphite'}, desc:'XbotGo Chameleon AI运动相机。自动跟踪拍摄，4K 60FPS。专为足球篮球等团队运动设计，支持直播。无需订阅，iOS和Android兼容。' },
  { img:'/products/30.jpg', name:'Nilight 6" Oval Red LED Tail Lights 2PCS - Surface Mount Stop Brake Turn Trailer Lights IP65', price:16.20, sold:2200, cat:'数码', rating:4.7, reviews:6869, specs:{'尺寸':'6英寸椭圆','功能':'刹车/转向/尾灯','防水':'IP65','电压':'12V','功率':'18W','适用':'RV/卡车/拖车/吉普'}, desc:'Nilight 6寸LED尾灯2只装。刹车转向尾灯一体，IP65防水。12V电压，18W功率。适用于房车、卡车、拖车、吉普等。' },
  { img:'/products/31.jpg', name:'GM Genuine Parts 12736813 Starter - OEM Replacement for Chevrolet Buick GMC Cadillac', price:186.00, sold:25, cat:'数码', rating:5.0, reviews:20, specs:{'品牌':'GM Genuine Parts','类型':'起动机','适用':'Chevrolet/Buick/GMC/Cadillac','品质':'OEM原厂替换','保修':'GM质保'}, desc:'GM原厂起动机12736813。专为Chevrolet、Buick、GMC、Cadillac车型设计。OEM精确替换，GM工程师验证和测试。' },
  { img:'/products/32.jpg', name:'Tineco Floor One S9 Artist Steam Wet Dry Vacuum - 320°F HyperSteam, 185°F Flashdry, 22kPa Suction', price:799.00, sold:1200, cat:'家居', rating:4.3, reviews:165, specs:{'蒸汽':'320°F HyperSteam','自清洁':'185°F Flashdry','吸力':'22kPa','续航':'75分钟','转向':'360° SmoothDrive','防缠绕':'Anti-Tangle'}, desc:'Tineco Floor One S9 Artist蒸汽洗地机。320°F高温蒸汽，185°F自清洁烘干。22kPa强劲吸力，360°灵活转向。防缠绕设计，180°平躺清洁。' },
  { img:'/products/33.jpg', name:'Philips Homerun Series 2000 2nd Gen Robot Vacuum & Mop - 6000Pa Suction, LiDAR Navigation, 130min', price:445.00, sold:110, cat:'家居', rating:4.0, reviews:100, specs:{'吸力':'6000Pa','导航':'LiDAR激光','续航':'130分钟','功能':'吸拖一体','地毯':'增压模式','控制':'App远程','颜色':'Arctic White'}, desc:'Philips Homerun 2000二代扫拖机器人。6000Pa大吸力，LiDAR激光导航。吸拖一体，地毯自动增压。130分钟续航，App远程控制。' },
  { img:'/products/34.jpg', name:'Tapo Robot Vacuum RV30Max Plus - 5300Pa, LiDAR Navigation, Auto Empty Station, 150min, Pet Hair', price:289.00, sold:240, cat:'家居', rating:4.3, reviews:231, specs:{'吸力':'5300Pa','导航':'LiDAR+IMU双导航','续航':'150分钟','自动集尘':'支持','越障':'22mm','集尘袋':'3L'}, desc:'Tapo RV30Max Plus扫拖机器人。5300Pa超强吸力，LiDAR+IMU双导航。自动集尘站，3L大容量尘袋。150分钟续航，宠物毛发克星。' },

  { img:'/products/35.jpg', name:'Nilight ZH408 52" Curved Triple Row LED Light Bar 783W 78000LM - Spot Flood Combo with Wiring Kit', price:139.99, sold:1100, cat:'数码', rating:4.6, reviews:7602, specs:{'尺寸':'52英寸弧形','功率':'783W','亮度':'78000LM','防水':'IP67','材质':'铝合金','附件':'12AWG线束+开关'}, desc:'Nilight 52寸弧形LED灯条。783W大功率，78000流明超亮。三排泛光聚光组合，IP67防水。配12AWG重载线束和5Pin翘板开关。' },
  { img:'/products/36.jpg', name:'Astercook Deep-Carbonized Bamboo Cutting Board with Wood Stand - Reversible with Juice Grooves', price:23.72, sold:31000, cat:'家居', rating:4.5, reviews:2199, specs:{'材质':'深碳化竹','尺寸':'15x12x0.6英寸','特色':'双面可用/汁槽/手柄','附件':'木质支架','重量':'4磅','保养':'手洗'}, desc:'Astercook深碳化竹砧板。双面可用，汁槽设计收集液体。配木质收纳支架，易握手柄。环保健康，父亲节礼物首选。30K+好评。' },
  { img:'/products/37.jpg', name:'Fullstar Pro Vegetable Chopper 4-in-1 - Chopper, Spiralizer, Dicer with Container, White', price:23.73, sold:31000, cat:'家居', rating:4.5, reviews:128366, specs:{'功能':'切碎/螺旋/切丁/切片','材质':'BPA Free不锈钢','颜色':'White','清洗':'洗碗机安全','尺寸':'8x3x4.48英寸','刀片':'可更换不锈钢'}, desc:'Fullstar Pro蔬菜切碎机4合1。切碎、螺旋、切丁、切片一体。不锈钢刀片，BPA Free材质。洗碗机安全，30K+好评爆款。' },
  { img:'/products/38.jpg', name:'Samsung Galaxy A36 5G 128GB - 8GB RAM, 6.7" 120Hz Display, Awesome White', price:292.00, sold:15, cat:'数码', rating:4.2, reviews:10, specs:{'屏幕':'6.7" FHD+ 120Hz','内存':'8GB RAM','存储':'128GB','处理器':'2.4GHz','系统':'Android','分辨率':'2400x1080'}, desc:'Samsung Galaxy A36 5G。6.7寸120Hz高刷屏，8GB内存128GB存储。Awesome White配色，5G网络。性价比之选。' },
  { img:'/products/39.jpg', name:'KitchenAid All Purpose Kitchen Shears - Stainless Steel, Soft Grip, Dishwasher Safe, 8.72"', price:7.59, sold:41000, cat:'家居', rating:4.8, reviews:71815, specs:{'材质':'不锈钢','长度':'8.72英寸','手柄':'软胶舒适握持','清洗':'洗碗机安全','附件':'保护套','颜色':'Black'}, desc:'KitchenAid厨房剪刀。不锈钢刀片，软胶舒适手柄。洗碗机安全，配保护套。亚马逊71K+好评，40K+月销爆款。' },
  { img:'/products/40.jpg', name:'Xiaomi Redmi Note 12 4G 128GB - 6.67" 120Hz AMOLED, Snapdragon, Onyx Gray', price:220.00, sold:710, cat:'数码', rating:4.4, reviews:702, specs:{'屏幕':'6.67" AMOLED 120Hz','内存':'6GB RAM','存储':'128GB','处理器':'Snapdragon','系统':'Android 13','分辨率':'1080x2400'}, desc:'Xiaomi Redmi Note 12。6.67寸AMOLED 120Hz屏幕，Snapdragon处理器。128GB存储，Onyx Gray配色。性价比神机。' },
  { img:'/products/41.jpg', name:'Hefty Ultra Strong 13 Gallon Tall Kitchen Trash Bags - Lavender Scent, 80 Count', price:11.97, sold:31000, cat:'家居', rating:4.8, reviews:14045, specs:{'容量':'13加仑','数量':'80只','功能':'防漏/防刺穿/防撕裂','除味':'持续除味','香味':'Fabuloso薰衣草','颜色':'White'}, desc:'Hefty超强厨房垃圾袋13加仑80只装。防漏防刺防撕裂，持续除味技术。Fabuloso薰衣草香，30K+月销。' },
  { img:'/products/42.jpg', name:'Chemical Guys 14-Pc Car Wash Kit - Foam Blaster, Bucket, Soaps, Waxes, Detailing Set', price:124.99, sold:3200, cat:'数码', rating:4.6, reviews:8983, specs:{'件数':'14件套','包含':'泡沫枪/桶/毛巾/蜡/清洁剂','连接':'标准花园水管','肥皂':'Honeydew Snow Foam','清洁':'轮毂/玻璃/内饰'}, desc:'Chemical Guys 14件汽车清洗套装。泡沫枪接花园水管，含洗车液、轮毂清洁剂、蜡、玻璃清洁剂。全套内外饰清洁护理。3K+月销。' },
  { img:'/products/43.jpg', name:'Schumacher DSR125 4-Bank Battery Charger/Maintainer - 6V/12V Auto, Smart Amperage Control', price:267.65, sold:55, cat:'数码', rating:4.4, reviews:535, specs:{'通道':'4路独立','电压':'6V/12V自动','保护':'过充/短路','适用':'汽车/卡车/SUV','重量':'12磅','输出':'12V DC'}, desc:'Schumacher 4路电池充电维护器。智能电流控制，6V/12V自动识别。过充和短路保护，适合多辆车同时维护。' },
  { img:'/products/44.jpg', name:'Astercook 39 PCS Kitchen Utensils Set - Silicone Cooking Tools with Wooden Handle, 446°F Heat Resistant', price:19.98, sold:6500, cat:'家居', rating:4.6, reviews:1513, specs:{'件数':'39件套','材质':'硅胶+木柄','耐热':'446°F','安全':'BPA Free','适用':'不粘锅','颜色':'Black'}, desc:'Astercook 39件厨房用具套装。硅胶头+木质手柄，446°F耐高温。BPA Free食品安全，不粘锅适用。6K+月销爆款。' },

  { img:'/products/45.jpg', name:'Ninja GR101 14" Electric Griddle & Indoor Grill - Nonstick, 500°F, Dishwasher Safe, Silver', price:149.95, sold:4200, cat:'家居', rating:4.6, reviews:3713, specs:{'尺寸':'14英寸','温度':'最高500°F','涂层':'不粘','清洗':'洗碗机安全','功率':'1450W','电压':'120V','重量':'7.8磅'}, desc:'Ninja室内电烤盘+烧烤二合一。14寸不粘涂层，500°F高温。煎牛排、汉堡、三文鱼、蔬菜。洗碗机安全，4K+月销爆款。' },
  { img:'/products/46.jpg', name:'Vtopmart 8 Pack Glass Food Storage Containers - Airtight Lids, Microwave/Oven/Freezer Safe', price:22.79, sold:21000, cat:'家居', rating:4.4, reviews:14447, specs:{'数量':'8个装','材质':'玻璃','密封':' airtight 盖','适用':'微波炉/烤箱/冷冻/洗碗机','容量':'2.2磅','颜色':'Green'}, desc:'Vtopmart 8件玻璃保鲜盒套装。密封盖设计，微波炉烤箱冷冻室通用。BPA Free，洗碗机安全。20K+月销，14K+好评。' },
  { img:'/products/47.jpg', name:'LODIMEKE Smart Watch Alexa Built-in - 1.83" Touch, IP68 Waterproof, Heart Rate/SpO2/Sleep Monitor', price:39.00, sold:1200, cat:'数码', rating:4.2, reviews:1108, specs:{'屏幕':'1.83寸触摸','防水':'IP68','功能':'Alexa/通话/心率/血氧/睡眠','运动':'100+模式','电池':'300mAh','兼容':'iOS/Android'}, desc:'LODIMEKE智能手表。内置Alexa语音助手，1.83寸触摸屏。IP68防水，心率血氧睡眠监测。100+运动模式，iOS和Android兼容。' },
  { img:'/products/48.jpg', name:'Military Smart Watch 1.52" - Bluetooth Call, 24/7 Heart Rate/Sleep/SpO2 Monitor, IP68', price:49.00, sold:1600, cat:'数码', rating:4.3, reviews:1481, specs:{'屏幕':'1.52寸圆形','功能':'通话/心率/睡眠/血氧','防水':'IP68','运动':'多模式','系统':'Wear OS','电池':'350mAh'}, desc:'军用级智能手表。1.52寸圆形屏，蓝牙通话。24/7心率睡眠血氧监测。IP68防水，兼容iPhone和Android。' },
  { img:'/products/49.jpg', name:'Blackview Smart Watch for Men - 1.91" Touch, Bluetooth Call, IP68, Fitness Tracker', price:28.00, sold:160, cat:'数码', rating:4.1, reviews:151, specs:{'屏幕':'1.91寸方形','功能':'通话/心率/运动','防水':'IP68','GPS':'手机GPS','电池':'350mAh','系统':'Android/iOS'}, desc:'Blackview男士智能手表。1.91寸大屏，蓝牙通话。IP68防水，心率监测。GPS手机定位，多运动模式。' },
  { img:'/products/50.jpg', name:'Kitsure Large Extendable Dish Drying Rack - 19.2"-26.7" Anti-Rust, with Cutlery & Cup Holders, Black', price:34.99, sold:5200, cat:'家居', rating:4.4, reviews:7601, specs:{'尺寸':'19.2-26.7寸可伸缩','材质':'防锈金属+塑料','附件':'餐具架+杯架','颜色':'Black','安装':'台面式'}, desc:'Kitsure大号伸缩碗碟沥水架。19.2-26.7寸可调长度，防锈材质。带餐具架和杯架，5K+月销，Amazon推荐。' },
  { img:'/products/51.jpg', name:'Smart Watch 1.90" HD Touch - Bluetooth Call, 120+ Sport Modes, Heart Rate & Sleep Monitor, IP68', price:33.00, sold:1400, cat:'数码', rating:4.1, reviews:1310, specs:{'屏幕':'1.90寸HD触摸','功能':'通话/心率/睡眠/血压','运动':'120+模式','防水':'IP68','电池':'350mAh','兼容':'Android/iPhone'}, desc:'1.90寸HD触摸屏智能手表。蓝牙通话，120+运动模式。心率睡眠血压监测，IP68防水。男女通用。' },
  { img:'/products/52.jpg', name:'Tyger Auto T3X Soft Tri-Fold Truck Bed Tonneau Cover - Compatible with 2024-2026 Toyota Tacoma 5ft Bed', price:329.00, sold:5, cat:'数码', rating:4.0, reviews:1, specs:{'类型':'三折软盖','材质':'铝合金+PVC涂层织物','适用':'2024-2026 Tacoma 5尺货箱','锁定':'卡扣式','防水':'PVC涂层'}, desc:'Tyger Auto T3X卡车货箱三折软盖。专为2024-2026 Toyota Tacoma 5尺货箱设计。铝合金框架+PVC涂层织物，防水耐用。' },
  { img:'/products/53.jpg', name:'Kelamayi Upgrade Broom and Dustpan Set - Long Handle, Upright, Indoor/Outdoor, Green', price:26.99, sold:8200, cat:'家居', rating:4.5, reviews:50855, specs:{'类型':'扫把+簸箕套装','手柄':'长柄不锈钢','颜色':'Green','适用':'室内/室外','尺寸':'10x50.39英寸','材质':'PET刷毛+不锈钢杆'}, desc:'Kelamayi升级扫把簸箕套装。长柄直立设计，不锈钢杆。PET刷毛，室内室外通用。50K+好评，8K+月销爆款。' },
  { img:'/products/54.jpg', name:'DUTZUN 9-Piece Stainless Steel Mixing Bowls Set with Lids & Colander, 4 Sizes - Black', price:24.99, sold:4200, cat:'家居', rating:4.6, reviews:894, specs:{'件数':'9件套','尺寸':'4.5/2.5/2/1.5QT','材质':'不锈钢','附件':'盖子+滤网','颜色':'Black'}, desc:'DUTZUN 9件不锈钢搅拌碗套装。4个尺寸，配盖子和滤网。黑色外观，适合厨房备餐。4K+月销。' },
  { img:'/products/55.jpg', name:'JUNJIEUNVO Wireless Bluetooth Headphones - Over-Ear, Hifi Audio, Gaming, TF Card, AUX, White', price:15.00, sold:300, cat:'数码', rating:4.0, reviews:50, specs:{'连接':'Bluetooth','功能':'Hifi/游戏/TF卡/AUX','类型':'头戴式','颜色':'White','重量':'280g','灵敏度':'121dB'}, desc:'JUNJIEUNVO无线蓝牙耳机。头戴式设计，Hifi音质。支持TF卡和AUX有线连接，游戏模式低延迟。白色，280g轻量。' },
  { img:'/products/56.jpg', name:'PZOTRUF Automatic Soap Dispenser 17oz/500ml - Touchless Infrared Sensor, 5 Adjustable Levels, Silver', price:21.99, sold:3200, cat:'家居', rating:4.1, reviews:10638, specs:{'容量':'17oz/500ml','感应':'红外自动','档位':'5档可调','颜色':'Silver','材质':'树脂','安全':'BPA Free','尺寸':'6.37x3.34x7.4英寸'}, desc:'PZOTRUF自动感应皂液器。红外免接触，5档出液量可调。500ml大容量，BPA Free。厨房浴室通用，3K+月销#1 Best Seller。' },
  { img:'/products/57.jpg', name:'TBTeek Butane Kitchen Torch - Adjustable Flame, Safety Lock, Silver-Black', price:15.99, sold:449, cat:'家居', rating:4.3, reviews:171, specs:{}, desc:'' },
  { img:'/products/58.jpg', name:'Rivian NACS DC Adapter - NACS to CCS for Electric Vehicles', price:210.0, sold:456, cat:'数码', rating:4.3, reviews:174, specs:{}, desc:'' },
  { img:'/products/59.jpg', name:'XOOMEER AI Smart Glasses - Bluetooth, 160+ Language Translation, Color-Change Lenses', price:25.0, sold:463, cat:'数码', rating:4.3, reviews:177, specs:{}, desc:'' },
  { img:'/products/60.jpg', name:'Xmenha AI Bluetooth Sunglasses - Language Translation, Open Ear Headphones, Black', price:36.0, sold:470, cat:'数码', rating:4.3, reviews:180, specs:{}, desc:'' },
  { img:'/products/61.jpg', name:'Rivian License Plate Frame - Matte Black, Universal Fit', price:55.0, sold:477, cat:'数码', rating:4.3, reviews:183, specs:{}, desc:'' },
  { img:'/products/62.jpg', name:'Ortizan Portable Bluetooth Speaker X10 - IPX7 Waterproof, 30H Playtime, 24W, Black', price:45.0, sold:484, cat:'数码', rating:4.3, reviews:186, specs:{}, desc:'' },
  { img:'/products/63.jpg', name:'New 2026 Hyundai Venue SEL - Two-Tone Roof, Compact SUV', price:24995.0, sold:491, cat:'数码', rating:4.3, reviews:189, specs:{}, desc:'' },
  { img:'/products/64.jpg', name:'HANYCONY Outlet Extender with Night Light - 5 Outlets, 4 USB Ports, Surge Protector, White', price:9.98, sold:498, cat:'家居', rating:4.3, reviews:192, specs:{}, desc:'' },
  { img:'/products/65.jpg', name:'New 2026 Hyundai IONIQ 5 SEL - Electric SUV, AWD', price:46085.0, sold:505, cat:'数码', rating:4.3, reviews:195, specs:{}, desc:'' },
  { img:'/products/66.jpg', name:'New 2026 Hyundai Sonata SEL Sport - Serenity White, AWD, 191hp', price:33060.0, sold:512, cat:'数码', rating:4.3, reviews:198, specs:{}, desc:'' },
  { img:'/products/67.jpg', name:'Marshall Emberton II Portable Bluetooth Speaker - Black & Brass', price:143.0, sold:519, cat:'数码', rating:4.3, reviews:201, specs:{}, desc:'' },
  { img:'/products/68.jpg', name:'Lasko 2520 Oscillating Pedestal Fan - 16" 3-Speed, Adjustable Height, White', price:29.98, sold:526, cat:'家居', rating:4.3, reviews:204, specs:{}, desc:'' },
  { img:'/products/69.jpg', name:'New 2026 Hyundai Santa Fe Hybrid Limited - Serenity White, AWD, 231hp', price:51240.0, sold:533, cat:'数码', rating:4.3, reviews:207, specs:{}, desc:'' },
  { img:'/products/70.jpg', name:'New 2026 Hyundai Palisade HEV Calligraphy - Robust Emerald, AWD, 329hp', price:61125.0, sold:540, cat:'数码', rating:4.3, reviews:210, specs:{}, desc:'' },
  { img:'/products/71.jpg', name:'Dwersty One Way Window Privacy Film - Sun Heat Blocking, Mirror, 35.4x157.4 inch', price:53.99, sold:547, cat:'家居', rating:4.3, reviews:213, specs:{}, desc:'' },
  { img:'/products/72.jpg', name:'Vision Home Natural Pinch Pleat Full Blackout Curtains - Linen Blend, 40"Wx95"L, 2 Panel', price:75.95, sold:554, cat:'家居', rating:4.3, reviews:216, specs:{}, desc:'' },
  { img:'/products/73.jpg', name:'New 2026 Hyundai Santa Cruz XRT - Canyon Red, Crew Cab, AWD, 281hp', price:44325.0, sold:561, cat:'数码', rating:4.3, reviews:219, specs:{}, desc:'' },
  { img:'/products/74.jpg', name:'Everlasting Comfort Memory Foam Seat Cushion - Office Chair & Car, Large, Black', price:47.98, sold:568, cat:'家居', rating:4.3, reviews:222, specs:{}, desc:'' },
  { img:'/products/75.jpg', name:'LEVOIT Tower Fan 36" - 90° Oscillating, 28dB Quiet, 5 Speeds, Remote, White', price:54.95, sold:575, cat:'家居', rating:4.3, reviews:225, specs:{}, desc:'' },
  { img:'/products/76.jpg', name:'SK-II Facial Treatment Essence 7.7oz - Anti-Aging, PITERA, Refines Texture & Dark Spots', price:245.0, sold:582, cat:'美妆', rating:4.3, reviews:228, specs:{}, desc:'' },
  { img:'/products/77.jpg', name:'Canfanni 4-Piece Snack Box Containers Set - 4 Compartment, Stackable, BPA-Free', price:8.96, sold:589, cat:'食品', rating:4.3, reviews:231, specs:{}, desc:'' },
  { img:'/products/78.jpg', name:'Estée Lauder Advanced Night Repair Face Serum - Hyaluronic Acid & Peptides, 0.67oz', price:49.5, sold:596, cat:'美妆', rating:4.3, reviews:234, specs:{}, desc:'' },
  { img:'/products/79.jpg', name:'Ziploc Snack Bags 280 Count - Easy Open and Close, Plastic Food Storage', price:9.77, sold:603, cat:'食品', rating:4.3, reviews:237, specs:{}, desc:'' },
  { img:'/products/80.jpg', name:'Clarks Tildenwalk Men Business Shoes - Leather Lace-Up Oxford, Black', price:69.0, sold:610, cat:'鞋靴', rating:4.3, reviews:240, specs:{}, desc:'' },
  { img:'/products/81.jpg', name:'Pure Future Air-Tight Snackle Box - Divided Serving Tray with Lid & Handle, Clear', price:23.99, sold:617, cat:'食品', rating:4.3, reviews:243, specs:{}, desc:'' },
  { img:'/products/82.jpg', name:'YUNJAC Base Prep Korean Primer 1.35oz - Silicone-Free, Serum Texture, Radiant Skin', price:36.0, sold:624, cat:'美妆', rating:4.3, reviews:246, specs:{}, desc:'' },
  { img:'/products/83.jpg', name:'Reebok Unisex Prime Event Sneaker - Vector Navy, Lace-Up', price:34.0, sold:631, cat:'鞋靴', rating:4.3, reviews:249, specs:{}, desc:'' },
  { img:'/products/84.jpg', name:'Sooryehan Hyobidam Fermented Skincare Gift Set - Wild Ginseng, Anti-Aging, Full Size', price:66.5, sold:638, cat:'美妆', rating:4.3, reviews:252, specs:{}, desc:'' },
  { img:'/products/85.jpg', name:'Columbia Mens Konos Hiking Shoe - Nori/Elk, Lace-Up, Rubber Sole', price:55.0, sold:645, cat:'鞋靴', rating:4.3, reviews:255, specs:{}, desc:'' },
  { img:'/products/86.jpg', name:'Clear Rotating Makeup Organizer - Adjustable, 360° Spinning, Cosmetic Display Stand', price:12.99, sold:652, cat:'美妆', rating:4.3, reviews:258, specs:{}, desc:'' },
  { img:'/products/87.jpg', name:'Non Slip Work Shoes for Men - Waterproof Leather, Slip-On, Kitchen Chef Restaurant, Black', price:51.0, sold:659, cat:'鞋靴', rating:4.3, reviews:261, specs:{}, desc:'' },
  { img:'/products/88.jpg', name:'Kapsen Womens Walking Sneakers - Air Running, Breathable, Platform Loafers, Orange', price:44.0, sold:666, cat:'鞋靴', rating:4.3, reviews:264, specs:{}, desc:'' },
  { img:'/products/89.jpg', name:'Nautica Kids Sneaker Athletic Slip-On - Americana-mazi, Bungee Running Shoes', price:34.0, sold:673, cat:'鞋靴', rating:4.3, reviews:267, specs:{}, desc:'' },
  { img:'/products/90.jpg', name:'Lancôme Génifique Ultimate Dual Recovery Face Serum - Anti-Aging, Beta Glucan, 0.67oz', price:65.0, sold:680, cat:'美妆', rating:4.3, reviews:270, specs:{}, desc:'' },
  { img:'/products/91.jpg', name:'Obagi ELASTIderm Lift Up & Sculpt Facial Moisturizer - Anti-Aging Cream, Peptides, 1.7oz', price:140.0, sold:687, cat:'美妆', rating:4.3, reviews:273, specs:{}, desc:'' },
  { img:'/products/92.jpg', name:'CIYODO 2-Piece Storage Necklace Rack - Golden Alloy Tower, Three-Tier Jewelry Organizer', price:37.0, sold:694, cat:'配饰', rating:4.3, reviews:276, specs:{}, desc:'' },
  { img:'/products/93.jpg', name:'Giorgio Armani Luminous Silk Foundation No.5.5 Natural Beige 1oz', price:76.99, sold:495, cat:'美妆', rating:4.3, reviews:186, specs:{}, desc:'' },
  { img:'/products/94.jpg', name:'MotherCould Snack Box Containers Set of 2 - 8 Adjustable Compartments, BPA-Free, Blue', price:19.95, sold:500, cat:'食品', rating:4.3, reviews:188, specs:{}, desc:'' },
  { img:'/products/95.jpg', name:'Framendino 16-Pack Metal Bow Dangle Pendants - Crystal Bowknot Charms for DIY Jewelry', price:12.0, sold:505, cat:'配饰', rating:4.3, reviews:190, specs:{}, desc:'' },
  { img:'/products/96.jpg', name:'LiQunSweet Antique Silver Charms - Imitation Turquoise Resin, 50pcs Plant Angel Cross', price:21.0, sold:510, cat:'配饰', rating:4.3, reviews:192, specs:{}, desc:'' },
  { img:'/products/97.jpg', name:'KimChiChic Beauty Puff Puff Pass Loose Setting Powder - Translucent, Matte Airbrush Finish', price:22.0, sold:515, cat:'美妆', rating:4.3, reviews:194, specs:{}, desc:'' },
  { img:'/products/98.jpg', name:'WAY DENG 40-Pack Multi-Colors Bows Embellishments - Resin Flat Back for DIY Crafting', price:19.0, sold:520, cat:'配饰', rating:4.3, reviews:196, specs:{}, desc:'' },
  { img:'/products/99.jpg', name:'Dipoo 60-Set Deli Containers with Lids - 32/16/8oz, Leak-Proof BPA Free, Microwave Safe', price:22.78, sold:525, cat:'食品', rating:4.3, reviews:198, specs:{}, desc:'' },
  { img:'/products/100.jpg', name:'Lexiart Mens Fashion Henley Shirts - Long Sleeve Button Cotton T-Shirt with Pocket, Brown', price:17.0, sold:530, cat:'男装', rating:4.3, reviews:200, specs:{}, desc:'' },
  { img:'/products/101.jpg', name:'BLOKEES Fantastics Series Sakura Miku Figure - Adjustable Elements, 6 Interchangeable Hands', price:37.45, sold:535, cat:'潮玩', rating:4.3, reviews:202, specs:{}, desc:'' },
  { img:'/products/102.jpg', name:'Ziploc XL Sandwich and Snack Bags 90 Count - Double Zipper, Easy Open Close', price:10.69, sold:540, cat:'食品', rating:4.3, reviews:204, specs:{}, desc:'' },
  { img:'/products/103.jpg', name:'URRU Mens Casual Short Sleeve Button Down Shirt - Summer Beach Vacation, Navy Blue', price:25.0, sold:545, cat:'男装', rating:4.3, reviews:206, specs:{}, desc:'' },
  { img:'/products/104.jpg', name:'URRU Mens Casual Short Sleeve Button Down Shirt - Loose Fit Vacation, Red', price:26.0, sold:550, cat:'男装', rating:4.3, reviews:208, specs:{}, desc:'' },
  { img:'/products/105.jpg', name:'MABAIUDE Mima Nee-san Tina Figure 1/7 Scale - Succubus Anime PVC Statue 20cm', price:57.99, sold:555, cat:'潮玩', rating:4.3, reviews:210, specs:{}, desc:'' },
  { img:'/products/106.jpg', name:'ABYSTYLE Studio Hatsune Miku 1/10 Wink Figurine - Official PVC Vocaloid Collectible', price:49.99, sold:560, cat:'潮玩', rating:4.3, reviews:212, specs:{}, desc:'' },
  { img:'/products/107.jpg', name:'Under Armour Mens UA Wrist Wraps Training T-Shirt - Midnight Navy, 100% Polyester', price:21.0, sold:565, cat:'男装', rating:4.3, reviews:214, specs:{}, desc:'' },
  { img:'/products/108.jpg', name:'Gildan Mens Crew T-Shirts Multipack Style G1100 - 5-Pack, Black/Sport Grey/Charcoal', price:23.0, sold:570, cat:'男装', rating:4.3, reviews:216, specs:{}, desc:'' },
  { img:'/products/109.jpg', name:'Raiden Shogun Figure 1/7 Beelzebul 26cm - Genshin Impact Game Character PVC Anime Model', price:54.99, sold:575, cat:'潮玩', rating:4.3, reviews:218, specs:{}, desc:'' },
  { img:'/products/110.jpg', name:'Nautica Short Sleeve Solid Crew Neck T-Shirt - Grey Heather, 100% Cotton', price:19.0, sold:580, cat:'男装', rating:4.3, reviews:220, specs:{}, desc:'' },
  { img:'/products/111.jpg', name:'Chums Handmade Hamburger T-Shirt - Black, Large, 100% Cotton', price:30.0, sold:585, cat:'男装', rating:4.3, reviews:222, specs:{}, desc:'' },
  { img:'/products/112.jpg', name:'Nautica Short Sleeve Solid Crew Neck T-Shirt - Blue Indigo, 100% Cotton', price:20.0, sold:590, cat:'男装', rating:4.3, reviews:224, specs:{}, desc:'' },
  { img:'/products/113.jpg', name:'Pipigirl 1:144 Soul Spear Lamorak Plastic Action Figure - 6.3" Mecha Model Kit', price:39.59, sold:595, cat:'潮玩', rating:4.3, reviews:226, specs:{}, desc:'' },
  { img:'/products/114.jpg', name:'Puma 588737 Mens Short Sleeve T-Shirt - Training Simple ESS Logo, Puma Black', price:17.0, sold:600, cat:'男装', rating:4.3, reviews:228, specs:{}, desc:'' },
  { img:'/products/115.jpg', name:'Taito Hatsune Miku Sakura Lantern ver AMP+ Figure - Official Licensed, Multiple Colors', price:43.5, sold:605, cat:'潮玩', rating:4.3, reviews:230, specs:{}, desc:'' },
  { img:'/products/116.jpg', name:'Nautica Short Sleeve Solid Crew Neck T-Shirt - Hawaiian Ocean, 100% Cotton', price:16.0, sold:610, cat:'男装', rating:4.3, reviews:232, specs:{}, desc:'' },
  { img:'/products/117.jpg', name:'Nautica Short Sleeve Solid Crew Neck T-Shirt - Tidal Green Solid, 100% Cotton', price:22.0, sold:615, cat:'男装', rating:4.3, reviews:234, specs:{}, desc:'' },
  { img:'/products/118.jpg', name:'Fashion Mens Muscle Gym Workout Athletic T-Shirt - Cotton Tee, Navy Blue', price:24.0, sold:620, cat:'男装', rating:4.3, reviews:236, specs:{}, desc:'' },
  { img:'/products/119.jpg', name:'LEBOO 1/100 SNAA YR-05 Emperor of Underworld Plastic Action Figure Kit - 8.8" Pre-Painted', price:59.99, sold:625, cat:'潮玩', rating:4.3, reviews:238, specs:{}, desc:'' },
  { img:'/products/120.jpg', name:'Nautica Mens Short Sleeve 100% Cotton Classic Logo Graphic Tee - Nautica Red', price:22.0, sold:630, cat:'男装', rating:4.3, reviews:240, specs:{}, desc:'' },
  { img:'/products/121.jpg', name:'Champion Mens Classic Jersey Graphic T-Shirt - Navy, 100% Cotton', price:19.0, sold:635, cat:'男装', rating:4.3, reviews:242, specs:{}, desc:'' },
  { img:'/products/122.jpg', name:'TAMASHII NATIONS Dragon Ball Z Son Goku S.H.Figuarts - A Saiyan Raised on Earth', price:30.99, sold:640, cat:'潮玩', rating:4.3, reviews:244, specs:{}, desc:'' },
  { img:'/products/123.jpg', name:'Nautica Mens Short Sleeve Solid Crew Neck T-Shirt - True Black, 100% Cotton', price:26.0, sold:645, cat:'男装', rating:4.3, reviews:246, specs:{}, desc:'' },
  { img:'/products/124.jpg', name:'POP MART SKULLPANDA The Paradox Series Blind Box - Random Design Collectible Figure', price:19.99, sold:650, cat:'潮玩', rating:4.3, reviews:248, specs:{}, desc:'' },
  { img:'/products/125.jpg', name:'Wrangler Authentics Mens Straight Fit Flat Front Chino - Gunmetal, 98% Cotton', price:34.0, sold:655, cat:'男装', rating:4.3, reviews:250, specs:{}, desc:'' },
  { img:'/products/126.jpg', name:'Lee Mens Extreme Motion Flat Front Regular Straight Trousers - Navy', price:32.0, sold:660, cat:'男装', rating:4.3, reviews:252, specs:{}, desc:'' },
  { img:'/products/127.jpg', name:'Lee Mens Performance Series Extreme Comfort Cargo Trousers - Shadow, Zip Fly', price:39.0, sold:665, cat:'男装', rating:4.3, reviews:254, specs:{}, desc:'' },
  { img:'/products/128.jpg', name:'QAHEART Cartethyia Anime Girl Figure 7.87" - Original Painting Bechuania PVC Statue', price:45.11, sold:670, cat:'潮玩', rating:4.3, reviews:256, specs:{}, desc:'' },
  { img:'/products/129.jpg', name:'XiDonDon New Electronic Cute Pet Series Blind Box - 1/12 BJD Doll Mystery Figure', price:31.9, sold:675, cat:'潮玩', rating:4.3, reviews:258, specs:{}, desc:'' },
  { img:'/products/130.jpg', name:'Wrangler Authentics Mens Twill Relaxed Fit Cargo Pant Logan - Khaki Dust', price:37.0, sold:680, cat:'男装', rating:4.3, reviews:260, specs:{}, desc:'' },
  { img:'/products/131.jpg', name:'Wrangler Authentics Mens Twill Relaxed Fit Cargo Pant Logan - Navy Ripstop', price:37.0, sold:685, cat:'男装', rating:4.3, reviews:262, specs:{}, desc:'' },
  { img:'/products/132.jpg', name:'QAHEART Girl Sitting Position Changeable Face Figure Ornament - Kinako Standing, 14cm', price:12.99, sold:690, cat:'潮玩', rating:4.3, reviews:264, specs:{}, desc:'' },
  { img:'/products/133.jpg', name:'RZAHUAHU H-I Star Rail Firefly Figure 1/7 - Game Anime PVC Figurine 10.3"', price:54.99, sold:695, cat:'潮玩', rating:4.3, reviews:266, specs:{}, desc:'' },
  { img:'/products/134.jpg', name:'Wrangler Authentics Mens Stretch Cargo Pant - Elmwood, Zip Closure', price:35.0, sold:700, cat:'男装', rating:4.3, reviews:268, specs:{}, desc:'' },
  { img:'/products/135.jpg', name:'Perry Ellis Mens Portfolio Performance Modern Fit Classic Trousers - Mood Indigo', price:55.47, sold:560, cat:'男装', rating:4.3, reviews:135, specs:{}, desc:'' },
  { img:'/products/136.jpg', name:'QAHEART Anime JK Bunny Girl Figure 23cm - Original Painting Kanna-chan PVC Statue', price:18.99, sold:564, cat:'潮玩', rating:4.3, reviews:136, specs:{}, desc:'' },
  { img:'/products/137.jpg', name:'RZAHUAHU Mushoku Tensei Roxy Migurdia Figure 1/7 - Jobless Reincarnation PVC 7.8"', price:35.99, sold:568, cat:'潮玩', rating:4.3, reviews:137, specs:{}, desc:'' },
  { img:'/products/138.jpg', name:'FREEing Spice and Wolf Holo 1/4 PVC Figure - Premium Scale Collectible', price:318.0, sold:572, cat:'潮玩', rating:4.3, reviews:138, specs:{}, desc:'' },
  { img:'/products/139.jpg', name:'Max Factory Fate/Grand Order Saber/Miyamoto Musashi Figma Action Figure', price:118.0, sold:576, cat:'潮玩', rating:4.3, reviews:139, specs:{}, desc:'' },
  { img:'/products/140.jpg', name:'QAHEART Yokoyama Ishimi Anime Figure 26cm - Original Painting Illustration PVC', price:27.67, sold:580, cat:'潮玩', rating:4.3, reviews:140, specs:{}, desc:'' },
  { img:'/products/141.jpg', name:'Megahouse Ghost in the Shell SAC_2045 Kusanagi Motoko Figure', price:260.36, sold:584, cat:'潮玩', rating:4.3, reviews:141, specs:{}, desc:'' },
  { img:'/products/142.jpg', name:'ICON Meats Snack Sticks Sampler 24-Pack - Bison, Elk, Venison & Pork, High Protein', price:59.99, sold:588, cat:'食品', rating:4.3, reviews:142, specs:{}, desc:'' },
  { img:'/products/143.jpg', name:'Frito-Lay Party Mix Variety Pack 40 Count - Classic Chips & Snacks', price:23.79, sold:592, cat:'食品', rating:4.3, reviews:143, specs:{}, desc:'' },
  { img:'/products/144.jpg', name:'Afibi Women Full Length Blending Maxi Chiffon Long Beach Skirt - Design S', price:36.0, sold:596, cat:'女装', rating:4.3, reviews:144, specs:{}, desc:'' },
  { img:'/products/145.jpg', name:'Jack Links Beef Jerky Variety Pack 9-Count - Original & Teriyaki, 13g Protein', price:21.99, sold:600, cat:'食品', rating:4.3, reviews:145, specs:{}, desc:'' },
  { img:'/products/146.jpg', name:'NASHALYLY Womens Chiffon Elastic High Waist Pleated A-Line Flared Maxi Skirt', price:40.0, sold:604, cat:'女装', rating:4.3, reviews:146, specs:{}, desc:'' },
  { img:'/products/147.jpg', name:'Veratify Healthy Mixed Snack Box 66-Count - Granola Bars Bulk Variety Pack', price:49.79, sold:608, cat:'食品', rating:4.3, reviews:147, specs:{}, desc:'' },
  { img:'/products/148.jpg', name:'Vigorics Womens Elastic High Waist Tiered Mini Skirt with Shorts & Pockets', price:22.0, sold:612, cat:'女装', rating:4.3, reviews:148, specs:{}, desc:'' },
  { img:'/products/149.jpg', name:'SANGTREE Girls Womens Pleated Skirt with Comfy Stretchy Band - Cream White', price:35.0, sold:616, cat:'女装', rating:4.3, reviews:149, specs:{}, desc:'' },
  { img:'/products/150.jpg', name:'Gimme Seaweed Organic Premium Roasted Seaweed Snacks Sea Salt 20-Count', price:17.98, sold:620, cat:'食品', rating:4.3, reviews:150, specs:{}, desc:'' },
  { img:'/products/151.jpg', name:'DAZCOS US Size Plaid Skirt for Women with Shorts - Casual High Waist Pleated Mini', price:28.0, sold:624, cat:'女装', rating:4.3, reviews:151, specs:{}, desc:'' },
  { img:'/products/152.jpg', name:'Bluetime Women Leopard Print Long Chiffon Skirt - Summer Beach Pleated Maxi', price:32.0, sold:628, cat:'女装', rating:4.3, reviews:152, specs:{}, desc:'' },
  { img:'/products/153.jpg', name:'Azules Rayon Span Regular to Plus Size Maxi Skirt - Solid Soft Stretchy Charcoal', price:22.0, sold:632, cat:'女装', rating:4.3, reviews:153, specs:{}, desc:'' },
  { img:'/products/154.jpg', name:'NASHALYLY Womens Chiffon Elastic High Waist Pleated A-Line Maxi Skirt Beja Blue', price:30.0, sold:636, cat:'女装', rating:4.3, reviews:154, specs:{}, desc:'' },
  { img:'/products/155.jpg', name:'Vita Coco Coconut Water Pure Organic 12-Pack - Natural Electrolytes 11.1oz', price:20.99, sold:640, cat:'食品', rating:4.3, reviews:155, specs:{}, desc:'' },
  { img:'/products/156.jpg', name:'IDEALSANXUN Fleece Lined Long Skirts for Women - Elastic Waist Aline Warm Winter', price:43.0, sold:644, cat:'女装', rating:4.3, reviews:156, specs:{}, desc:'' },
  { img:'/products/157.jpg', name:'EXCHIC Womens Casual Chiffon Elastic Waist A-Line Pleated Midi Skirt with Pockets', price:29.0, sold:648, cat:'女装', rating:4.3, reviews:157, specs:{}, desc:'' },
  { img:'/products/158.jpg', name:'Taydey A-Line Pleated Vintage Skirts for Women - Navy Blue 3XL', price:28.0, sold:652, cat:'女装', rating:4.3, reviews:158, specs:{}, desc:'' },
  { img:'/products/159.jpg', name:'HERBATOMIA Pleated A-line Midi Skirt Elastic Waist Button Front Casual Flared Blue', price:37.0, sold:656, cat:'女装', rating:4.3, reviews:159, specs:{}, desc:'' },
  { img:'/products/160.jpg', name:'Rip Van Wafels Dutch Caramel & Vanilla Stroopwafels 12-Count - Low Sugar Keto', price:14.97, sold:660, cat:'食品', rating:4.3, reviews:160, specs:{}, desc:'' },
  { img:'/products/161.jpg', name:'Cicy Bell Womens Casual Blazers Open Front Long Sleeve Work Office Jacket - Dark Green', price:48.0, sold:664, cat:'女装', rating:4.3, reviews:161, specs:{}, desc:'' },
  { img:'/products/162.jpg', name:'Ferrero Collection Premium Assorted Chocolates 48-Count - Hazelnut, Dark, Coconut', price:39.98, sold:668, cat:'食品', rating:4.3, reviews:162, specs:{}, desc:'' },
  { img:'/products/163.jpg', name:'ZESICA Womens Floral Print Blouse Long Sleeve Button Down Casual Boho Shirt - Brown', price:34.0, sold:672, cat:'女装', rating:4.3, reviews:163, specs:{}, desc:'' },
  { img:'/products/164.jpg', name:'oxiuly Womens Casual Criss-Cross V-Neck Floral Flare Midi Summer Dress - Blue Green', price:38.0, sold:676, cat:'女装', rating:4.3, reviews:164, specs:{}, desc:'' },
  { img:'/products/165.jpg', name:'Scarlet Darkness Bell Sleeve Renaissance Pirate Peasant Blouse - Dark Green', price:32.0, sold:680, cat:'女装', rating:4.3, reviews:165, specs:{}, desc:'' },
  { img:'/products/166.jpg', name:'Allegra K Womens Work Office Stretch Lapel Collar Long Sleeve Suit Blazer - Dark Pink', price:49.0, sold:684, cat:'女装', rating:4.3, reviews:166, specs:{}, desc:'' },
  { img:'/products/167.jpg', name:'Allimy Women Summer Casual Split V Neckline Chiffon Blouse Loose Tunic Top - Red', price:26.0, sold:688, cat:'女装', rating:4.3, reviews:167, specs:{}, desc:'' },
  { img:'/products/168.jpg', name:'oxiuly Womens Vintage Patchwork Pockets Puffy Swing Casual Party Dress - Gird-bk', price:43.0, sold:692, cat:'女装', rating:4.3, reviews:168, specs:{}, desc:'' },
  { img:'/products/169.jpg', name:'OTOKI Jin Ramen Mild Korean Instant Ramen 18-Pack - 13-Hour Beef Bone Broth', price:27.89, sold:696, cat:'食品', rating:4.3, reviews:169, specs:{}, desc:'' },
  { img:'/products/170.jpg', name:'Womens Sarong Beach Bikini Wrap Sheer Short Skirt Chiffon Scarf Swimsuit Coverup', price:24.0, sold:700, cat:'女装', rating:4.3, reviews:170, specs:{}, desc:'' },
  { img:'/products/171.jpg', name:'Frito Lay Flamin Hot Mix 40-Count - Cheetos, Doritos, Chesters & Funyuns Variety', price:22.43, sold:704, cat:'食品', rating:4.3, reviews:171, specs:{}, desc:'' },
  { img:'/products/172.jpg', name:'HIYIRUI Womens Satin Blouse Long Sleeve Silk Shirt Work Office Top - Pink', price:35.0, sold:708, cat:'女装', rating:4.3, reviews:172, specs:{}, desc:'' },
  { img:'/products/173.jpg', name:'7Days Soft Croissant 6-Pack Strawberry & Vanilla - Individually Wrapped Pastry', price:9.95, sold:712, cat:'食品', rating:4.3, reviews:173, specs:{}, desc:'' },
  { img:'/products/174.jpg', name:'PRETTYGARDEN Womens Summer Deep V Neck Short Sleeve Wrap Drawstring Jumpsuit - Black', price:34.0, sold:716, cat:'女装', rating:4.3, reviews:174, specs:{}, desc:'' },
  { img:'/products/175.jpg', name:'Bauducco Toast Crispy Toasted Bread - Original & Whole Wheat 30oz Pack of 6', price:12.99, sold:720, cat:'食品', rating:4.3, reviews:175, specs:{}, desc:'' },
  { img:'/products/176.jpg', name:'YAMASAN KYOTO UJI Dorayaki Japanese Red Bean Pancake - Mini Wagashi Sweets 184g', price:16.34, sold:724, cat:'食品', rating:4.3, reviews:176, specs:{}, desc:'' },
  { img:'/products/177.jpg', name:'Eastanbul Baklava 8.8oz - Turkish Pistachio & Cashew Rich Pastry Gift Box', price:14.99, sold:728, cat:'食品', rating:4.3, reviews:177, specs:{}, desc:'' },
  { img:'/products/178.jpg', name:'Toufayan Original Naan Tandoori 3-Pack 12 Flatbreads - Non-GMO Vegan', price:26.73, sold:732, cat:'食品', rating:4.3, reviews:178, specs:{}, desc:'' },
  { img:'/products/179.jpg', name:'Tankaneo Womens Short Sleeve Cropped T-Shirt Summer Rolled Dolman Sleeve Crop Top', price:24.0, sold:736, cat:'女装', rating:4.3, reviews:179, specs:{}, desc:'' },
  { img:'/products/180.jpg', name:'Hero Seeded Bread 4 Loaves - 1g Net Carb Keto Friendly 60 Calories per Slice', price:55.97, sold:740, cat:'食品', rating:4.3, reviews:180, specs:{}, desc:'' },
  { img:'/products/181.jpg', name:'Miusey Womens Sleeveless Round Neck Loose Fit Racerback Yoga Tank Top - Wine Red', price:27.0, sold:744, cat:'女装', rating:4.3, reviews:181, specs:{}, desc:'' },
  { img:'/products/182.jpg', name:'La Boulangere Pains au Chocolat 2-Pack 32 Croissants - Authentic French Recipe', price:30.0, sold:748, cat:'食品', rating:4.3, reviews:182, specs:{}, desc:'' },
  { img:'/products/183.jpg', name:'Women Graphic T-Shirts Casual Short Sleeve Tee Tops Plus Size - Black', price:23.0, sold:752, cat:'女装', rating:4.3, reviews:183, specs:{}, desc:'' },
  { img:'/products/184.jpg', name:'Monster Energy Drink Green Original 16oz 15-Pack', price:29.98, sold:756, cat:'食品', rating:4.3, reviews:184, specs:{}, desc:'' },
  { img:'/products/185.jpg', name:'Women Graphic T-Shirts Casual Short Sleeve Tee Tops Plus Size - White', price:22.0, sold:760, cat:'女装', rating:4.3, reviews:185, specs:{}, desc:'' },
  { img:'/products/186.jpg', name:'MAGICMK Women Short Lips Print Causal Off The Shoulder Plus Size T-Shirt Top', price:27.0, sold:764, cat:'女装', rating:4.3, reviews:186, specs:{}, desc:'' },
  { img:'/products/187.jpg', name:'Lipton Brisk Lemon Iced Tea 12-Pack - 12oz Cans', price:5.97, sold:591, cat:'食品', rating:4.3, reviews:187, specs:{}, desc:'' },
  { img:'/products/188.jpg', name:'IUT Solid Push Up Board 15-in-1 - Multi-Functional Pushup Stands System', price:19.99, sold:594, cat:'家居', rating:4.3, reviews:188, specs:{}, desc:'' },
  { img:'/products/189.jpg', name:'Women Graphic T-Shirts Casual Short Sleeve Tee - Pink, Plus Size', price:22.0, sold:597, cat:'女装', rating:4.3, reviews:189, specs:{}, desc:'' },
  { img:'/products/190.jpg', name:'Sprite Lemon-Lime Caffeine Free Soda 12-Pack - 12oz Cans', price:8.57, sold:600, cat:'食品', rating:4.3, reviews:190, specs:{}, desc:'' },
  { img:'/products/191.jpg', name:'YOLEO Adjustable Weight Bench - ASTM-Certified 827lbs, 84 Positions, Foldable', price:75.49, sold:603, cat:'家居', rating:4.3, reviews:191, specs:{}, desc:'' },
  { img:'/products/192.jpg', name:'Red Bull Energy Drink 24-Pack - 8.4oz Cans, 80mg Caffeine', price:34.98, sold:606, cat:'食品', rating:4.3, reviews:192, specs:{}, desc:'' },
  { img:'/products/193.jpg', name:'Chicrise Womens Oversize Striped T-Shirt - Brown Black, Short Crew Neck', price:33.0, sold:609, cat:'女装', rating:4.3, reviews:193, specs:{}, desc:'' },
  { img:'/products/194.jpg', name:'HPYGN Resistance Bands Set - Exercise Bands with Handles, Door Anchor, Ankle Straps', price:20.99, sold:612, cat:'家居', rating:4.3, reviews:194, specs:{}, desc:'' },
  { img:'/products/195.jpg', name:'AriZona Green Tea with Ginseng and Honey 12-Pack - 22oz Big Cans', price:11.76, sold:615, cat:'食品', rating:4.3, reviews:195, specs:{}, desc:'' },
  { img:'/products/196.jpg', name:'Pepsi Soda 10-Pack - 7.5oz Mini Cans', price:6.42, sold:618, cat:'食品', rating:4.3, reviews:196, specs:{}, desc:'' },
  { img:'/products/197.jpg', name:'BODYARMOR Sports Drink Strawberry Banana 12-Pack - 16oz Bottles', price:13.48, sold:621, cat:'食品', rating:4.3, reviews:197, specs:{}, desc:'' },
  { img:'/products/198.jpg', name:'BODYARMOR Sports Drink Orange Mango 12-Pack - 16oz Bottles', price:16.8, sold:624, cat:'食品', rating:4.3, reviews:198, specs:{}, desc:'' },
  { img:'/products/199.jpg', name:'Snapple Kiwi Strawberry Juice Drink 12-Pack - 16oz Bottles', price:16.99, sold:627, cat:'食品', rating:4.3, reviews:199, specs:{}, desc:'' },
  { img:'/products/200.jpg', name:'Coca-Cola Zero Sugar Soda 12-Pack - 12oz Cans', price:8.42, sold:630, cat:'食品', rating:4.3, reviews:200, specs:{}, desc:'' },
  { img:'/products/201.jpg', name:'Starbucks Refreshers Strawberry Acai Concentrate - 32oz Bottle', price:8.97, sold:633, cat:'食品', rating:4.3, reviews:201, specs:{}, desc:'' },
  { img:'/products/202.jpg', name:'HOTIAN Womens Cotton Acid Wash Cap Sleeve Boxy T-Shirt - Grey, Oversized Vintage', price:28.0, sold:636, cat:'女装', rating:4.3, reviews:202, specs:{}, desc:'' },
  { img:'/products/203.jpg', name:'Womens Everyday Flowy Slub Burnout Active Crew T-Shirt - 10-Pack', price:33.0, sold:639, cat:'女装', rating:4.3, reviews:203, specs:{}, desc:'' },
  { img:'/products/204.jpg', name:'Snapple Peach Tea 12-Pack - 16oz Recycled Bottles', price:12.24, sold:642, cat:'食品', rating:4.3, reviews:204, specs:{}, desc:'' },
  { img:'/products/205.jpg', name:'POPYOUNG Womens Summer Short Sleeve Tunic Top - Stripe Black, Crewneck', price:24.0, sold:645, cat:'女装', rating:4.3, reviews:205, specs:{}, desc:'' },
  { img:'/products/206.jpg', name:'FIJI Natural Artesian Bottled Water 24-Pack - 330mL', price:19.99, sold:648, cat:'食品', rating:4.3, reviews:206, specs:{}, desc:'' },
  { img:'/products/207.jpg', name:'MERCHCODE Womens Simba Love Graphic Tee - Black, 100% Cotton', price:21.0, sold:651, cat:'女装', rating:4.3, reviews:207, specs:{}, desc:'' },
  { img:'/products/208.jpg', name:'Gatorade G Zero Thirst Quencher 12-Pack - 3 Flavor Variety, 20oz', price:15.86, sold:654, cat:'食品', rating:4.3, reviews:208, specs:{}, desc:'' },
  { img:'/products/209.jpg', name:'Bersauji 2026 Upgraded Ab Roller Wheel with Knee Mat & Timer - Automatic Rebound', price:27.99, sold:657, cat:'家居', rating:4.3, reviews:209, specs:{}, desc:'' },
  { img:'/products/210.jpg', name:'iGENJUN Women Long Sleeve V Neck Lightweight T-Shirt - Black, Soft Casual Top', price:23.0, sold:660, cat:'女装', rating:4.3, reviews:210, specs:{}, desc:'' },
  { img:'/products/211.jpg', name:'Nandashe Womens 3/4 Sleeve Floral Tunic Blouse - Blue Green, Dressy Top', price:34.0, sold:663, cat:'女装', rating:4.3, reviews:211, specs:{}, desc:'' },
  { img:'/products/212.jpg', name:'FITGIRL Ankle Strap for Cable Machine - Premium Padding, Glute Workouts', price:7.99, sold:666, cat:'家居', rating:4.3, reviews:212, specs:{}, desc:'' },
  { img:'/products/213.jpg', name:'Elesomo Womens Short Sleeve Cotton Sweatshirt - Black, Summer Tunic', price:30.0, sold:669, cat:'女装', rating:4.3, reviews:213, specs:{}, desc:'' },
  { img:'/products/214.jpg', name:'Hint Fruit-Infused Water 12-Pack - 4-Flavor Variety, Sugar Free, 16oz', price:11.46, sold:672, cat:'食品', rating:4.3, reviews:214, specs:{}, desc:'' },
  { img:'/products/215.jpg', name:'Tropicana 100% Juice 24-Pack - 3-Flavor Classic Variety, 10oz', price:32.49, sold:675, cat:'食品', rating:4.3, reviews:215, specs:{}, desc:'' },
  { img:'/products/216.jpg', name:'Nurri 30g Protein Ultra Filtered Milk Shake 10-Pack - Vanilla, Lactose Free', price:26.88, sold:678, cat:'食品', rating:4.3, reviews:216, specs:{}, desc:'' },
  { img:'/products/217.jpg', name:'TOPONSKY Womens 2-Piece Tracksuit - Patchwork Long Sleeve Warm Up Set, Gray Black', price:45.0, sold:681, cat:'女装', rating:4.3, reviews:217, specs:{}, desc:'' },
  { img:'/products/218.jpg', name:'AUTOMET 3/4 Sleeve Lace Business Dressy Blouse - Khaki, Casual Work Top', price:23.0, sold:684, cat:'女装', rating:4.3, reviews:218, specs:{}, desc:'' },
  { img:'/products/219.jpg', name:'Womens Striped 2-Piece Workout Set - Oversized Half Zip Top and Shorts, Orange', price:35.0, sold:687, cat:'女装', rating:4.3, reviews:219, specs:{}, desc:'' },
  { img:'/products/220.jpg', name:'Darigold FIT High Protein Whole Ultra-Filtered Milk 12-Pack - 14oz, Lactose Free', price:31.89, sold:690, cat:'食品', rating:4.3, reviews:220, specs:{}, desc:'' },
  { img:'/products/221.jpg', name:'Horizon Organic Shelf Stable Whole Milk 18-Pack - 8oz, No Refrigeration', price:19.48, sold:693, cat:'食品', rating:4.3, reviews:221, specs:{}, desc:'' },
  { img:'/products/222.jpg', name:'Horizon Organic Shelf Stable 1% Lowfat Milk 18-Pack - 8oz Boxes', price:21.71, sold:696, cat:'食品', rating:4.3, reviews:222, specs:{}, desc:'' },
  { img:'/products/223.jpg', name:'Vinamilk Premium Southern Star Condensed Creamer 4-Pack - 13.4oz', price:24.99, sold:699, cat:'食品', rating:4.3, reviews:223, specs:{}, desc:'' },
  { img:'/products/224.jpg', name:'Vinamilk 9 Nutz Plant-Based Milk 6-Pack - Unsweetened, Vegan, 6oz', price:11.99, sold:702, cat:'食品', rating:4.3, reviews:224, specs:{}, desc:'' },
  { img:'/products/225.jpg', name:'Darigold FIT High Protein 2% Low Fat Milk 12-Pack - 14oz, 25g Protein', price:29.88, sold:705, cat:'食品', rating:4.3, reviews:225, specs:{}, desc:'' },
  { img:'/products/226.jpg', name:'Horizon Organic LF Milk 8-Pack - 1% Lowfat, No Refrigeration, 8oz', price:28.64, sold:708, cat:'食品', rating:4.3, reviews:226, specs:{}, desc:'' },
  { img:'/products/227.jpg', name:'Prairie Farms 1% Shelf Stable Low Fat Milk 27-Pack - 8oz', price:49.99, sold:711, cat:'食品', rating:4.3, reviews:227, specs:{}, desc:'' },
  { img:'/products/228.jpg', name:'Fever-Tree Ginger Beer 24-Pack - Premium Mixer, 5.07oz Cans', price:23.52, sold:714, cat:'食品', rating:4.3, reviews:228, specs:{}, desc:'' },
  { img:'/products/229.jpg', name:'BERO Non-Alcoholic IPA Craft Beer 12-Pack - West Coast + Hazy Variety', price:26.5, sold:717, cat:'食品', rating:4.3, reviews:229, specs:{}, desc:'' },
  { img:'/products/230.jpg', name:'Abstinence Blood Orange Non Alcoholic Aperitif 750ml - Botanical Spirits Alternative', price:27.95, sold:720, cat:'食品', rating:4.3, reviews:230, specs:{}, desc:'' },
  { img:'/products/231.jpg', name:'SKECHERS Hands Free Slip-in Summits High Range - White, Machine Washable', price:53.0, sold:723, cat:'鞋靴', rating:4.3, reviews:231, specs:{}, desc:'' },
  { img:'/products/232.jpg', name:'Skechers Womens DLites Memory Foam Lace-up Sneaker - Black/White', price:57.0, sold:726, cat:'鞋靴', rating:4.3, reviews:232, specs:{}, desc:'' },
  { img:'/products/233.jpg', name:'Rilista Womens Slingback Kitten Heels - Closed Pointed Toe Backless Pumps, White', price:29.99, sold:729, cat:'鞋靴', rating:4.3, reviews:233, specs:{}, desc:'' },
  { img:'/products/234.jpg', name:'SKECHERS Hands Free Slip-in Summits - Black Silver, Leather, Memory Foam', price:69.0, sold:732, cat:'鞋靴', rating:4.3, reviews:234, specs:{}, desc:'' },
  { img:'/products/235.jpg', name:'mysoft Womens High Heels Pumps - Closed Pointed Toe Stiletto 4IN Heels, Black Suede', price:37.99, sold:735, cat:'鞋靴', rating:4.3, reviews:235, specs:{}, desc:'' },
  { img:'/products/236.jpg', name:'Feethit Womens Slip On Walking Shoes - Non Slip Running Sneakers, Sandy', price:43.0, sold:738, cat:'鞋靴', rating:4.3, reviews:236, specs:{}, desc:'' },
  { img:'/products/237.jpg', name:'Women Sport Running Shoes - Fashion Casual Walking Tennis Sneakers, Pink', price:35.0, sold:741, cat:'鞋靴', rating:4.3, reviews:237, specs:{}, desc:'' },
  { img:'/products/238.jpg', name:'Juliet Holy Womens Pumps - Pointed Closed Toe Heels Buckle Ankle Strap, Red', price:37.99, sold:744, cat:'鞋靴', rating:4.3, reviews:238, specs:{}, desc:'' },
  { img:'/products/239.jpg', name:'FRSHANIAH Womens Slip On Walking Shoes - Breathable Sport Sneakers, Beige', price:32.0, sold:747, cat:'鞋靴', rating:4.3, reviews:239, specs:{}, desc:'' },
  { img:'/products/240.jpg', name:'Women Sport Running Shoes - Fashion Athletic Walking Sneakers, Rose Red', price:41.0, sold:750, cat:'鞋靴', rating:4.3, reviews:240, specs:{}, desc:'' },
  { img:'/products/241.jpg', name:'IDIFU IN3 High Heels Pumps - Closed Toe Stiletto Pointed Dress Shoes, White', price:29.99, sold:753, cat:'鞋靴', rating:4.3, reviews:241, specs:{}, desc:'' },
  { img:'/products/242.jpg', name:'DREAM PAIRS Womens Platform Heel Sandals - Open Toe Ankle Strap, Black/Nubuck', price:35.99, sold:756, cat:'鞋靴', rating:4.3, reviews:242, specs:{}, desc:'' },
  { img:'/products/243.jpg', name:'PiePieBuy Womens Lace Up Heeled Sandals - Square Flip Flop High Heels, Beige', price:31.99, sold:759, cat:'鞋靴', rating:4.3, reviews:243, specs:{}, desc:'' },
  { img:'/products/244.jpg', name:'Coutgo Womens Pearl Kitten Heels - Closed Pointed Toe Ankle Strap Satin Pumps, White', price:49.99, sold:762, cat:'鞋靴', rating:4.3, reviews:244, specs:{}, desc:'' },
  { img:'/products/245.jpg', name:'Coutgo Womens Closed Pointed Toe Flower Ankle Strap High Heel Pumps - Pink', price:39.99, sold:765, cat:'鞋靴', rating:4.3, reviews:245, specs:{}, desc:'' },
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

        <div className="flex-1 overflow-y-auto native-scroll" style={{paddingBottom:'100px'}}>
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
    <div className="bg-[#f5f5f5] safe-top flex flex-col page-container" style={{height:'calc(100dvh - 60px)'}}>
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
      <div className="flex-1 overflow-y-auto native-scroll" style={{paddingBottom:'100px'}}>
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
                <button onClick={(e) => { e.stopPropagation(); handleBuy(p); }} className="shrink-0 px-4 py-1.5 rounded-full bg-[#FFD814] text-gray-900 text-[11px] font-bold active:scale-95">进货</button>
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
