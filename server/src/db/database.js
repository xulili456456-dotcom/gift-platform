const { Pool } = require('pg');
const config = require('../config');

let pool = null;

/**
 * Convert SQLite-style ? placeholders to PostgreSQL $1, $2, $3...
 */
let _placeholderIdx = 0;
function toPg(sql, params) {
  if (!params || params.length === 0) return [sql, params];
  let idx = 0;
  const converted = sql.replace(/\?/g, () => {
    idx++;
    return '$' + idx;
  });
  return [converted, params];
}

function toPgInsert(sql) {
  // Append RETURNING id — but skip if already present or for ON CONFLICT
  if (/returning\s/i.test(sql)) return sql;
  return sql.replace(/;?\s*$/, '') + ' RETURNING id';
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

async function getDb() {
  const p = getPool();
  await p.query('SELECT 1');
  return p;
}

async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

function saveDb() {
  // no-op: PostgreSQL persists automatically
}

/**
 * Execute INSERT/UPDATE/DELETE. Returns { changes: number }.
 */
async function run(sql, params = []) {
  const [s, p] = toPg(sql, params);
  const result = await getPool().query(s, p);
  return { changes: result.rowCount ?? 0 };
}

/**
 * Execute INSERT and return { id, changes }.
 * Automatically appends RETURNING id to get the inserted row ID.
 */
async function insert(sql, params = []) {
  const modified = toPgInsert(sql);
  const [s, p] = toPg(modified, params);
  const result = await getPool().query(s, p);
  const id = result.rows?.[0]?.id ?? null;
  return { id, changes: result.rowCount ?? 0 };
}

/**
 * Query all rows as array of objects.
 */
async function all(sql, params = []) {
  const [s, p] = toPg(sql, params);
  const result = await getPool().query(s, p);
  return result.rows;
}

/**
 * Query a single row, or null if not found.
 */
async function get(sql, params = []) {
  const [s, p] = toPg(sql, params);
  const result = await getPool().query(s, p);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Execute raw SQL (for migrations — multi-statement blocks).
 * pg runs each statement separately via the simple query protocol.
 */
async function exec(sql) {
  await getPool().query(sql);
}

module.exports = { getDb, saveDb, closeDb, run, insert, all, get, exec };
