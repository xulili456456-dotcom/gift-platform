const path = require('path');
const fs = require('fs');
const config = require('../config');

const USE_PG = config.DATABASE_URL && config.DATABASE_URL.startsWith('postgres');

let pgPool = null;
let sqliteDb = null;

// ─── PostgreSQL Impl ───────────────────────────────────────────────
if (USE_PG) {
  var { Pool } = require('pg');

  function getPgPool() {
    if (!pgPool) {
      const connString = config.DATABASE_URL + (config.DATABASE_URL.includes('?') ? '&' : '?') + 'client_encoding=UTF8';
      pgPool = new Pool({
        connectionString: connString,
        ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 5,
        idleTimeoutMillis: 30000,
      });
      pgPool.on('connect', async (client) => {
        await client.query("SET client_encoding TO 'UTF8'");
      });
    }
    return pgPool;
  }

  function toPg(sql, params) {
    if (!params || params.length === 0) return [sql, params];
    let idx = 0;
    const converted = sql.replace(/\?/g, () => '$' + (++idx));
    return [converted, params];
  }

  function toPgInsert(sql) {
    if (/returning\s/i.test(sql)) return sql;
    return sql.replace(/;?\s*$/, '') + ' RETURNING id';
  }
}

// ─── SQLite Impl ───────────────────────────────────────────────────
async function getSqlite() {
  if (!sqliteDb) {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    const dbDir = path.join(__dirname, '..', '..', 'data');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, 'gift_platform.db');
    if (fs.existsSync(dbPath)) {
      const buf = fs.readFileSync(dbPath);
      sqliteDb = new SQL.Database(buf);
    } else {
      sqliteDb = new SQL.Database();
    }
    // Enable WAL mode and foreign keys
    sqliteDb.run('PRAGMA journal_mode=WAL');
    sqliteDb.run('PRAGMA foreign_keys=ON');
  }
  return sqliteDb;
}

function saveSqlite() {
  if (!sqliteDb) return;
  const data = sqliteDb.export();
  const buffer = Buffer.from(data);
  const dbPath = path.join(__dirname, '..', '..', 'data', 'gift_platform.db');
  fs.writeFileSync(dbPath, buffer);
}

// ─── Public API ────────────────────────────────────────────────────

async function getDb() {
  if (USE_PG) {
    const p = getPgPool();
    await p.query('SELECT 1');
    return p;
  }
  return getSqlite();
}

async function closeDb() {
  if (USE_PG) {
    if (pgPool) { await pgPool.end(); pgPool = null; }
  } else {
    if (sqliteDb) { saveSqlite(); sqliteDb.close(); sqliteDb = null; }
  }
}

function saveDb() {
  if (!USE_PG) saveSqlite();
}

async function run(sql, params = []) {
  if (USE_PG) {
    const [s, p] = toPg(sql, params);
    const result = await getPgPool().query(s, p);
    return { changes: result.rowCount ?? 0 };
  }
  const db = await getSqlite();
  db.run(sql, params);
  saveSqlite();
  return { changes: db.getRowsModified() };
}

async function insert(sql, params = []) {
  if (USE_PG) {
    const modified = toPgInsert(sql);
    const [s, p] = toPg(modified, params);
    const result = await getPgPool().query(s, p);
    return { id: result.rows?.[0]?.id ?? null, changes: result.rowCount ?? 0 };
  }
  const db = await getSqlite();
  db.run(sql, params);
  const id = db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] ?? null;
  saveSqlite();
  return { id, changes: db.getRowsModified() };
}

async function all(sql, params = []) {
  if (USE_PG) {
    const [s, p] = toPg(sql, params);
    const result = await getPgPool().query(s, p);
    return result.rows;
  }
  const db = await getSqlite();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function get(sql, params = []) {
  if (USE_PG) {
    const [s, p] = toPg(sql, params);
    const result = await getPgPool().query(s, p);
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  const db = await getSqlite();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

async function exec(sql) {
  if (USE_PG) {
    await getPgPool().query(sql);
    return;
  }
  const db = await getSqlite();
  db.run(sql);
  saveSqlite();
}

module.exports = { getDb, saveDb, closeDb, run, insert, all, get, exec };
