import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

export interface DbInterface {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: any[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    all(...params: any[]): any[];
    get(...params: any[]): any;
  };
}

let dbInstance: DbInterface | null = null;

export function getDatabase(): DbInterface {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'router.db');

  try {
    const sqliteDb = new DatabaseSync(dbPath);
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    sqliteDb.exec('PRAGMA synchronous = NORMAL;');
    dbInstance = sqliteDb as unknown as DbInterface;
    initTables(dbInstance);
    return dbInstance;
  } catch (err) {
    console.warn('[DB] Error opening native sqlite, using file JSON storage:', err);
    dbInstance = createFallbackDb(path.join(dataDir, 'router-fallback.json'));
    initTables(dbInstance);
    return dbInstance;
  }
}

function initTables(db: DbInterface) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password_hash TEXT,
      password_salt TEXT,
      email TEXT,
      name TEXT,
      avatar TEXT,
      created_at TEXT
    );
  `);

  // Migrate existing users table if columns are missing
  try { db.exec('ALTER TABLE users ADD COLUMN username TEXT;'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT;'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN password_salt TEXT;'); } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS gmail_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT UNIQUE,
      name TEXT,
      is_primary INTEGER DEFAULT 0,
      avatar_color TEXT,
      added_at TEXT
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      provider TEXT,
      label TEXT,
      masked_key TEXT,
      encrypted_key TEXT,
      gmail_tag TEXT,
      status TEXT DEFAULT 'active',
      priority INTEGER DEFAULT 1,
      total_requests INTEGER DEFAULT 0,
      tokens_used INTEGER DEFAULT 0,
      last_latency_ms INTEGER DEFAULT 0,
      last_used_at TEXT,
      created_at TEXT,
      enabled INTEGER DEFAULT 1,
      custom_base_url TEXT,
      custom_auth_header TEXT,
      cooldown_until INTEGER
    );

    CREATE TABLE IF NOT EXISTS router_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      label TEXT,
      token_hash TEXT,
      token_prefix TEXT,
      allowed_providers TEXT,
      total_calls INTEGER DEFAULT 0,
      last_used TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      timestamp TEXT,
      provider TEXT,
      key_id TEXT,
      key_label TEXT,
      gmail_tag TEXT,
      model TEXT,
      tokens_used INTEGER,
      status TEXT,
      latency_ms INTEGER,
      fallback_attempted INTEGER,
      fallback_chain TEXT,
      endpoint TEXT,
      prompt_preview TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      rotation_strategy TEXT,
      auto_fallback INTEGER,
      max_fallback_retries INTEGER,
      cooldown_seconds INTEGER,
      rate_limit_tolerance INTEGER,
      log_retention_days INTEGER
    );
  `);
}

// In-memory fallback if sqlite is unavailable
function createFallbackDb(filePath: string): DbInterface {
  let state: Record<string, any[]> = {
    users: [],
    gmail_accounts: [],
    api_keys: [],
    router_tokens: [],
    usage_logs: [],
    settings: [],
  };

  if (fs.existsSync(filePath)) {
    try {
      state = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      // ignore
    }
  }

  const save = () => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    } catch {
      // ignore
    }
  };

  return {
    exec() {
      // Schema initialization no-op for JSON
    },
    prepare(sql: string) {
      return {
        run() {
          save();
          return { changes: 1, lastInsertRowid: 1 };
        },
        all() {
          if (sql.includes('FROM api_keys')) return state.api_keys || [];
          if (sql.includes('FROM router_tokens')) return state.router_tokens || [];
          if (sql.includes('FROM usage_logs')) return state.usage_logs || [];
          if (sql.includes('FROM gmail_accounts')) return state.gmail_accounts || [];
          return [];
        },
        get() {
          if (sql.includes('SELECT count(*) as cnt FROM api_keys')) {
            return { cnt: (state.api_keys || []).length };
          }
          if (sql.includes('FROM settings')) return state.settings?.[0] || null;
          if (sql.includes('FROM users')) return state.users?.[0] || null;
          return null;
        },
      };
    },
  };
}
