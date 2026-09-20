import React, { useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { ContinuousFlowTester } from './components/ContinuousFlowTester';
import { KeyVaultView } from './components/KeyVaultView';
import { Navbar } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { RouterTokensView } from './components/RouterTokensView';
import { SettingsView } from './components/SettingsView';
import { UsageLogsView } from './components/UsageLogsView';
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

  // Fetch initial dashboard state & user session
  const fetchData = async () => {
    try {
      const [sessionRes, keysRes, tokensRes, logsRes, settingsRes, dbRes] = await Promise.all([
        fetch('/api/auth/session').then((r) => r.json()).catch(() => ({})),
        fetch('/api/keys').then((r) => r.json()).catch(() => ({})),
        fetch('/api/tokens').then((r) => r.json()).catch(() => ({})),
        fetch('/api/logs').then((r) => r.json()).catch(() => ({})),
        fetch('/api/settings').then((r) => r.json()).catch(() => ({})),
        fetch('/api/database/status').then((r) => r.json()).catch(() => ({})),
      ]);

      if (sessionRes.user) {
        setUser(sessionRes.user);
      } else {
        setUser(null);
      }
      if (keysRes.keys) setKeys(keysRes.keys);
      if (tokensRes.tokens) setTokens(tokensRes.tokens);
      if (logsRes.logs) setLogs(logsRes.logs);
      if (settingsRes.settings) setSettings(settingsRes.settings);
      if (dbRes.status) setDbStatus(dbRes.status);
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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to login');
    }
    setUser(data.user);
    // Reload user-scoped data
    const [keysRes, tokensRes, logsRes] = await Promise.all([
      fetch('/api/keys').then((r) => r.json()).catch(() => ({})),
      fetch('/api/tokens').then((r) => r.json()).catch(() => ({})),
      fetch('/api/logs').then((r) => r.json()).catch(() => ({})),
    ]);
    if (keysRes.keys) setKeys(keysRes.keys);
    if (tokensRes.tokens) setTokens(tokensRes.tokens);
    if (logsRes.logs) setLogs(logsRes.logs);
  };

  const handleRegister = async (username: string, password: string, name?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create account');
    }
    setUser(data.user);
    // Reload user-scoped data
    const [keysRes, tokensRes, logsRes] = await Promise.all([
      fetch('/api/keys').then((r) => r.json()).catch(() => ({})),
      fetch('/api/tokens').then((r) => r.json()).catch(() => ({})),
      fetch('/api/logs').then((r) => r.json()).catch(() => ({})),
    ]);
    if (keysRes.keys) setKeys(keysRes.keys);
    if (tokensRes.tokens) setTokens(tokensRes.tokens);
    if (logsRes.logs) setLogs(logsRes.logs);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      // Reload default keys
      const [keysRes, tokensRes, logsRes] = await Promise.all([
        fetch('/api/keys').then((r) => r.json()).catch(() => ({})),
        fetch('/api/tokens').then((r) => r.json()).catch(() => ({})),
        fetch('/api/logs').then((r) => r.json()).catch(() => ({})),
      ]);
      if (keysRes.keys) setKeys(keysRes.keys);
      if (tokensRes.tokens) setTokens(tokensRes.tokens);
      if (logsRes.logs) setLogs(logsRes.logs);
    }
  };

  // Database actions
  const handleTestDatabase = async () => {
    setIsDbTesting(true);
    try {
      const res = await fetch('/api/database/test', { method: 'POST' });
      const data = await res.json();
      if (data.status) {
        setDbStatus(data.status);
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
      const res = await fetch('/api/database/sync', { method: 'POST' });
      const data = await res.json();
      if (data.status) {
        setDbStatus(data.status);
      }
      const [keysRes, settingsRes] = await Promise.all([
        fetch('/api/keys').then((r) => r.json()).catch(() => ({})),
        fetch('/api/settings').then((r) => r.json()).catch(() => ({})),
      ]);
      if (keysRes.keys) setKeys(keysRes.keys);
      if (settingsRes.settings) setSettings(settingsRes.settings);
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
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (data.success && data.key) {
      setKeys((prev) => [data.key, ...prev]);
    }
  };

  const handleToggleKey = async (id: string, enabled: boolean) => {
    const res = await fetch(`/api/keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json();
    if (data.success && data.key) {
      setKeys((prev) => prev.map((k) => (k.id === id ? data.key : k)));
    }
  };

  const handleDeleteKey = async (id: string) => {
    const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
    }
  };

  const handleTestKey = async (id: string) => {
    const res = await fetch(`/api/keys/${id}/test`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, status: 'active', lastLatencyMs: data.latencyMs } : k))
      );
    }
    return data;
  };

  const handleUpdateKey = async (id: string, updates: Partial<ApiKeyItem>) => {
    const res = await fetch(`/api/keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.success && data.key) {
      setKeys((prev) => prev.map((k) => (k.id === id ? data.key : k)));
    }
  };

  // Handlers for Tokens
  const handleCreateToken = async (label: string, allowedProviders: string[]) => {
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, allowedProviders }),
    });
    const data = await res.json();
    if (data.success && data.token) {
      setTokens((prev) => [data.token, ...prev]);
    }
    return data;
  };

  const handleRevokeToken = async (id: string) => {
    const res = await fetch(`/api/tokens/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setTokens((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // Handlers for Logs
  const handleClearLogs = async () => {
    const res = await fetch('/api/logs', { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setLogs([]);
    }
  };

  const handleRefreshLogs = async () => {
    const res = await fetch('/api/logs');
    const data = await res.json();
    if (data.logs) {
      setLogs(data.logs);
    }
    // also refresh key usage metrics
    const keysRes = await fetch('/api/keys');
    const keysData = await keysRes.json();
    if (keysData.keys) setKeys(keysData.keys);
  };

  // Handlers for Settings
  const handleUpdateSettings = async (newSettings: Partial<RouterSettings>) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    const data = await res.json();
    if (data.success && data.settings) {
      setSettings(data.settings);
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
