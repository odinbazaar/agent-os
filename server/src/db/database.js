import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const DB_PATH = join(DATA_DIR, 'agent-os.db');

// Ensure data directory exists
mkdirSync(DATA_DIR, { recursive: true });

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);
  seedDefaults();
}

function seedDefaults() {
  const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();
  if (agentCount.count === 0) {
    const insert = db.prepare(`
      INSERT INTO agents (id, name, type, status, description, config) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const defaultAgents = [
      ['agent-apollo-001', 'Hermes Apollo', 'hermes-apollo', 'idle', 'Advanced voice assistant and interactive audio interaction layer', '{"voice":"en-US","speed":1.0}'],
      ['agent-oracle-001', 'Hermes Oracle', 'hermes-oracle', 'idle', 'Competitor tracking, market data analysis, and strategic monitoring', '{"trackInterval":3600,"maxCompetitors":20}'],
      ['agent-leadgen-001', 'Lead Generator', 'lead-generation', 'idle', 'Automated potential customer detection and listing via APIs', '{"sources":["linkedin","crunchbase"],"dailyLimit":100}'],
      ['agent-delegate-001', 'Delegate Manager', 'delegate', 'idle', 'Automatic delegation of complex tasks to sub-agents', '{"maxSubAgents":5,"timeout":300}'],
      ['agent-video-001', 'Video Agent', 'video-agent', 'idle', 'Video content production workflow manager (max 10 min)', '{"maxDuration":600,"format":"mp4","provider":"higsfield"}'],
      ['agent-seo-001', 'SEO Tracker', 'seo-tracker', 'idle', 'Rank tracking and SEO reporting via DataForSEO', '{"checkInterval":86400,"engine":"google"}'],
    ];

    const insertMany = db.transaction((agents) => {
      for (const a of agents) insert.run(...a);
    });
    insertMany(defaultAgents);

    // Seed activity
    const actInsert = db.prepare(`
      INSERT INTO activity_log (type, title, detail, agent_id) VALUES (?, ?, ?, ?)
    `);
    actInsert.run('system', 'Agent OS Initialized', 'System booted with default agent configurations', null);
    actInsert.run('agent', 'Hermes Apollo Ready', 'Voice assistant agent registered and standing by', 'agent-apollo-001');
    actInsert.run('agent', 'Hermes Oracle Ready', 'Competitor tracking agent registered', 'agent-oracle-001');
    actInsert.run('agent', 'Video Agent Ready', 'Video production workflow agent active', 'agent-video-001');
  }
}

// ── CRUD Helpers ──

export function findAll(table, where = {}, orderBy = 'created_at DESC', limit = 100) {
  const db = getDb();
  const conditions = Object.keys(where).map(k => `${k} = ?`).join(' AND ');
  const sql = `SELECT * FROM ${table}${conditions ? ' WHERE ' + conditions : ''} ORDER BY ${orderBy} LIMIT ${limit}`;
  return db.prepare(sql).all(...Object.values(where));
}

export function findById(table, id) {
  const db = getDb();
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

export function insertRow(table, data) {
  const db = getDb();
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  return db.prepare(sql).run(...Object.values(data));
}

const tableColumnCache = new Map();

function getTableColumns(table) {
  if (!tableColumnCache.has(table)) {
    const cols = getDb().prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    tableColumnCache.set(table, cols);
  }
  return tableColumnCache.get(table);
}

export function updateRow(table, id, data) {
  const db = getDb();
  const keys = Object.keys(data);
  const sets = keys.map(k => `${k} = ?`);

  // Only tables that actually have the column get an automatic timestamp bump
  if (getTableColumns(table).includes('updated_at') && !keys.includes('updated_at')) {
    sets.push(`updated_at = datetime('now')`);
  }

  const sql = `UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`;
  return db.prepare(sql).run(...Object.values(data), id);
}

export function deleteRow(table, id) {
  const db = getDb();
  return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

export function query(sql, params = []) {
  const db = getDb();
  return db.prepare(sql).all(...params);
}

export function run(sql, params = []) {
  const db = getDb();
  return db.prepare(sql).run(...params);
}
