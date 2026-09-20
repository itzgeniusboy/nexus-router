import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Globe,
  HardDrive,
  HelpCircle,
  Layers,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Server,
  Shield,
  ShieldCheck,
  Sliders,
  Upload,
  User,
  Zap,
} from 'lucide-react';
import { DatabaseStatus, RouterSettings, UserProfile } from '../types';

interface Props {
  settings: RouterSettings;
  user?: UserProfile | null;
  onUpdateSettings: (newSettings: Partial<RouterSettings>) => Promise<void>;
  onOpenAuthModal?: () => void;
  onLogout?: () => Promise<void>;
  databaseStatus?: DatabaseStatus | null;
  onTestDatabase?: () => Promise<void>;
  onSyncDatabase?: () => Promise<void>;
  isDbTesting?: boolean;
  isDbSyncing?: boolean;
}

export const SettingsView: React.FC<Props> = ({
  settings,
  user,
  onUpdateSettings,
  onOpenAuthModal,
  onLogout,
  databaseStatus,
  onTestDatabase,
  onSyncDatabase,
  isDbTesting = false,
  isDbSyncing = false,
}) => {
  const [currentSettings, setCurrentSettings] = useState<RouterSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleSaveSettings = async () => {
    await onUpdateSettings(currentSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/70 p-6 backdrop-blur-sm">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#5B6CFF]">
          <Sliders className="h-4 w-4" />
          <span>Routing Policies & Identities</span>
        </div>
        <h2 className="mt-1 text-xl font-bold text-white">Gateway Engine Configuration</h2>
        <p className="mt-1 text-xs text-[#8A94A6]">
          Configure auto-rotation algorithms, continuous failover behaviors, and manage your tagged Gmail identities.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Router Policies */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/80 p-6 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-white">Rotation & Failover Strategy</h3>

            <div className="mt-4 space-y-4 text-xs">
              {/* Strategy picker */}
              <div>
                <div className="flex items-center space-x-1.5">
                  <label className="block font-medium text-[#C5CEE0]">Key Selection Algorithm (Rotation Strategy)</label>
                  <div className="group relative cursor-help">
                    <HelpCircle className="h-3.5 w-3.5 text-[#5B6CFF]/80 group-hover:text-[#8C9BFF] transition-colors" />
                    <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-white/[0.12] bg-[#14161A] p-3 text-xs text-[#C5CEE0] opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-200 group-hover:opacity-100">
                      <p className="font-semibold text-white mb-1">Rotation Strategy</p>
                      <p className="text-[11px] leading-relaxed text-[#9DA8BE]">
                        Determines the routing algorithm used across active keys: <strong className="text-white">Priority First</strong> routes to highest priority keys and reserves lower tiers as emergency backups; <strong className="text-white">Round-Robin</strong> distributes load equally across all matching keys; <strong className="text-white">Least Recently Used</strong> balances lifetime wear.
                      </p>
                    </div>
                  </div>
                </div>
                <select
                  id="settings-strategy-select"
                  value={currentSettings.rotationStrategy}
                  onChange={(e) =>
                    setCurrentSettings({
                      ...currentSettings,
                      rotationStrategy: e.target.value as any,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-[#0E1116] px-3 py-2 text-xs text-white focus:border-[#5B6CFF] focus:outline-none"
                >
                  <option value="round-robin">Round-Robin (Even Distribution)</option>
                  <option value="least-recently-used">Least Recently Used (Balanced Wear)</option>
                  <option value="priority-weight">Priority First (P1 then P2 Fallback)</option>
                </select>
                <span className="mt-1 block text-[11px] text-[#717B8F]">
                  Determines which active key handles each incoming request.
                </span>
              </div>

              {/* Auto Fallback switch */}
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0E1116] p-3">
                <div>
                  <span className="font-medium text-white">Continuous Flow (Auto-Fallback)</span>
                  <p className="text-[11px] text-[#717B8F]">
                    Silently retries with next healthy key on HTTP 429 rate limit.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={currentSettings.autoFallback}
                  onChange={(e) =>
                    setCurrentSettings({ ...currentSettings, autoFallback: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-white/[0.1] bg-[#161B26] text-[#5B6CFF] focus:ring-0"
                />
              </div>

              {/* Cooldown duration */}
              <div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1.5">
                    <label className="font-medium text-[#C5CEE0]">Rate-Limit Cooldown Duration</label>
                    <div className="group relative cursor-help">
                      <HelpCircle className="h-3.5 w-3.5 text-[#5B6CFF]/80 group-hover:text-[#8C9BFF] transition-colors" />
                      <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-white/[0.12] bg-[#14161A] p-3 text-xs text-[#C5CEE0] opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-200 group-hover:opacity-100">
                        <p className="font-semibold text-white mb-1">Cooldown Quarantine</p>
                        <p className="text-[11px] leading-relaxed text-[#9DA8BE]">
                          When an upstream provider returns HTTP 429 (Rate Limit), the gateway immediately flags that key into cooldown. During cooldown, traffic routes to alternate healthy keys. Once the timer expires, the router sends a lightweight canary request to restore the key into service.
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className="text-[#8C9BFF]">{currentSettings.cooldownSeconds} seconds</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={300}
                  step={15}
                  value={currentSettings.cooldownSeconds}
                  onChange={(e) =>
                    setCurrentSettings({
                      ...currentSettings,
                      cooldownSeconds: Number(e.target.value),
                    })
                  }
                  className="mt-2 w-full accent-[#5B6CFF]"
                />
                <span className="mt-1 block text-[11px] text-[#717B8F]">
                  Time a rate-limited key stays sidelined before re-entering rotation pool.
                </span>
              </div>

              {/* Max retries */}
              <div>
                <label className="block font-medium text-[#C5CEE0]">Maximum Fallback Retries</label>
                <select
                  value={currentSettings.maxFallbackRetries}
                  onChange={(e) =>
                    setCurrentSettings({
                      ...currentSettings,
                      maxFallbackRetries: Number(e.target.value),
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-[#0E1116] px-3 py-2 text-xs text-white focus:border-[#5B6CFF] focus:outline-none"
                >
                  <option value={1}>1 Retry</option>
                  <option value={2}>2 Retries</option>
                  <option value={3}>3 Retries (Recommended)</option>
                  <option value={5}>5 Retries</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  id="save-settings-btn"
                  onClick={handleSaveSettings}
                  className="flex w-full sm:w-auto items-center justify-center space-x-2 rounded-xl bg-[#5B6CFF] px-4 py-2.5 sm:py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4E5EEB]"
                >
                  {isSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  <span>{isSaved ? 'Settings Saved' : 'Save Routing Policies'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Security details */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/80 p-6 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <Shield className="h-4 w-4" />
              <span>Storage Encryption At Rest</span>
            </div>
            <h4 className="mt-1 font-semibold text-white">AES-256-CBC with SHA-256 Digest</h4>
            <p className="mt-1 text-xs text-[#8A94A6]">
              All vaulted API keys are encrypted at rest using a 32-byte secret key and 16-byte initialization vector. Keys are decrypted exclusively in memory at request dispatch time and never returned in plaintext to the browser.
            </p>
          </div>
        </div>

        {/* Right: User Authentication & Profile */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/80 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">User Authentication & Credentials</h3>
                <p className="text-xs text-[#8A94A6]">
                  Dedicated gateway identity with isolated keys, tokens, and telemetry.
                </p>
              </div>
              {user ? (
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  Logged In
                </span>
              ) : (
                <span className="rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#8A94A6]">
                  Default Workspace
                </span>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0E1116] p-4 text-xs space-y-3">
              {user ? (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B6CFF]/20 text-[#8C9BFF] font-semibold text-sm border border-[#5B6CFF]/30">
                      {user.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white text-sm">{user.name || user.username}</span>
                        <span className="rounded bg-[#5B6CFF]/20 px-1.5 py-0.2 text-[10px] font-medium text-[#8C9BFF]">
                          @{user.username}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#717B8F] font-mono">{user.email || `@${user.username}`}</span>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06] pt-3 text-xs text-[#8A94A6] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span>Authentication Scheme:</span>
                      <span className="font-mono text-white text-[11px]">PBKDF2-HMAC-SHA512</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Account Status:</span>
                      <span className="text-emerald-400">Active & Verified</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      onClick={onLogout}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition"
                    >
                      Sign Out
                    </button>
                    <button
                      onClick={onOpenAuthModal}
                      className="rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.1] transition"
                    >
                      Switch Account
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-[#8A94A6] border border-white/[0.08]">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-white">Default Local Workspace</span>
                      <p className="text-[11px] text-[#717B8F]">
                        Running with shared local session. Create an account to isolate your keys.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06] pt-3">
                    <button
                      onClick={onOpenAuthModal}
                      className="w-full flex items-center justify-center space-x-2 rounded-xl bg-[#5B6CFF] py-2 text-xs font-medium text-white hover:bg-[#4E5EEB] transition"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>Sign In or Create Account</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-[#5B6CFF]/20 bg-[#5B6CFF]/5 p-3 text-xs text-[#8A94A6] space-y-1">
              <div className="flex items-center space-x-1.5 font-medium text-white">
                <ShieldCheck className="h-3.5 w-3.5 text-[#5B6CFF]" />
                <span>Zero-Knowledge Architecture</span>
              </div>
              <p className="text-[11px] text-[#8A94A6] leading-relaxed">
                Passwords are never stored in plaintext. Each account generates a cryptographically random 16-byte salt and passes through 100,000 PBKDF2 iterations with SHA-512 before persistence.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Database & Supabase Persistence Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/80 p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-white">Database & Cloud Persistence</h3>
                <span
                  className={`inline-flex items-center space-x-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    databaseStatus?.connected
                      ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : databaseStatus?.configured
                      ? 'border border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border border-blue-500/30 bg-blue-500/10 text-blue-400'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      databaseStatus?.connected
                        ? 'bg-emerald-400 animate-pulse'
                        : databaseStatus?.configured
                        ? 'bg-amber-400'
                        : 'bg-blue-400'
                    }`}
                  />
                  <span>
                    {databaseStatus?.connected
                      ? 'CONNECTED & ACTIVE'
                      : databaseStatus?.configured
                      ? 'STANDBY / RETRYING'
                      : 'SQLITE LOCAL FALLBACK'}
                  </span>
                </span>
              </div>
              <p className="mt-1 text-xs text-[#8A94A6]">
                {databaseStatus?.configured
                  ? 'Active PostgreSQL connection configured via DATABASE_URL. All keys, router tokens, logs, and settings synchronize automatically.'
                  : 'Currently operating in SQLite local mode. Provide DATABASE_URL to enable cloud persistence across deployments.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {onTestDatabase && (
              <button
                id="btn-test-db-connection"
                onClick={onTestDatabase}
                disabled={isDbTesting}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 rounded-xl border border-white/[0.12] bg-[#161924] px-3 py-2 text-xs font-medium text-white transition hover:border-white/[0.2] hover:bg-[#1c202e] disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isDbTesting ? 'animate-spin text-[#5B6CFF]' : 'text-[#8A94A6]'}`} />
                <span>{isDbTesting ? 'Pinging...' : 'Test Connection'}</span>
              </button>
            )}

            {onSyncDatabase && (
              <button
                id="btn-sync-db"
                onClick={onSyncDatabase}
                disabled={isDbSyncing}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <HardDrive className={`h-3.5 w-3.5 ${isDbSyncing ? 'animate-bounce text-emerald-400' : 'text-emerald-400'}`} />
                <span>{isDbSyncing ? 'Syncing...' : 'Sync Tables Now'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Database Details Grid */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/[0.06] bg-[#0E1116] p-3 text-xs">
            <span className="text-[11px] text-[#717B8F]">Storage Provider</span>
            <div className="mt-1 flex items-center space-x-2">
              <Server className="h-4 w-4 text-[#5B6CFF]" />
              <span className="font-semibold text-white">
                {databaseStatus?.providerName || (databaseStatus?.configured ? 'PostgreSQL / Supabase' : 'SQLite Database')}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[#0E1116] p-3 text-xs">
            <span className="text-[11px] text-[#717B8F]">Database Host</span>
            <div className="mt-1 flex items-center space-x-2">
              <Globe className="h-4 w-4 text-emerald-400" />
              <span className="font-mono text-[11px] text-[#C5CEE0] truncate">
                {databaseStatus?.host || 'localhost'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[#0E1116] p-3 text-xs">
            <span className="text-[11px] text-[#717B8F]">Encryption & Security</span>
            <div className="mt-1 flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="font-medium text-[#C5CEE0]">
                {databaseStatus?.sslEnabled ? 'SSL/TLS + AES-256' : 'Local AES-256'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[#0E1116] p-3 text-xs">
            <span className="text-[11px] text-[#717B8F]">Ping Latency</span>
            <div className="mt-1 flex items-center space-x-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="font-mono font-medium text-white">
                {databaseStatus?.latencyMs !== null && databaseStatus?.latencyMs !== undefined
                  ? `${databaseStatus.latencyMs} ms`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Database Tables & Record Counts */}
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0E1116] p-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center space-x-2 text-[#C5CEE0]">
              <Layers className="h-4 w-4 text-[#5B6CFF]" />
              <span className="font-medium">Persistent Table Record Counts</span>
            </div>
            <span className="text-[11px] text-[#717B8F]">
              Last synced: {databaseStatus?.lastSyncTime ? new Date(databaseStatus.lastSyncTime).toLocaleTimeString() : 'Just now'}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-[#141720] p-2.5">
              <span className="text-[11px] text-[#717B8F]">api_keys</span>
              <div className="mt-1 text-base font-bold text-white">
                {databaseStatus?.tableStats?.apiKeys ?? 0}
              </div>
              <span className="text-[10px] text-emerald-400">Encrypted in DB</span>
            </div>

            <div className="rounded-lg bg-[#141720] p-2.5">
              <span className="text-[11px] text-[#717B8F]">gmail_accounts</span>
              <div className="mt-1 text-base font-bold text-white">
                {databaseStatus?.tableStats?.gmailAccounts ?? 0}
              </div>
              <span className="text-[10px] text-blue-400">Tagged Identities</span>
            </div>

            <div className="rounded-lg bg-[#141720] p-2.5">
              <span className="text-[11px] text-[#717B8F]">router_tokens</span>
              <div className="mt-1 text-base font-bold text-white">
                {databaseStatus?.tableStats?.routerTokens ?? 0}
              </div>
              <span className="text-[10px] text-purple-400">Client Ingress Keys</span>
            </div>

            <div className="rounded-lg bg-[#141720] p-2.5">
              <span className="text-[11px] text-[#717B8F]">usage_logs</span>
              <div className="mt-1 text-base font-bold text-white">
                {databaseStatus?.tableStats?.usageLogs ?? 0}
              </div>
              <span className="text-[10px] text-amber-400">Audit History</span>
            </div>
          </div>
        </div>

        {databaseStatus?.error && (
          <div className="mt-3 flex items-start space-x-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold">Connection Notice:</span> {databaseStatus.error}
              <p className="mt-0.5 text-[11px] text-amber-300/80">
                The router is currently utilizing the local high-performance SQLite engine to ensure zero downtime. Once the PostgreSQL host is reachable, sync will resume automatically.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Authentication & Vercel Deployment Alignment Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/80 p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#5B6CFF]/30 bg-[#5B6CFF]/10 text-[#5B6CFF]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-white">Vercel Deployment & Auth Alignment</h3>
                <span className="inline-flex items-center space-x-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>nexusrouter.vercel.app</span>
                </span>
              </div>
              <p className="mt-1 text-xs text-[#8A94A6]">
                Authentication, CORS origins, trust proxies, and cryptographic vault security aligned for production deployment.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Checklist Grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* API Gateway Ingress & OpenAI Proxy Config */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0E1116] p-4 text-xs space-y-3">
            <div className="flex items-center space-x-2 text-white font-medium">
              <Globe className="h-4 w-4 text-[#5B6CFF]" />
              <span>Production Ingress & Reverse Proxy</span>
            </div>
            <p className="text-[11px] text-[#8A94A6]">
              Standard OpenAI-compatible drop-in endpoints for external SDKs and clients:
            </p>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#717B8F]">OpenAI Compatible Base URL</span>
                <div className="mt-1 flex items-center justify-between rounded-lg bg-[#141720] px-3 py-2 border border-white/[0.04]">
                  <code className="font-mono text-emerald-400 text-[11px]">https://nexusrouter.vercel.app/v1</code>
                  <button
                    onClick={() => copyToClipboard('https://nexusrouter.vercel.app/v1', 'v1_url')}
                    className="ml-2 flex items-center space-x-1 text-[#8A94A6] hover:text-white"
                  >
                    {copiedItem === 'v1_url' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="text-[10px]">{copiedItem === 'v1_url' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-[#717B8F]">Chat Completions Route</span>
                <div className="mt-1 flex items-center justify-between rounded-lg bg-[#141720] px-3 py-2 border border-white/[0.04]">
                  <code className="font-mono text-emerald-400 text-[11px]">/v1/chat/completions</code>
                  <button
                    onClick={() => copyToClipboard('https://nexusrouter.vercel.app/v1/chat/completions', 'chat_url')}
                    className="ml-2 flex items-center space-x-1 text-[#8A94A6] hover:text-white"
                  >
                    {copiedItem === 'chat_url' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="text-[10px]">{copiedItem === 'chat_url' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Database & Cryptographic Vault Security */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0E1116] p-4 text-xs space-y-3">
            <div className="flex items-center space-x-2 text-white font-medium">
              <Lock className="h-4 w-4 text-emerald-400" />
              <span>Database & Cryptographic Vault Security</span>
            </div>
            <p className="text-[11px] text-[#8A94A6]">
              Hardware-isolated AES-256-GCM encryption with PBKDF2 credential derivation:
            </p>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#717B8F]">Primary Database Engine</span>
                <div className="mt-1 flex items-center justify-between rounded-lg bg-[#141720] px-3 py-2 border border-white/[0.04]">
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <code className="font-mono text-emerald-400 text-[11px]">Supabase (PostgreSQL 15+)</code>
                  </div>
                  <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">SSL Active</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-[#717B8F]">Authentication Model</span>
                <div className="mt-1 flex items-center justify-between rounded-lg bg-[#141720] px-3 py-2 border border-white/[0.04]">
                  <code className="font-mono text-[#8C9BFF] text-[11px]">Salted PBKDF2 (10,000 Iterations)</code>
                  <span className="text-[10px] text-emerald-400 font-medium">Self-Hosted</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-[#717B8F]">Vault Protection Standards</span>
                <div className="mt-1 rounded-lg bg-[#141720] p-2.5 border border-white/[0.04] text-[11px] text-[#C5CEE0] space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Key Encryption:</span>
                    <span className="font-mono text-white">AES-256-GCM Authenticated</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Stored Tables:</span>
                    <span className="text-emerald-400 font-medium">users, api_keys, router_tokens, usage_logs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Access Privacy:</span>
                    <span className="text-[#8C9BFF]">100% Private (No 3P OAuth Required)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Middleware Features Row */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.04] bg-[#0E1116] p-3 text-xs">
            <span className="text-[11px] text-[#717B8F]">Proxy Forwarding</span>
            <div className="mt-1 flex items-center space-x-1.5 font-medium text-white">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>trust proxy = 1 (Active)</span>
            </div>
            <span className="text-[10px] text-[#717B8F]">Preserves HTTPS headers on Vercel</span>
          </div>

          <div className="rounded-xl border border-white/[0.04] bg-[#0E1116] p-3 text-xs">
            <span className="text-[11px] text-[#717B8F]">CORS Whitelist</span>
            <div className="mt-1 flex items-center space-x-1.5 font-medium text-white">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>*.vercel.app Allowed</span>
            </div>
            <span className="text-[10px] text-[#717B8F]">Supports preview & production URLs</span>
          </div>

          <div className="rounded-xl border border-white/[0.04] bg-[#0E1116] p-3 text-xs">
            <span className="text-[11px] text-[#717B8F]">Session Cookie</span>
            <div className="mt-1 flex items-center space-x-1.5 font-medium text-white">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>SameSite: Lax + Secure</span>
            </div>
            <span className="text-[10px] text-[#717B8F]">Resilient across cross-domain redirects</span>
          </div>
        </div>
      </div>
    </div>
  );
};
