/**
 * 模拟验证三个安全修复
 * 运行: cd server && node test-fixes.js
 */

let passed = 0, failed = 0;
function check(label, condition, detail) {
  if (condition) { console.log('  ✅ ' + label); passed++; }
  else { console.log('  ❌ ' + label); if (detail) console.log('     细节: ' + detail); failed++; }
}

console.log('═══════════════════════════════════════════');
console.log('  验证三个安全修复');
console.log('═══════════════════════════════════════════\n');

// =====================================================
//  修复 #1 — CORS 白名单
// =====================================================
console.log('━'.repeat(50));
console.log('修复 #1: CORS 白名单');
console.log('━'.repeat(50));

const config = require('./src/config');

check('CORS_ORIGIN 不再是 true (全开)', config.CORS_ORIGIN !== true);
check('CORS_ORIGIN 是数组', Array.isArray(config.CORS_ORIGIN));

['https://www.shopeetrade.com', 'https://gift-platform-h6um.onrender.com',
 'http://localhost:5173'].forEach(o => check('白名单包含 ' + o, config.CORS_ORIGIN.includes(o)));

['https://evil.com', 'https://hacker.cn'].forEach(o =>
  check('白名单不含 ' + o, !config.CORS_ORIGIN.includes(o)));

// 环境变量覆盖
const origCORS = process.env.CORS_ORIGIN;
process.env.CORS_ORIGIN = 'https://custom.com';
delete require.cache[require.resolve('./src/config')];
check('支持 CORS_ORIGIN 环境变量覆盖',
  require('./src/config').CORS_ORIGIN.includes('https://custom.com'));
process.env.CORS_ORIGIN = origCORS;

// =====================================================
//  修复 #2 — JWT Secret 不再硬编码
// =====================================================
console.log('\n' + '━'.repeat(50));
console.log('修复 #2: JWT Secret 不再硬编码');
console.log('━'.repeat(50));

delete require.cache[require.resolve('./src/config')];
process.env.JWT_SECRET = 'test-secret-key-with-32-plus-characters!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-also-32-plus-chars!!';
const cfg = require('./src/config');

const HARDCODED = 'gift-platform-secret-change-in-production-2024';

check('JWT_SECRET 使用环境变量值', cfg.JWT_SECRET === process.env.JWT_SECRET);
check('JWT_REFRESH_SECRET 使用环境变量值', cfg.JWT_REFRESH_SECRET === process.env.JWT_REFRESH_SECRET);
check('JWT_SECRET 不是硬编码值', cfg.JWT_SECRET !== HARDCODED);
check('JWT_REFRESH_SECRET 不是硬编码值', cfg.JWT_REFRESH_SECRET !== 'gift-platform-refresh-secret-change-2024');
check('JWT_SECRET 长度 ≥ 32', cfg.JWT_SECRET.length >= 32, '长度: ' + cfg.JWT_SECRET.length);
check('JWT_REFRESH_SECRET 长度 ≥ 32', cfg.JWT_REFRESH_SECRET.length >= 32);

// 未设时自动生成
delete require.cache[require.resolve('./src/config')];
delete process.env.JWT_SECRET; delete process.env.JWT_REFRESH_SECRET;
const cfg2 = require('./src/config');
check('未设时不崩溃', typeof cfg2.JWT_SECRET === 'string');
check('自动生成 ≥ 128 字符', cfg2.JWT_SECRET.length >= 128, '长度: ' + cfg2.JWT_SECRET.length);

// 随机性
delete require.cache[require.resolve('./src/config')];
const a = require('./src/config').JWT_SECRET;
delete require.cache[require.resolve('./src/config')];
const b = require('./src/config').JWT_SECRET;
check('两次生成的 Secret 不同', a !== b);

// 恢复
process.env.JWT_SECRET = 'test-secret-key-with-32-plus-characters!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-also-32-plus-chars!!';
delete require.cache[require.resolve('./src/config')];

// =====================================================
//  修复 #3 — 冻结用户拦截
// =====================================================
console.log('\n' + '━'.repeat(50));
console.log('修复 #3: 冻结用户拦截');
console.log('━'.repeat(50));

const authMod = require('./src/middleware/auth');
check('authMiddleware 是函数', typeof authMod === 'function');
check('authMiddleware 是 async', authMod.constructor.name === 'AsyncFunction');

