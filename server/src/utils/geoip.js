/**
 * IP Geolocation — calls ip-api.com (free, no key, 45 req/min).
 * Results cached in-memory to avoid repeated lookups.
 */
const http = require('http');

const cache = new Map();

// Only filter truly private/local IPs, not public 172.x.x.x ranges
function isPrivateIp(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('0.')) return true;
  if (ip.startsWith('::ffff:')) return isPrivateIp(ip.replace('::ffff:', ''));
  // 172.16.0.0 - 172.31.255.255 are private
  if (ip.startsWith('172.')) {
    const second = parseInt(ip.split('.')[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function lookupIp(ip) {
  return new Promise((resolve) => {
    if (isPrivateIp(ip)) return resolve(null);
    if (cache.has(ip)) return resolve(cache.get(ip));

    const req = http.get(`http://ip-api.com/json/${ip}?fields=country,regionName,city,isp,query`, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.status === 'success') {
            const result = { country: j.country, region: j.regionName, city: j.city, isp: j.isp, ip: j.query };
            cache.set(ip, result);
            resolve(result);
          } else {
            cache.set(ip, null);
            resolve(null);
          }
        } catch { cache.set(ip, null); resolve(null); }
      });
    });
    req.on('error', () => { resolve(null); });
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

async function lookupIps(ips) {
  const unique = [...new Set(ips.filter(Boolean))];
  const results = {};
  // Sequential to respect rate limits (45/min = ~1.3s apart, but burst is fine for small batches)
  for (const ip of unique) {
    const r = await lookupIp(ip);
    if (r) results[ip] = r;
  }
  return results;
}

module.exports = { lookupIp, lookupIps };
