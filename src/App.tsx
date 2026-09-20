import React, { useEffect, useState } from 'react';
import { ContinuousFlowTester } from './components/ContinuousFlowTester';
import { KeyVaultView } from './components/KeyVaultView';
import { Navbar } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { RouterTokensView } from './components/RouterTokensView';
import { SettingsView } from './components/SettingsView';
import { UsageLogsView } from './components/UsageLogsView';
import {
  ApiKeyItem,
  GmailAccount,
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
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [selectedGmail, setSelectedGmail] = useState<string>('all');
  const [user, setUser] = useState<UserProfile | null>(null);
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
      const [sessionRes, keysRes, tokensRes, logsRes, gmailRes, settingsRes] = await Promise.all([
        fetch('/api/auth/session').then((r) => r.json()).catch(() => ({})),
        fetch('/api/keys').then((r) => r.json()).catch(() => ({})),
        fetch('/api/tokens').then((r) => r.json()).catch(() => ({})),
        fetch('/api/logs').then((r) => r.json()).catch(() => ({})),
        fetch('/api/gmail-accounts').then((r) => r.json()).catch(() => ({})),
        fetch('/api/settings').then((r) => r.json()).catch(() => ({})),
      ]);

      if (sessionRes.user) {
        setUser(sessionRes.user);
      }
      if (keysRes.keys) setKeys(keysRes.keys);
      if (tokensRes.tokens) setTokens(tokensRes.tokens);
      if (logsRes.logs) setLogs(logsRes.logs);
      if (gmailRes.accounts) {
        setGmailAccounts(gmailRes.accounts);
        if (selectedGmail === 'all' && gmailRes.accounts.length > 0) {
          // Keep 'all' or default to primary
        }
      }
      if (settingsRes.settings) setSettings(settingsRes.settings);
    } catch (err) {
      console.error('Error fetching dashboard state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers for Google Auth Connection
  const handleConnectGoogle = async (email: string, name?: string) => {
    try {
      const res = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        setSelectedGmail(data.user.email);
        // Refresh accounts and keys
        const accRes = await fetch('/api/gmail-accounts').then((r) => r.json());
        if (accRes.accounts) setGmailAccounts(accRes.accounts);
      }
    } catch (err) {
      console.error('Failed to link Google account:', err);
    }
  };

  // Handlers for Key CRUD
  const handleAddKey = async (params: {
    provider: ProviderId;
    label: string;
    rawKey: string;
    gmailTag: string;
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
      // refresh gmail counts
      fetch('/api/gmail-accounts')
        .then((r) => r.json())
        .then((d) => d.accounts && setGmailAccounts(d.accounts));
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

  const handleAddGmailAccount = async (email: string, name: string) => {
    const res = await fetch('/api/gmail-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    const data = await res.json();
    if (data.success && data.account) {
      setGmailAccounts((prev) => [...prev, data.account]);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0B0D10] text-[#E1E4EA]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        gmailAccounts={gmailAccounts}
        selectedGmail={selectedGmail}
        setSelectedGmail={setSelectedGmail}
        onOpenAddKey={() => setIsAddKeyModalOpen(true)}
        onOpenAddGmail={() => setActiveTab('settings')}
        totalKeysCount={keys.length}
        user={user}
        onConnectGoogle={handleConnectGoogle}
      />

      {/* Main Content Area - Clean, Flat, High-Legibility Data Views */}
      <div className="flex min-h-[calc(100vh-120px)] flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
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
                  gmailAccounts={gmailAccounts}
                  selectedGmail={selectedGmail}
                  setSelectedGmail={setSelectedGmail}
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
                  selectedGmail={selectedGmail}
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
                  gmailAccounts={gmailAccounts}
                  onUpdateSettings={handleUpdateSettings}
                  onAddGmailAccount={handleAddGmailAccount}
                />
              )}
            </>
          )}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-white/[0.04] bg-[#0B0D10]/90 py-4 text-center text-xs text-[#6C768A]">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <span>Nexus Router Gateway • Port 3000 Ingress</span>
            <span>AES-256-GCM Encrypted Vault • Rate-Limit Auto-Rotation Active</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
