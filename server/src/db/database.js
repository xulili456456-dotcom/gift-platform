// MUST be first: force UTF-8 before pg module reads env
process.env.PGCLIENTENCODING = 'UTF8';

const { Pool, types } = require('pg');
const config = require('../config');

// Fix: NUMERIC columns return JS numbers instead of strings
types.setTypeParser(1700, parseFloat);

let pool = null;

/**
 * Convert SQLite-style ? placeholders to PostgreSQL $1, $2, $3...
 */
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
    // Fire-and-forget SET on each new connection
    pool.on('connect', (client) => {
      client.query("SET client_encoding TO 'UTF8'").catch(() => {});
    });
    pool.on('error', (err) => {
      console.error('PG Pool error:', err.message);
    });
  }
  return pool;
}

// Wrapped query that ensures UTF-8 on the SAME connection as the query
async function query(s, p) {
  const client = await getPool().connect();
  try {
    await client.query("SET client_encoding TO 'UTF8'");
    const result = await client.query(s, p);
    return result;
  } finally {
    client.release();
  }
}

async function getDb() {
  const p = getPool();
  await p.query("SET client_encoding TO 'UTF8'");
  await p.query('SELECT 1');
  return p;
}

async function closeDb() {
  if (pool) { await pool.end(); pool = null; }
}

function saveDb() {
  // no-op: PostgreSQL persists automatically
}

async function run(sql, params = []) {
  const [s, p] = toPg(sql, params);
  const result = await query(s, p);
  return { changes: result.rowCount ?? 0 };
}

async function insert(sql, params = []) {
  const modified = toPgInsert(sql);
  const [s, p] = toPg(modified, params);
  const result = await query(s, p);
  const id = result.rows?.[0]?.id ?? null;
  return { id, changes: result.rowCount ?? 0 };
}

async function all(sql, params = []) {
  const [s, p] = toPg(sql, params);
  const result = await query(s, p);
  return result.rows;
}

async function get(sql, params = []) {
  const [s, p] = toPg(sql, params);
  const result = await query(s, p);
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function exec(sql) {
  await getPool().query("SET client_encoding TO 'UTF8'").catch(() => {});
  await getPool().query(sql);
}

async function tx() {
  const client = await getPool().connect();
  await client.query("SET client_encoding TO 'UTF8'");
  await client.query('BEGIN');

  const txRun = async (sql, params = []) => {
    const [s, p] = toPg(sql, params);
    const result = await client.query(s, p);
    return { changes: result.rowCount ?? 0 };
  };
  const txInsert = async (sql, params = []) => {
    const modified = toPgInsert(sql);
    const [s, p] = toPg(modified, params);
    const result = await client.query(s, p);
    return { id: result.rows?.[0]?.id ?? null, changes: result.rowCount ?? 0 };
  };
  const txAll = async (sql, params = []) => {
    const [s, p] = toPg(sql, params);
    const result = await client.query(s, p);
    return result.rows;
  };
  const txGet = async (sql, params = []) => {
    const [s, p] = toPg(sql, params);
    const result = await client.query(s, p);
    return result.rows.length > 0 ? result.rows[0] : null;
  };
  const commit = async () => {
    try { await client.query('COMMIT'); } finally { client.release(); }
  };
  const rollback = async () => {
    try { await client.query('ROLLBACK'); } finally { client.release(); }
  };

  return { run: txRun, insert: txInsert, all: txAll, get: txGet, commit, rollback };
}

module.exports = { getDb, saveDb, closeDb, run, insert, all, get, exec, tx };
