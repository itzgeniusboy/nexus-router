import { Pool } from 'pg';
import type { ApiKeyItem, DatabaseStatus, GmailAccount, ProviderId, RouterSettings, RouterToken, UsageLog } from '../src/types';
import { getDatabase } from './db';

let pgPool: Pool | null = null;
let lastTestResult: {
  connected: boolean;
  latencyMs: number | null;
  error: string | null;
  lastSyncTime: string;
} = {
  connected: false,
  latencyMs: null,
  error: null,
  lastSyncTime: new Date().toISOString(),
};

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export function getDatabaseMeta() {
  const url = process.env.DATABASE_URL?.trim() || '';
  if (!url) {
    return {
      configured: false,
      provider: 'sqlite' as const,
      providerName: 'SQLite (Local Database)',
      host: 'local',
      databaseName: 'router.db',
      sslEnabled: false,
    };
  }

  const isSupabase = url.includes('supabase.co') || url.includes('supabase.com') || url.includes('supabase.net') || url.includes('pooler.supabase');
  let host = 'PostgreSQL Host';
  let dbName = 'postgres';

  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    dbName = parsed.pathname.replace(/^\//, '') || 'postgres';
  } catch {
    // If not a standard URL, try regex
    const hostMatch = url.match(/@([^:/]+)/);
    if (hostMatch) host = hostMatch[1];
  }

  return {
    configured: true,
    provider: isSupabase ? ('supabase' as const) : ('postgres' as const),
    providerName: isSupabase ? 'Supabase (PostgreSQL)' : 'PostgreSQL Database',
    host,
    databaseName: dbName,
    sslEnabled: true,
  };
}

export function getPgPool(): Pool | null {
  if (!isDatabaseConfigured()) return null;
  if (pgPool) return pgPool;

  const connectionString = process.env.DATABASE_URL!.trim();
  try {
    console.log('[Supabase PG] Initializing connection pool with DATABASE_URL...');
    pgPool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 8000,
      max: 10,
    });

    pgPool.on('error', (err) => {
      console.warn('[Supabase PG Pool Error]', err.message);
      lastTestResult.connected = false;
      lastTestResult.error = err.message;
    });

    return pgPool;
  } catch (err: any) {
    console.error('[Supabase PG] Failed to create pool:', err);
    lastTestResult.connected = false;
    lastTestResult.error = err.message;
    return null;
  }
}

export async function testPostgresConnection(): Promise<DatabaseStatus> {
  const meta = getDatabaseMeta();
  if (!meta.configured) {
    let apiKeys = 0;
    let gmailAccounts = 0;
    let routerTokens = 0;
    let usageLogs = 0;
    try {
      const db = getDatabase();
      const k = db.prepare('SELECT count(*) as cnt FROM api_keys').get() as any;
      apiKeys = Number(k?.cnt || 0);
      const g = db.prepare('SELECT count(*) as cnt FROM gmail_accounts').get() as any;
      gmailAccounts = Number(g?.cnt || 0);
      const t = db.prepare('SELECT count(*) as cnt FROM router_tokens').get() as any;
      routerTokens = Number(t?.cnt || 0);
      const l = db.prepare('SELECT count(*) as cnt FROM usage_logs').get() as any;
      usageLogs = Number(l?.cnt || 0);
    } catch {
      // ignore
    }

    return {
      configured: false,
      provider: 'sqlite',
      providerName: 'SQLite (Local Database)',
      connected: true,
      host: 'localhost',
      databaseName: 'router.db',
      sslEnabled: false,
      latencyMs: 1,
      tableStats: {
        apiKeys,
        gmailAccounts,
        routerTokens,
        usageLogs,
      },
      lastSyncTime: new Date().toISOString(),
      error: null,
    };
  }

  const pool = getPgPool();
  if (!pool) {
    return {
      ...meta,
      connected: false,
      latencyMs: null,
      tableStats: { apiKeys: 0, gmailAccounts: 0, routerTokens: 0, usageLogs: 0 },
      lastSyncTime: lastTestResult.lastSyncTime,
      error: 'Failed to initialize PostgreSQL pool from DATABASE_URL',
    };
  }

  const startTime = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW() as now, current_database() as db;');
      const latencyMs = Date.now() - startTime;

      // Check table counts
      let apiKeys = 0;
      let gmailAccounts = 0;
      let routerTokens = 0;
      let usageLogs = 0;

      try {
        const kRes = await client.query('SELECT count(*) as cnt FROM api_keys;');
        apiKeys = parseInt(kRes.rows[0]?.cnt || '0', 10);
        const gRes = await client.query('SELECT count(*) as cnt FROM gmail_accounts;');
        gmailAccounts = parseInt(gRes.rows[0]?.cnt || '0', 10);
        const tRes = await client.query('SELECT count(*) as cnt FROM router_tokens;');
        routerTokens = parseInt(tRes.rows[0]?.cnt || '0', 10);
        const lRes = await client.query('SELECT count(*) as cnt FROM usage_logs;');
        usageLogs = parseInt(lRes.rows[0]?.cnt || '0', 10);
      } catch {
        // Tables might not be initialized yet
      }

      lastTestResult = {
        connected: true,
        latencyMs,
        error: null,
        lastSyncTime: new Date().toISOString(),
      };

      return {
        ...meta,
        connected: true,
        latencyMs,
        tableStats: {
          apiKeys,
          gmailAccounts,
          routerTokens,
          usageLogs,
        },
        lastSyncTime: lastTestResult.lastSyncTime,
        error: null,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[Supabase PG] Connection test error:', err.message);
    lastTestResult = {
      connected: false,
      latencyMs: null,
      error: err.message,
      lastSyncTime: new Date().toISOString(),
    };

    return {
      ...meta,
      connected: false,
      latencyMs: null,
      tableStats: { apiKeys: 0, gmailAccounts: 0, routerTokens: 0, usageLogs: 0 },
      lastSyncTime: lastTestResult.lastSyncTime,
      error: err.message,
    };
  }
}

