/**
 * IP Geolocation via api.ip.sb (free HTTPS, returns Chinese names natively).
 * Results cached in-memory.
 */
const https = require('https');

const cache = new Map();

const zh = {
  'United States': '美国', 'United Kingdom': '英国', 'Canada': '加拿大', 'Australia': '澳大利亚',
  'Japan': '日本', 'South Korea': '韩国', 'China': '中国', 'Taiwan': '台湾', 'Hong Kong': '香港',
  'Singapore': '新加坡', 'Malaysia': '马来西亚', 'Thailand': '泰国', 'Vietnam': '越南',
  'Philippines': '菲律宾', 'Indonesia': '印度尼西亚', 'India': '印度',
  'Germany': '德国', 'France': '法国', 'Italy': '意大利', 'Spain': '西班牙',
  'Netherlands': '荷兰', 'Switzerland': '瑞士', 'Sweden': '瑞典', 'Norway': '挪威',
  'Russia': '俄罗斯', 'Brazil': '巴西', 'Mexico': '墨西哥', 'Argentina': '阿根廷',
  'United Arab Emirates': '阿联酋', 'Saudi Arabia': '沙特阿拉伯', 'Turkey': '土耳其',
  'New Zealand': '新西兰', 'Ireland': '爱尔兰', 'Poland': '波兰', 'Portugal': '葡萄牙',
  'Denmark': '丹麦', 'Finland': '芬兰', 'Greece': '希腊', 'South Africa': '南非',
  'Egypt': '埃及', 'Israel': '以色列', 'Pakistan': '巴基斯坦', 'Nigeria': '尼日利亚',
  'Colombia': '哥伦比亚', 'Chile': '智利', 'Peru': '秘鲁',
  'Washington': '华盛顿州', 'California': '加利福尼亚', 'Texas': '德克萨斯', 'New York': '纽约州',
  'Florida': '佛罗里达', 'Virginia': '弗吉尼亚', 'Illinois': '伊利诺伊',
  'Massachusetts': '马萨诸塞', 'Pennsylvania': '宾夕法尼亚', 'Ohio': '俄亥俄',
  'Georgia': '佐治亚', 'North Carolina': '北卡', 'Michigan': '密歇根',
  'New Jersey': '新泽西', 'Arizona': '亚利桑那', 'Colorado': '科罗拉多',
  'Oregon': '俄勒冈', 'Nevada': '内华达', 'Missouri': '密苏里', 'Utah': '犹他',
  'Santiago del Estero': '圣地亚哥-德尔埃斯特罗省',
  'Liberty Lake': '自由湖', 'Spokane': '斯波坎', 'San Jose': '圣何塞', 'San Francisco': '旧金山',
  'Los Angeles': '洛杉矶', 'Chicago': '芝加哥', 'Seattle': '西雅图', 'Miami': '迈阿密',
  'Dallas': '达拉斯', 'Houston': '休斯顿', 'Atlanta': '亚特兰大', 'Boston': '波士顿',
  'Denver': '丹佛', 'Portland': '波特兰', 'Las Vegas': '拉斯维加斯', 'Ashburn': '阿什本',
  'Sao Paulo': '圣保罗', 'Mexico City': '墨西哥城', 'Buenos Aires': '布宜诺斯艾利斯',
  'Dubai': '迪拜', 'Istanbul': '伊斯坦布尔', 'Amsterdam': '阿姆斯特丹',
  'Sydney': '悉尼', 'Toronto': '多伦多', 'Vancouver': '温哥华',
  'Manila': '马尼拉', 'Jakarta': '雅加达', 'Kuala Lumpur': '吉隆坡', 'Bangkok': '曼谷',
  'Seoul': '首尔', 'Tokyo': '东京', 'Moscow': '莫斯科', 'Berlin': '柏林', 'Paris': '巴黎',
  'Madrid': '马德里', 'London': '伦敦', 'Dublin': '都柏林', 'Stockholm': '斯德哥尔摩',
};

function tr(s) { return s && zh[s] ? zh[s] : s || ''; }

function isPrivateIp(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('0.')) return true;
  if (ip.startsWith('::ffff:')) return isPrivateIp(ip.replace('::ffff:', ''));
  if (ip.startsWith('172.')) {
    const second = parseInt(ip.split('.')[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function doGet(url, timeout) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { reject(new Error('parse')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeout || 5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function lookupIp(ip) {
  return new Promise((resolve) => {
    if (isPrivateIp(ip)) return resolve(null);
    if (cache.has(ip)) return resolve(cache.get(ip));

    doGet(`https://api.ip.sb/geoip/${ip}`, 5000).then(j => {
      const result = {
        country: tr(j.country),
        region: tr(j.region),
        city: tr(j.city),
        isp: j.organization || j.isp || '',
        ip: j.ip || ip,
      };
      cache.set(ip, result);
      resolve(result);
    }).catch(() => { resolve(null); });
  });
}

async function lookupIps(ips) {
  const unique = [...new Set(ips.filter(Boolean))];
  const results = {};
  for (const ip of unique) {
    const r = await lookupIp(ip);
    if (r) results[ip] = r;
  }
  return results;
}

module.exports = { lookupIp, lookupIps };
