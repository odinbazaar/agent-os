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
  runMigrations();
  seedDefaults();
  localizeDefaults();
}

// schema.sql only uses CREATE TABLE IF NOT EXISTS, so columns added later never
// reach databases that already exist. Add them here instead.
function runMigrations() {
  addColumnIfMissing('seo_keywords', 'target_domain', 'TEXT DEFAULT NULL');
}

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!columns.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`✓ Migration: ${table}.${column} eklendi`);
  }
}

// Default agents, keyed by id. Also used to localize databases that were
// seeded before the panel was translated.
const DEFAULT_DESCRIPTIONS = {
  'agent-apollo-001': 'Gelişmiş sesli asistan ve etkileşimli ses katmanı',
  'agent-oracle-001': 'Rakip takibi, pazar verisi analizi ve stratejik izleme',
  'agent-leadgen-001': 'API tabanlı otomatik potansiyel müşteri tespiti ve listeleme',
  'agent-delegate-001': 'Karmaşık görevlerin alt ajanlara otomatik dağıtımı',
  'agent-video-001': 'Video içerik üretim akışı yöneticisi (en fazla 10 dk)',
  'agent-seo-001': 'DataForSEO ile sıra takibi ve SEO raporlama',
};

const LEGACY_NAMES = {
  'agent-leadgen-001': ['Lead Generator', 'Müşteri Adayı Üretici'],
  'agent-delegate-001': ['Delegate Manager', 'Görev Dağıtıcı'],
  'agent-video-001': ['Video Agent', 'Video Ajanı'],
  'agent-seo-001': ['SEO Tracker', 'SEO Takipçisi'],
};

const LEGACY_DESCRIPTIONS = {
  'agent-apollo-001': 'Advanced voice assistant and interactive audio interaction layer',
  'agent-oracle-001': 'Competitor tracking, market data analysis, and strategic monitoring',
  'agent-leadgen-001': 'Automated potential customer detection and listing via APIs',
  'agent-delegate-001': 'Automatic delegation of complex tasks to sub-agents',
  'agent-video-001': 'Video content production workflow manager (max 10 min)',
  'agent-seo-001': 'Rank tracking and SEO reporting via DataForSEO',
};

// Existing installations were seeded in English. Replace those rows with the
// Turkish text, but only where the value is still the untouched default — an
// agent the user renamed or re-described is left alone.
function localizeDefaults() {
  const updateDesc = db.prepare('UPDATE agents SET description = ? WHERE id = ? AND description = ?');
  const updateName = db.prepare('UPDATE agents SET name = ? WHERE id = ? AND name = ?');

  db.transaction(() => {
    for (const [id, english] of Object.entries(LEGACY_DESCRIPTIONS)) {
      updateDesc.run(DEFAULT_DESCRIPTIONS[id], id, english);
    }
    for (const [id, [english, turkish]] of Object.entries(LEGACY_NAMES)) {
      updateName.run(turkish, id, english);
    }
  })();
}

function seedDefaults() {
  const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();
  if (agentCount.count === 0) {
    const insert = db.prepare(`
      INSERT INTO agents (id, name, type, status, description, config) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const defaultAgents = [
      ['agent-apollo-001', 'Hermes Apollo', 'hermes-apollo', 'idle', DEFAULT_DESCRIPTIONS['agent-apollo-001'], '{"voice":"tr-TR","speed":1.0}'],
      ['agent-oracle-001', 'Hermes Oracle', 'hermes-oracle', 'idle', DEFAULT_DESCRIPTIONS['agent-oracle-001'], '{"trackInterval":3600,"maxCompetitors":20}'],
      ['agent-leadgen-001', 'Müşteri Adayı Üretici', 'lead-generation', 'idle', DEFAULT_DESCRIPTIONS['agent-leadgen-001'], '{"sources":["linkedin","crunchbase"],"dailyLimit":100}'],
      ['agent-delegate-001', 'Görev Dağıtıcı', 'delegate', 'idle', DEFAULT_DESCRIPTIONS['agent-delegate-001'], '{"maxSubAgents":5,"timeout":300}'],
      ['agent-video-001', 'Video Ajanı', 'video-agent', 'idle', DEFAULT_DESCRIPTIONS['agent-video-001'], '{"maxDuration":600,"format":"mp4","provider":"higsfield"}'],
      ['agent-seo-001', 'SEO Takipçisi', 'seo-tracker', 'idle', DEFAULT_DESCRIPTIONS['agent-seo-001'], '{"checkInterval":86400,"engine":"google"}'],
    ];

    const insertMany = db.transaction((agents) => {
      for (const a of agents) insert.run(...a);
    });
    insertMany(defaultAgents);

    // Seed activity
    const actInsert = db.prepare(`
      INSERT INTO activity_log (type, title, detail, agent_id) VALUES (?, ?, ?, ?)
    `);
    actInsert.run('system', 'Agent OS Başlatıldı', 'Sistem varsayılan ajan yapılandırmalarıyla açıldı', null);
    actInsert.run('agent', 'Hermes Apollo Hazır', 'Sesli asistan ajanı kaydedildi ve beklemede', 'agent-apollo-001');
    actInsert.run('agent', 'Hermes Oracle Hazır', 'Rakip takip ajanı kaydedildi', 'agent-oracle-001');
    actInsert.run('agent', 'Video Ajanı Hazır', 'Video üretim akışı ajanı aktif', 'agent-video-001');
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