// 关键函数：mock DB → 重新加载 auth → 执行请求
const dbPath = require.resolve('./src/db/database');
const authPath = require.resolve('./src/middleware/auth');
const db = require(dbPath);
const JWT = require('jsonwebtoken');
const cfg3 = require('./src/config');
const TOKEN = JWT.sign({ id: 99999, email: 't@t.com', is_admin: false },
  cfg3.JWT_SECRET, { expiresIn: '1h' });
const EXPIRED = JWT.sign({ id: 99999, email: 't@t.com', is_admin: false },
  cfg3.JWT_SECRET, { expiresIn: '0s' });

function mockDB(returnFn) {
  db.get = returnFn;
  delete require.cache[authPath];
  return require(authPath);
}

function fakeRes() {
  let r = null;
  return {
    res: {
      status: c => ({ json: d => { r = { code: c, data: d }; } }),
      json: d => { r = { code: 200, data: d }; },
    },
    next: () => { r = { code: 'NEXT', data: null }; },
    getResult: () => r,
  };
}

(async () => {

// 3a — 正常用户通过
let { res, next, getResult } = fakeRes();
let auth = mockDB(async () => ({ id: 99999, frozen: false, is_active: true }));
await auth({ headers: { authorization: 'Bearer ' + TOKEN } }, res, next);
check('正常用户 → next()', getResult().code === 'NEXT',
  '实际: ' + JSON.stringify(getResult()));

// 3b — 冻结用户拦截
({ res, next, getResult } = fakeRes());
auth = mockDB(async () => ({ id: 99999, frozen: true, is_active: true }));
await auth({ headers: { authorization: 'Bearer ' + TOKEN } }, res, next);
check('冻结用户 → 403', getResult().code === 403, '实际: ' + JSON.stringify(getResult()));
check('返回 ACCOUNT_FROZEN',
  getResult().data && getResult().data.code === 'ACCOUNT_FROZEN',
  '实际 code: ' + getResult().data?.code);

// 3c — 未激活拦截
({ res, next, getResult } = fakeRes());
auth = mockDB(async () => ({ id: 99999, frozen: false, is_active: false }));
await auth({ headers: { authorization: 'Bearer ' + TOKEN } }, res, next);
check('未激活 → 403', getResult().code === 403, '实际: ' + JSON.stringify(getResult()));
check('返回 ACCOUNT_INACTIVE',
  getResult().data && getResult().data.code === 'ACCOUNT_INACTIVE',
  '实际 code: ' + getResult().data?.code);

// 3d — DB 故障降级放行
({ res, next, getResult } = fakeRes());
auth = mockDB(async () => { throw new Error('DB connection lost'); });
await auth({ headers: { authorization: 'Bearer ' + TOKEN } }, res, next);
check('DB 故障 → 降级放行', getResult().code === 'NEXT',
  '实际: ' + JSON.stringify(getResult()));

// 3e — 无 Token
({ res, next, getResult } = fakeRes());
auth = mockDB(async () => ({ id: 99999, frozen: false, is_active: true }));
await auth({ headers: {} }, res, next);
check('无 Token → 401', getResult().code === 401);

// 3f — 过期 Token
({ res, next, getResult } = fakeRes());
auth = mockDB(async () => ({ id: 99999, frozen: false, is_active: true }));
await auth({ headers: { authorization: 'Bearer ' + EXPIRED } }, res, next);
check('过期 Token → 401 + TOKEN_EXPIRED',
  getResult().code === 401 && getResult().data?.code === 'TOKEN_EXPIRED');

// 3g — 用户不存在
({ res, next, getResult } = fakeRes());
auth = mockDB(async () => null);
await auth({ headers: { authorization: 'Bearer ' + TOKEN } }, res, next);
check('用户不存在 → 401', getResult().code === 401);

// 3h — 错误 Token 格式
({ res, next, getResult } = fakeRes());
auth = mockDB(async () => ({ id: 99999, frozen: false, is_active: true }));
await auth({ headers: { authorization: 'Bearer bad.token.here' } }, res, next);
check('错误 Token → 401', getResult().code === 401);

// 恢复 DB
delete require.cache[authPath];
db.get = require(dbPath).get;

// =====================================================
//  结果
// =====================================================
console.log('\n' + '═'.repeat(50));
const total = passed + failed;
console.log('  结果: ' + passed + ' / ' + total + ' 通过');
if (failed > 0) {
  console.log('  ❌ ' + failed + ' 个失败');
  process.exit(1);
} else {
  console.log('  ✅ 全部 ' + total + ' 个测试通过，三个修复验证成功');
}
console.log('═'.repeat(50));

})();
