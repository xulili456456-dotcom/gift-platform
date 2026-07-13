const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

let db = null;
let SQL = null;

async function getDb() {
  if (db) return db;

  SQL = await initSqlJs();

  // Ensure data directory exists
  const dataDir = path.dirname(config.DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing database or create new
  if (fs.existsSync(config.DB_PATH)) {
    const buffer = fs.readFileSync(config.DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL-like pragmas (sql.js runs in memory, but we set these anyway)
  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');

  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(config.DB_PATH, buffer);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
    SQL = null;
  }
}

/**
 * Run a query and return all rows as array of objects.
 * For INSERT/UPDATE/DELETE, returns { changes: number, lastInsertRowid: number }.
 */
function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDb();
  return {
    changes: db.getRowsModified(),
  };
}

/**
 * Run INSERT and return the last inserted row ID.
 */
function insert(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid() as id');
  saveDb();
  return {
    id: lastId[0].values[0][0],
    changes: db.getRowsModified(),
  };
}

/**
 * Query all rows matching the SQL query.
 */
function all(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Query a single row, or null if not found.
 */
function get(sql, params = []) {
  const rows = all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute raw SQL (for migrations - multiple statements).
 */
function exec(sql) {
  if (!db) throw new Error('Database not initialized');
  db.exec(sql);
  saveDb();
}

module.exports = { getDb, saveDb, closeDb, run, insert, all, get, exec };