export async function initPostgresTables(): Promise<boolean> {
  const pool = getPgPool();
  if (!pool) return false;

  try {
    const client = await pool.connect();
    try {
      console.log('[Supabase PG] Initializing schemas and tables in PostgreSQL...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE,
          password_hash TEXT,
          password_salt TEXT,
          email TEXT,
          name TEXT,
          avatar TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Migrations for existing users table
        DO $$ BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT;
        EXCEPTION WHEN others THEN NULL;
        END $$;

        CREATE TABLE IF NOT EXISTS gmail_accounts (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          email TEXT UNIQUE,
          name TEXT,
          is_primary INTEGER DEFAULT 0,
          avatar_color TEXT,
          added_at TIMESTAMPTZ DEFAULT NOW()
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
          tokens_used BIGINT DEFAULT 0,
          last_latency_ms INTEGER DEFAULT 0,
          last_used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          enabled INTEGER DEFAULT 1,
          custom_base_url TEXT,
          custom_auth_header TEXT,
          cooldown_until BIGINT
        );

        CREATE TABLE IF NOT EXISTS router_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          label TEXT,
          token_hash TEXT,
          token_prefix TEXT,
          allowed_providers TEXT,
          total_calls INTEGER DEFAULT 0,
          last_used TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS usage_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          timestamp TIMESTAMPTZ DEFAULT NOW(),
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
      console.log('[Supabase PG] Schema initialization completed successfully.');
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[Supabase PG] Error initializing tables:', err.message);
    return false;
  }
}

// Background write-through helpers to PostgreSQL / Supabase
export async function pgUpsertApiKey(key: ApiKeyItem, userId = 'default-user'): Promise<void> {
  const pool = getPgPool();
  if (!pool) return;

  try {
    await pool.query(
      `
      INSERT INTO api_keys (
        id, user_id, provider, label, masked_key, encrypted_key, gmail_tag,
        status, priority, total_requests, tokens_used, last_latency_ms,
        last_used_at, created_at, enabled, custom_base_url, custom_auth_header, cooldown_until
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        total_requests = EXCLUDED.total_requests,
        tokens_used = EXCLUDED.tokens_used,
        last_latency_ms = EXCLUDED.last_latency_ms,
        last_used_at = EXCLUDED.last_used_at,
        enabled = EXCLUDED.enabled,
        custom_base_url = EXCLUDED.custom_base_url,
        custom_auth_header = EXCLUDED.custom_auth_header,
        cooldown_until = EXCLUDED.cooldown_until;
    `,
      [
        key.id,
        userId,
        key.provider,
        key.label,
        key.maskedKey,
        key.encryptedKey,
        key.gmailTag,
        key.status,
        key.priority,
        key.totalRequests,
        key.tokensUsed,
        key.lastLatencyMs || 0,
        key.lastUsedAt || null,
        key.createdAt,
        key.enabled ? 1 : 0,
        key.customBaseUrl || null,
        key.customAuthHeader || null,
        typeof key.cooldownUntil === 'number'
          ? key.cooldownUntil
          : key.cooldownUntil
          ? new Date(key.cooldownUntil).getTime()
          : null,
      ]
    );
  } catch (err: any) {
    console.warn('[Supabase PG] Failed to upsert API key:', err.message);
  }
}

export async function pgDeleteApiKey(id: string): Promise<void> {
  const pool = getPgPool();
  if (!pool) return;
  try {
    await pool.query('DELETE FROM api_keys WHERE id = $1', [id]);
  } catch (err: any) {
    console.warn('[Supabase PG] Failed to delete API key:', err.message);
  }
}

export async function pgUpsertGmailAccount(account: GmailAccount, userId = 'default-user'): Promise<void> {
  const pool = getPgPool();
  if (!pool) return;

  try {
    await pool.query(
      `
      INSERT INTO gmail_accounts (id, user_id, email, name, is_primary, avatar_color, added_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(NULLIF(EXCLUDED.name, ''), gmail_accounts.name),
        user_id = COALESCE(EXCLUDED.user_id, gmail_accounts.user_id),
        is_primary = CASE WHEN EXCLUDED.is_primary = 1 THEN 1 ELSE gmail_accounts.is_primary END,
        avatar_color = COALESCE(EXCLUDED.avatar_color, gmail_accounts.avatar_color);
    `,
      [
        account.id,
        userId,
        account.email,
        account.name,
        account.isPrimary ? 1 : 0,
        account.avatarColor,
        account.addedAt,
      ]
    );
  } catch (err: any) {
    console.warn('[Supabase PG] Failed to upsert Gmail account:', err.message);
  }
}

export async function pgUpsertUser(user: {
  id: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  name?: string;
  avatar?: string;
}): Promise<void> {
  const pool = getPgPool();
  if (!pool) return;
  try {
    await pool.query(
      `
      INSERT INTO users (id, username, password_hash, password_salt, name, avatar, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        password_salt = EXCLUDED.password_salt,
        name = EXCLUDED.name,
        avatar = EXCLUDED.avatar;
    `,
      [
        user.id,
        user.username,
        user.passwordHash,
        user.passwordSalt,
        user.name || user.username,
        user.avatar || null,
      ]
    );
  } catch (err: any) {
    console.warn('[Supabase PG] Failed to upsert user:', err.message);
  }
}

export async function pgInsertRouterToken(
  token: RouterToken,
  tokenHash: string,
  userId = 'default-user'
): Promise<void> {
  const pool = getPgPool();
  if (!pool) return;

  try {
    await pool.query(
      `
      INSERT INTO router_tokens (id, user_id, label, token_hash, token_prefix, allowed_providers, total_calls, last_used, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        total_calls = EXCLUDED.total_calls,
        last_used = EXCLUDED.last_used;
    `,
      [
        token.id,
        userId,
        token.label,
        tokenHash,
        token.tokenPrefix,
        JSON.stringify(token.allowedProviders),
        token.totalCalls,
        token.lastUsed,
        token.createdAt,
      ]
    );
  } catch (err: any) {
    console.warn('[Supabase PG] Failed to insert router token:', err.message);
  }
}

export async function pgDeleteRouterToken(id: string): Promise<void> {
  const pool = getPgPool();
  if (!pool) return;
  try {
    await pool.query('DELETE FROM router_tokens WHERE id = $1', [id]);
  } catch (err: any) {
    console.warn('[Supabase PG] Failed to delete router token:', err.message);
  }
}

export async function pgInsertUsageLog(log: UsageLog, userId = 'default-user'): Promise<void> {
  const pool = getPgPool();
  if (!pool) return;

  try {
    await pool.query(
      `
      INSERT INTO usage_logs (
        id, user_id, timestamp, provider, key_id, key_label, gmail_tag,
        model, tokens_used, status, latency_ms, fallback_attempted,
        fallback_chain, endpoint, prompt_preview
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO NOTHING;
    `,
      [
        log.id,
        userId,
        log.timestamp,
        log.provider,
        log.keyId,
        log.keyLabel,
        log.gmailTag,
        log.model,
        log.tokensUsed,
        log.status,
        log.latencyMs,
        log.fallbackAttempted ? 1 : 0,
        log.fallbackChain ? JSON.stringify(log.fallbackChain) : null,
        log.endpoint,
        log.promptPreview || null,
      ]
    );
  } catch (err: any) {
    console.warn('[Supabase PG] Failed to insert usage log:', err.message);
  }
}

export async function pgClearUsageLogs(userId = 'default-user'): Promise<void> {
  const pool = getPgPool();
  if (!pool) return;
  try {
    await pool.query('DELETE FROM usage_logs WHERE user_id = $1 OR user_id = $2', [userId, 'default-user']);
  } catch (err: any) {
    console.warn('[Supabase PG] Failed to clear usage logs:', err.message);
  }
}

export async function pgUpsertSettings(settings: RouterSettings, userId = 'default-user'): Promise<void> {
  const pool = getPgPool();
  if (!pool) return;

  try {
    await pool.query(
      `
      INSERT INTO settings (
        id, user_id, rotation_strategy, auto_fallback, max_fallback_retries,
        cooldown_seconds, rate_limit_tolerance, log_retention_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        rotation_strategy = EXCLUDED.rotation_strategy,
        auto_fallback = EXCLUDED.auto_fallback,
        max_fallback_retries = EXCLUDED.max_fallback_retries,
        cooldown_seconds = EXCLUDED.cooldown_seconds,
        rate_limit_tolerance = EXCLUDED.rate_limit_tolerance,
        log_retention_days = EXCLUDED.log_retention_days;
    `,
      [
        'global-settings',
        userId,
        settings.rotationStrategy,
        settings.autoFallback ? 1 : 0,
        settings.maxFallbackRetries,
        settings.cooldownSeconds,
        settings.rateLimitTolerance,
        settings.logRetentionDays,
      ]
    );
  } catch (err: any) {
    console.warn('[Supabase PG] Failed to upsert settings:', err.message);
  }
}

// Fetch existing data from PostgreSQL / Supabase if populated
export async function pgLoadAllData(): Promise<{
  keys: ApiKeyItem[];
  accounts: GmailAccount[];
  tokens: Array<{ token: RouterToken; tokenHash: string }>;
  settings: RouterSettings | null;
  logs: UsageLog[];
} | null> {
  const pool = getPgPool();
  if (!pool) return null;

  try {
    const client = await pool.connect();
    try {
      const keysRes = await client.query('SELECT * FROM api_keys ORDER BY priority ASC, created_at DESC');
      const accountsRes = await client.query('SELECT * FROM gmail_accounts ORDER BY is_primary DESC, added_at ASC');
      const tokensRes = await client.query('SELECT * FROM router_tokens ORDER BY created_at DESC');
      const settingsRes = await client.query("SELECT * FROM settings WHERE id = 'global-settings' LIMIT 1");
      const logsRes = await client.query('SELECT * FROM usage_logs ORDER BY timestamp DESC LIMIT 100');

      const keys: ApiKeyItem[] = keysRes.rows.map((r) => ({
        id: r.id,
        provider: r.provider as ProviderId,
        label: r.label,
        maskedKey: r.masked_key,
        encryptedKey: r.encrypted_key,
        gmailTag: r.gmail_tag,
        status: r.status as any,
        priority: r.priority,
        totalRequests: parseInt(r.total_requests || '0', 10),
        tokensUsed: parseInt(r.tokens_used || '0', 10),
        lastLatencyMs: r.last_latency_ms ? parseInt(r.last_latency_ms, 10) : undefined,
        lastUsedAt: r.last_used_at ? new Date(r.last_used_at).toISOString() : null,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        enabled: Boolean(r.enabled),
        customBaseUrl: r.custom_base_url || undefined,
        customAuthHeader: r.custom_auth_header || undefined,
        cooldownUntil: r.cooldown_until ? parseInt(r.cooldown_until, 10) : undefined,
      }));

      const accounts: GmailAccount[] = accountsRes.rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        isPrimary: Boolean(r.is_primary),
        avatarColor: r.avatar_color || '#5B6CFF',
        addedAt: r.added_at ? new Date(r.added_at).toISOString() : new Date().toISOString(),
      }));

      const tokens = tokensRes.rows.map((r) => ({
        token: {
          id: r.id,
          label: r.label,
          tokenPrefix: r.token_prefix,
          allowedProviders: JSON.parse(r.allowed_providers || '["all"]'),
          totalCalls: parseInt(r.total_calls || '0', 10),
          lastUsed: r.last_used ? new Date(r.last_used).toISOString() : null,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        },
        tokenHash: r.token_hash,
      }));

      let settings: RouterSettings | null = null;
      if (settingsRes.rows.length > 0) {
        const s = settingsRes.rows[0];
        settings = {
          rotationStrategy: (s.rotation_strategy as any) || 'round-robin',
          autoFallback: Boolean(s.auto_fallback),
          maxFallbackRetries: s.max_fallback_retries ?? 3,
          cooldownSeconds: s.cooldown_seconds ?? 60,
          rateLimitTolerance: s.rate_limit_tolerance ?? 2,
          logRetentionDays: s.log_retention_days ?? 30,
        };
      }

      const logs: UsageLog[] = logsRes.rows.map((r) => ({
        id: r.id,
        timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
        provider: r.provider as ProviderId,
        keyId: r.key_id,
        keyLabel: r.key_label,
        gmailTag: r.gmail_tag,
        model: r.model,
        tokensUsed: parseInt(r.tokens_used || '0', 10),
        status: r.status as any,
        latencyMs: parseInt(r.latency_ms || '0', 10),
        fallbackAttempted: Boolean(r.fallback_attempted),
        fallbackChain: r.fallback_chain ? JSON.parse(r.fallback_chain) : undefined,
        endpoint: r.endpoint,
        promptPreview: r.prompt_preview || undefined,
      }));

      return { keys, accounts, tokens, settings, logs };
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[Supabase PG] Failed to load data from PostgreSQL:', err.message);
    return null;
  }
}
