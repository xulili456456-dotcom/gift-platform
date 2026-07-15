const fs = require('fs');
const f = 'C:/Users/king/Desktop/kkk/gift-platform/client/src/pages/StorePage.jsx';
let c = fs.readFileSync(f, 'utf8');

const start = c.indexOf('const PRODUCTS = [');
const end = c.indexOf('];', start) + 2;
const before = c.substring(0, start);
let prods = c.substring(start, end);
const after = c.substring(end);

// Comprehensive remaining Chinese → English map for spec values
const map = [
  ['卡扣式', 'Clamp-On'], ['双区独立', 'Dual-Zone Independent'], ['外置可拆卸', 'External Removable'],
  ['聚碳酸酯碗', 'Polycarbonate Bowl'], ['切割盘', 'Cutting Discs'], ['自检测技术', 'Self-Detect Technology'],
  ['红绿灯+测速', 'Red Light + Speed Cam'], ['语音+红绿灯+测速', 'Voice + Red Light + Speed Cam'],
  ['360°激光/雷达', '360° Laser/Radar'], ['GPS实时警报', 'GPS Real-Time Alerts'],
  ['气象警报', 'Weather Alerts'], ['方向箭头', 'Directional Arrows'],
  ['SDR软件定义无线电', 'SDR Software Defined Radio'], ['内置GPS', 'Built-in GPS'],
  ['不锈钢杆', 'Stainless Steel Pole'], ['树脂', 'Resin'],
  ['红外自动', 'Infrared Automatic'], ['5档可调', '5 Adjustable Levels'],
  ['最高500°F', 'Max 500°F'], ['微波炉/烤箱/冷冻/洗碗机', 'Microwave/Oven/Freezer/Dishwasher'],
  ['100+模式', '100+ Modes'], ['120+模式', '120+ Modes'], ['多模式', 'Multi-Mode'],
  ['手机GPS', 'Phone GPS'], ['通话/Heart Rate/睡眠/SpO2', 'Call/HR/Sleep/SpO2'],
  ['通话/Heart Rate/睡眠/血压', 'Call/HR/Sleep/BP'], ['通话/Heart Rate/运动', 'Call/HR/Sport'],
  ['Alexa/通话/Heart Rate/SpO2/睡眠', 'Alexa/Call/HR/SpO2/Sleep'],
  ['增压模式', 'Boost Mode'], ['App远程', 'App Remote'],
  ['LiDAR+IMU双导航', 'LiDAR+IMU Dual Nav'], ['LiDAR激光', 'LiDAR Laser'],
  ['吸拖一体', 'Vacuum & Mop'], ['自动集尘', 'Auto-Empty'],
  ['360°翻转触屏', '360° Flip Touch'],
  ['WiFi 6E 无线', 'WiFi 6E Wireless'], ['Vari-Angle翻转屏', 'Vari-Angle Flip Screen'],
  ['5轴机身防抖', '5-Axis IBIS'], ['5轴IBIS 7.5档', '5-Axis 7.5-Stop IBIS'],
  ['AI智能对焦', 'AI Auto Focus'], ['759点相位检测', '759-Point Phase AF'],
  ['3D空间音频', '3D Spatial Audio'], ['6扬声器 空间音频', '6-Speaker Spatial Audio'],
  ['48MP三摄', '48MP Triple Camera'], ['AI α11 Gen2', 'AI α11 Gen2'],
  ['100+游戏 + 3月Meta Horizon+', '100+ Games + 3mo Horizon+'],
  ['4路独立', '4 Independent Banks'], ['6V/12V自动', '6V/12V Auto'],
  ['12AWGWiring Harness+开关', '12AWG Harness + Switch'],
  ['52in弧形', '52" Curved'], ['6in椭圆', '6" Oval'],
  ['2.9L聚碳酸酯碗', '2.9L Polycarbonate Bowl'], ['1HP 1000W', '1HP 1000W'],
  ['连续进料', 'Continuous Feed'], ['Titan C2芯片', 'Titan C2 Chip'],
  ['48oz搅拌杯 + 12杯处理器', '48oz Jar + 12-Cup Processor'],
  ['Foam Cannon/桶/毛巾/蜡/清洁剂', 'Foam Cannon/Bucket/Towels/Wax/Cleaners'],
  ['轮毂/玻璃/内饰', 'Wheels/Glass/Interior'], ['Hifi/游戏/TF卡/AUX', 'HiFi/Gaming/TF Card/AUX'],
  ['硅胶+木柄', 'Silicone + Wood Handle'], ['扫把+簸箕套装', 'Broom + Dustpan Set'],
  ['Anti-Rust Metal+塑料', 'Anti-Rust Metal + Plastic'],
  ['Aluminum Alloy+PVC涂层织物', 'Aluminum Alloy + PVC Fabric'],
  ['PETBristles+Stainless Steel杆', 'PET Bristles + Stainless Steel Pole'],
  ['60W x2', '60W x2'], ['4in', '4"'],
  ['3.8槽 4风扇 均热板', '3.8-Slot Quad Fan Vapor Chamber'],
  ['双面可用/汁槽/手柄', 'Reversible / Juice Grooves / Handle'],
  ['煎锅+汤锅+炒锅+汤锅', 'Fry Pan + Stockpot + Saute + Saucepan'],
  ['2块延长续航', '2 Extended Batteries'], ['80只', '80 Count'],
  ['电磁炉/烤箱', 'Induction / Oven'], ['过充/短路', 'Overcharge / Short Circuit'],
  ['Fabuloso薰衣草', 'Fabuloso Lavender'], ['不粘锅', 'Non-Stick Pans'],
  ['19.2-26.7in可Extendable', '19.2-26.7" Extendable'],
  ['2024-2026 Tacoma 5尺货箱', '2024-2026 Tacoma 5ft Bed'],
  ['RV/卡车/拖车/吉普', 'RV/Truck/Trailer/Jeep'],
  ['汽车/卡车/SUV', 'Car/Truck/SUV'], ['足球/篮球', 'Soccer/Basketball'],
  ['50预设', '50 Presets'], ['3年', '3 Year'],
  ['不粘', 'Non-Stick'], ['可调火焰', 'Adjustable Flame'],
  ['安全锁', 'Safety Lock'], ['玻璃', 'Glass'],
  ['木质支架', 'Wood Stand'], ['木质手柄', 'Wooden Handles'],
  ['台面式', 'Countertop'], ['车位', 'Vehicle'],
  ['室内/室外', 'Indoor/Outdoor'], ['美国', 'USA'],
  ['f/2.0-f/4.0可变', 'f/2.0-f/4.0 Variable'], ['GPS实时警报', 'GPS Alerts'],
  ['可更换Stainless Steel', 'Replaceable Stainless Steel'],
  ['卡扣式', 'Clamp-On'], ['双区独立', 'Dual-Zone'],
  ['支持', 'Supported'], ['红外自动', 'Infrared Auto'],
  ['自动跟踪', 'Auto Tracking'], ['自检测技术', 'Self-Detect'],
  ['自清洁', 'Self-Cleaning'], ['GM质保', 'GM Warranty'],
  ['PVC涂层', 'PVC Coating'], ['防锈金属', 'Anti-Rust Metal'],
  ['弹力绳', 'Bungee'], ['系带', 'Lace-Up'],
  ['透气', 'Breathable'], ['标准花园水管', 'Standard Garden Hose'],
  ['台式/移动', 'Desktop/Mobile'], ['女生', 'Womens'],
  ['男生', 'Mens'], ['儿童', 'Kids'],
];

// Apply translations within the products section
for (const [zh, en] of map) {
  prods = prods.replaceAll(zh, en);
}

// Check remaining Chinese
const remaining = [...new Set(prods.match(/'[^']*[一-鿿][^']*'/g) || [])];
console.log('Remaining unique Chinese strings:', remaining.length);
remaining.forEach(r => console.log(' ', r));

const result = before + prods + after;
fs.writeFileSync(f, result);
console.log('Done');
