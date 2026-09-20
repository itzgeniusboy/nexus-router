import React, { useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { ContinuousFlowTester } from './components/ContinuousFlowTester';
import { KeyVaultView } from './components/KeyVaultView';
import { Navbar } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { RouterTokensView } from './components/RouterTokensView';
import { SettingsView } from './components/SettingsView';
import { UsageLogsView } from './components/UsageLogsView';
import { safeFetchJson } from './lib/safe-fetch';
import {
  ApiKeyItem,
  DatabaseStatus,
  ProviderId,
  RouterSettings,
  RouterToken,
  UsageLog,
  UserProfile,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'simulator' | 'tokens' | 'logs' | 'settings'>('overview');
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [tokens, setTokens] = useState<RouterToken[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isDbTesting, setIsDbTesting] = useState(false);
  const [isDbSyncing, setIsDbSyncing] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [settings, setSettings] = useState<RouterSettings>({
    rotationStrategy: 'round-robin',
    autoFallback: true,
    maxFallbackRetries: 3,
    cooldownSeconds: 60,
    rateLimitTolerance: 2,
    logRetentionDays: 30,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isAddKeyModalOpen, setIsAddKeyModalOpen] = useState(false);

  // Fetch initial dashboard state & user session safely
  const fetchData = async () => {
    try {
      const [sessionRes, keysRes, tokensRes, logsRes, settingsRes, dbRes] = await Promise.all([
        safeFetchJson<{ user?: UserProfile }>('/api/auth/session'),
        safeFetchJson<{ keys?: ApiKeyItem[] }>('/api/keys'),
        safeFetchJson<{ tokens?: RouterToken[] }>('/api/tokens'),
        safeFetchJson<{ logs?: UsageLog[] }>('/api/logs'),
        safeFetchJson<{ settings?: RouterSettings }>('/api/settings'),
        safeFetchJson<{ status?: DatabaseStatus }>('/api/database/status'),
      ]);

      if (sessionRes.data?.user) {
        setUser(sessionRes.data.user);
      } else {
        setUser(null);
      }
      if (keysRes.data?.keys) setKeys(keysRes.data.keys);
      if (tokensRes.data?.tokens) setTokens(tokensRes.data.tokens);
      if (logsRes.data?.logs) setLogs(logsRes.data.logs);
      if (settingsRes.data?.settings) setSettings(settingsRes.data.settings);
      if (dbRes.data?.status) setDbStatus(dbRes.data.status);
    } catch (err) {
      console.error('Error fetching dashboard state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Manual Authentication Handlers (Username & Password)
  const handleLogin = async (username: string, password: string) => {
    const res = await safeFetchJson<{ success?: boolean; user?: UserProfile; error?: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok || !res.data?.success) {
      throw new Error(res.data?.error || 'Failed to login');
    }
    if (res.data.user) {
      setUser(res.data.user);
    }
    // Reload user-scoped data
    const [keysRes, tokensRes, logsRes] = await Promise.all([
      safeFetchJson<{ keys?: ApiKeyItem[] }>('/api/keys'),
      safeFetchJson<{ tokens?: RouterToken[] }>('/api/tokens'),
      safeFetchJson<{ logs?: UsageLog[] }>('/api/logs'),
    ]);
    if (keysRes.data?.keys) setKeys(keysRes.data.keys);
    if (tokensRes.data?.tokens) setTokens(tokensRes.data.tokens);
    if (logsRes.data?.logs) setLogs(logsRes.data.logs);
  };

  const handleRegister = async (username: string, password: string, name?: string) => {
    const res = await safeFetchJson<{ success?: boolean; user?: UserProfile; error?: string }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name }),
    });
    if (!res.ok || !res.data?.success) {
      throw new Error(res.data?.error || 'Failed to create account');
    }
    if (res.data.user) {
      setUser(res.data.user);
    }
    // Reload user-scoped data
    const [keysRes, tokensRes, logsRes] = await Promise.all([
      safeFetchJson<{ keys?: ApiKeyItem[] }>('/api/keys'),
      safeFetchJson<{ tokens?: RouterToken[] }>('/api/tokens'),
      safeFetchJson<{ logs?: UsageLog[] }>('/api/logs'),
    ]);
    if (keysRes.data?.keys) setKeys(keysRes.data.keys);
    if (tokensRes.data?.tokens) setTokens(tokensRes.data.tokens);
    if (logsRes.data?.logs) setLogs(logsRes.data.logs);
  };

  const handleLogout = async () => {
    try {
      await safeFetchJson('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      // Reload default keys
      const [keysRes, tokensRes, logsRes] = await Promise.all([
        safeFetchJson<{ keys?: ApiKeyItem[] }>('/api/keys'),
        safeFetchJson<{ tokens?: RouterToken[] }>('/api/tokens'),
        safeFetchJson<{ logs?: UsageLog[] }>('/api/logs'),
      ]);
      if (keysRes.data?.keys) setKeys(keysRes.data.keys);
      if (tokensRes.data?.tokens) setTokens(tokensRes.data.tokens);
      if (logsRes.data?.logs) setLogs(logsRes.data.logs);
    }
  };

  // Database actions
  const handleTestDatabase = async () => {
    setIsDbTesting(true);
    try {
      const res = await safeFetchJson<{ status?: DatabaseStatus }>('/api/database/test', { method: 'POST' });
      if (res.data?.status) {
        setDbStatus(res.data.status);
      }
    } catch (err) {
      console.error('Error testing database:', err);
    } finally {
      setIsDbTesting(false);
    }
  };

  const handleSyncDatabase = async () => {
    setIsDbSyncing(true);
    try {
      const res = await safeFetchJson<{ status?: DatabaseStatus }>('/api/database/sync', { method: 'POST' });
      if (res.data?.status) {
        setDbStatus(res.data.status);
      }
      const [keysRes, settingsRes] = await Promise.all([
        safeFetchJson<{ keys?: ApiKeyItem[] }>('/api/keys'),
        safeFetchJson<{ settings?: RouterSettings }>('/api/settings'),
      ]);
      if (keysRes.data?.keys) setKeys(keysRes.data.keys);
      if (settingsRes.data?.settings) setSettings(settingsRes.data.settings);
    } catch (err) {
      console.error('Error syncing database:', err);
    } finally {
      setIsDbSyncing(false);
    }
  };

  // Handlers for Key CRUD
  const handleAddKey = async (params: {
    provider: ProviderId;
    label: string;
    rawKey: string;
    gmailTag?: string;
    priority: number;
    customBaseUrl?: string;
    customAuthHeader?: string;
  }) => {
    const res = await safeFetchJson<{ success?: boolean; key?: ApiKeyItem }>('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.data?.success && res.data.key) {
      setKeys((prev) => [res.data.key!, ...prev]);
    }
  };

  const handleToggleKey = async (id: string, enabled: boolean) => {
    const res = await safeFetchJson<{ success?: boolean; key?: ApiKeyItem }>(`/api/keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (res.data?.success && res.data.key) {
      setKeys((prev) => prev.map((k) => (k.id === id ? res.data.key! : k)));
    }
  };

  const handleDeleteKey = async (id: string) => {
    const res = await safeFetchJson<{ success?: boolean }>(`/api/keys/${id}`, { method: 'DELETE' });
    if (res.data?.success) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
    }
  };

  const handleTestKey = async (id: string): Promise<{ latencyMs: number }> => {
    const res = await safeFetchJson<{ success?: boolean; latencyMs?: number; error?: string }>(`/api/keys/${id}/test`, { method: 'POST' });
    const latency = res.data?.latencyMs || 0;
    if (res.data?.success) {
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, status: 'active', lastLatencyMs: latency } : k))
      );
    }
    return { latencyMs: latency };
  };

  const handleUpdateKey = async (id: string, updates: Partial<ApiKeyItem>) => {
    const res = await safeFetchJson<{ success?: boolean; key?: ApiKeyItem }>(`/api/keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.data?.success && res.data.key) {
      setKeys((prev) => prev.map((k) => (k.id === id ? res.data.key! : k)));
    }
  };

  // Handlers for Tokens
  const handleCreateToken = async (label: string, allowedProviders: string[]): Promise<{ rawToken: string }> => {
    const res = await safeFetchJson<{ success?: boolean; token?: RouterToken; rawToken?: string }>('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, allowedProviders }),
    });
    if (res.data?.success && res.data.token) {
      setTokens((prev) => [res.data.token!, ...prev]);
    }
    return { rawToken: res.data?.rawToken || '' };
  };

  const handleRevokeToken = async (id: string) => {
    const res = await safeFetchJson<{ success?: boolean }>(`/api/tokens/${id}`, { method: 'DELETE' });
    if (res.data?.success) {
      setTokens((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // Handlers for Logs
  const handleClearLogs = async () => {
    const res = await safeFetchJson<{ success?: boolean }>('/api/logs', { method: 'DELETE' });
    if (res.data?.success) {
      setLogs([]);
    }
  };

  const handleRefreshLogs = async () => {
    const [logsRes, keysRes] = await Promise.all([
      safeFetchJson<{ logs?: UsageLog[] }>('/api/logs'),
      safeFetchJson<{ keys?: ApiKeyItem[] }>('/api/keys'),
    ]);
    if (logsRes.data?.logs) {
      setLogs(logsRes.data.logs);
    }
    if (keysRes.data?.keys) {
      setKeys(keysRes.data.keys);
    }
  };

  // Handlers for Settings
  const handleUpdateSettings = async (newSettings: Partial<RouterSettings>) => {
    const res = await safeFetchJson<{ success?: boolean; settings?: RouterSettings }>('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    if (res.data?.success && res.data.settings) {
      setSettings(res.data.settings);
    }
  };

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#0B0D10] text-[#E1E4EA]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddKey={() => {
          setActiveTab('keys');
          setIsAddKeyModalOpen(true);
        }}
        totalKeysCount={keys.length}
        user={user}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onLogout={handleLogout}
        databaseStatus={dbStatus}
      />

      {/* Main Content Area */}
      <div className="flex min-h-[calc(100vh-120px)] w-full max-w-full flex-col overflow-x-hidden">
        <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-6 sm:py-8 min-w-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex items-center space-x-3 text-sm text-[#8A94A6]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#5B6CFF] border-t-transparent" />
                <span>Initializing Gateway Mesh & Encrypted Vault...</span>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  keys={keys}
                  logs={logs}
                  settings={settings}
                  onNavigateToTester={() => setActiveTab('simulator')}
                  onNavigateToKeys={() => setActiveTab('keys')}
                />
              )}

              {activeTab === 'keys' && (
                <KeyVaultView
                  keys={keys}
                  onAddKey={handleAddKey}
                  onToggleKey={handleToggleKey}
                  onDeleteKey={handleDeleteKey}
                  onTestKey={handleTestKey}
                  onUpdateKey={handleUpdateKey}
                  isAddModalOpen={isAddKeyModalOpen}
                  setIsAddModalOpen={setIsAddKeyModalOpen}
                />
              )}

              {activeTab === 'simulator' && (
                <ContinuousFlowTester
                  keys={keys}
                  onRefreshLogs={handleRefreshLogs}
                />
              )}

              {activeTab === 'tokens' && (
                <RouterTokensView
                  tokens={tokens}
                  onCreateToken={handleCreateToken}
                  onRevokeToken={handleRevokeToken}
                />
              )}

              {activeTab === 'logs' && (
                <UsageLogsView logs={logs} onClearLogs={handleClearLogs} />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  settings={settings}
                  user={user}
                  onUpdateSettings={handleUpdateSettings}
                  onOpenAuthModal={() => setIsAuthModalOpen(true)}
                  onLogout={handleLogout}
                  databaseStatus={dbStatus}
                  onTestDatabase={handleTestDatabase}
                  onSyncDatabase={handleSyncDatabase}
                  isDbTesting={isDbTesting}
                  isDbSyncing={isDbSyncing}
                />
              )}
            </>
          )}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-white/[0.04] bg-[#0B0D10]/90 py-4 text-center text-xs text-[#6C768A]">
          <div className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 text-center sm:text-left">
            <span>Nexus Router Gateway • Port 3000 Ingress</span>
            <span>AES-256-GCM Encrypted Vault • PBKDF2 Manual Authentication</span>
          </div>
        </footer>
      </div>

      {/* Auth Modal for Settings View button */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        currentUser={user}
      />
    </div>
  );
}
