/**
 * IP Geolocation — calls ipwhois.app (free HTTPS, no key, 10k req/month).
 * Results cached in-memory to avoid repeated lookups.
 */
const https = require('https');

const cache = new Map();

function isPrivateIp(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('0.')) return true;
  if (ip.startsWith('::ffff:')) return isPrivateIp(ip.replace('::ffff:', ''));
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

    const req = https.get(`https://ipwhois.app/json/${ip}`, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.success) {
            const result = { country: j.country, region: j.region, city: j.city, isp: j.isp, ip: j.ip };
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
  for (const ip of unique) {
    const r = await lookupIp(ip);
    if (r) results[ip] = r;
  }
  return results;
}

module.exports = { lookupIp, lookupIps };
