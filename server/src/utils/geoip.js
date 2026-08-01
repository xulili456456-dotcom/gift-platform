/**
 * IP Geolocation via api.ip.sb (free HTTPS, returns Chinese names natively).
 * Results cached in-memory.
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
        country: j.country || '',
        region: j.region || '',
        city: j.city || '',
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
