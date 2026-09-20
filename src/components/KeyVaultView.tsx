import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  HelpCircle,
  Lock,
  Plus,
  Power,
  RefreshCw,
  Search,
  Sliders,
  Trash2,
  Zap,
} from 'lucide-react';
import { detectProviderFromKey, PROVIDERS } from '../data/providers';
import { ApiKeyItem, GmailAccount, ProviderId } from '../types';
import { ProviderIcon } from './ProviderIcon';

interface Props {
  keys: ApiKeyItem[];
  gmailAccounts?: GmailAccount[];
  selectedGmail?: string;
  setSelectedGmail?: (email: string) => void;
  onAddKey: (params: {
    provider: ProviderId;
    label: string;
    rawKey: string;
    gmailTag?: string;
    priority: number;
    customBaseUrl?: string;
    customAuthHeader?: string;
  }) => Promise<{ success: boolean; error?: string; key?: ApiKeyItem } | void>;
  onToggleKey: (id: string, enabled: boolean) => Promise<void>;
  onDeleteKey: (id: string) => Promise<void>;
  onTestKey: (id: string) => Promise<{ latencyMs: number }>;
  onUpdateKey: (id: string, updates: Partial<ApiKeyItem>) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  isLoading?: boolean;
}

export const KeyVaultView: React.FC<Props> = ({
  keys,
  onAddKey,
  onToggleKey,
  onDeleteKey,
  onTestKey,
  onUpdateKey,
  isAddModalOpen,
  setIsAddModalOpen,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<string, boolean>>({});
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testSuccessMessage, setTestSuccessMessage] = useState<{ id: string; msg: string } | null>(null);

  // Add Key Form State
  const [newProvider, setNewProvider] = useState<ProviderId>('openai');
  const [providerManuallySelected, setProviderManuallySelected] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newRawKey, setNewRawKey] = useState('');
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [newPriority, setNewPriority] = useState(1);
  const [newCustomBaseUrl, setNewCustomBaseUrl] = useState('');
  const [newCustomAuthHeader, setNewCustomAuthHeader] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Key Modal State
  const [editingKey, setEditingKey] = useState<ApiKeyItem | null>(null);

  // Auto-detect provider as user types the API key
  const handleKeyInputChange = (val: string) => {
    setNewRawKey(val);
    if (modalError) setModalError(null);
    if (!providerManuallySelected && val.trim().length > 4) {
      const detected = detectProviderFromKey(val);
      if (detected !== 'custom' && detected !== newProvider) {
        setNewProvider(detected);
      }
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newRawKey.trim();
    if (!cleanKey) {
      setModalError('Please enter an API secret key.');
      return;
    }
    if (cleanKey.length < 3) {
      setModalError('API key must be at least 3 characters long.');
      return;
    }

    setModalError(null);
    setIsSubmitting(true);
    try {
      const result = await onAddKey({
        provider: newProvider,
        label: newLabel.trim() || `${newProvider.toUpperCase()} Key`,
        rawKey: cleanKey,
        priority: newPriority,
        customBaseUrl: newProvider === 'custom' && newCustomBaseUrl.trim() ? newCustomBaseUrl.trim() : undefined,
        customAuthHeader: newProvider === 'custom' && newCustomAuthHeader.trim() ? newCustomAuthHeader.trim() : undefined,
      });

      if (result && typeof result === 'object' && result.success === false) {
        setModalError(result.error || 'Server could not save this key. Please check the key format.');
        return;
      }

      // Reset form on success
      setNewRawKey('');
      setNewLabel('');
      setNewCustomBaseUrl('');
      setNewCustomAuthHeader('');
      setModalError(null);
      setShowKeyPassword(false);
      setProviderManuallySelected(false);
      setIsAddModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Failed to add key to vault');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestSingleKey = async (id: string) => {
    setTestingKeyId(id);
    try {
      const res = await onTestKey(id);
      setTestSuccessMessage({ id, msg: `Verified in ${res.latencyMs}ms` });
      setTimeout(() => setTestSuccessMessage(null), 3500);
    } catch (e) {
      setTestSuccessMessage({ id, msg: `Test failed` });
      setTimeout(() => setTestSuccessMessage(null), 3500);
    } finally {
      setTestingKeyId(null);
    }
  };

  // Filter keys
  const filteredKeys = keys.filter((key) => {
    const matchesProvider = providerFilter === 'all' || key.provider === providerFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      key.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.maskedKey.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProvider && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter & Search Bar with Glassmorphism */}
      <div className="flex flex-col gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md md:flex-row md:items-center md:justify-between shadow-lg">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-auto sm:min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6C768A]" />
            <input
              id="search-keys-input"
              type="text"
              placeholder="Search keys by label, masked prefix..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0B0D10]/80 py-2 pl-9 pr-4 text-xs text-white placeholder-[#6C768A] focus:border-[#5B6CFF] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Provider Filter Dropdown */}
            <div className="flex items-center space-x-1.5 flex-1 sm:flex-none">
              <Filter className="h-3.5 w-3.5 text-[#6C768A] shrink-0" />
              <select
                id="provider-filter-select"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="w-full sm:w-auto rounded-xl border border-white/[0.14] bg-[#141724] px-2.5 sm:px-3 py-2 text-xs text-white focus:border-[#5B6CFF] focus:outline-none cursor-pointer [&>option]:bg-[#161924] [&>option]:text-white truncate"
              >
                <option value="all">All Providers ({keys.length})</option>
                {PROVIDERS.map((p) => {
                  const count = keys.filter((k) => k.provider === p.id).length;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} {count > 0 ? `(${count})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Add Key Button */}
        <button
          id="vault-add-key-btn"
          onClick={() => setIsAddModalOpen(true)}
          className="flex w-full sm:w-auto items-center justify-center space-x-2 rounded-xl bg-[#5B6CFF] px-4 py-2.5 sm:py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#4E5EEB] active:scale-[0.98] shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add New API Key</span>
        </button>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-44 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
            />
          ))}
        </div>
      )}

      {/* Keys Grid */}
      {!isLoading && filteredKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-12 text-center backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#14161A] text-[#6C768A]">
            <Lock className="h-6 w-6 text-[#5B6CFF]" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-white">No API Keys Found in Vault</h3>
          <p className="mt-1 max-w-sm text-xs text-[#8A94A6]">
            {searchQuery || providerFilter !== 'all'
              ? 'No keys match your current filter criteria. Try clearing filters or searching for another term.'
              : 'Securely store provider API keys with AES-256-GCM encryption to enable continuous flow auto-rotation.'}
          </p>
          <div className="mt-4 flex items-center space-x-3">
            {(searchQuery || providerFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setProviderFilter('all');
                }}
                className="text-xs text-[#5B6CFF] hover:underline"
              >
                Clear all filters
              </button>
            )}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-xl bg-[#5B6CFF] px-4 py-2 text-xs font-medium text-white hover:bg-[#4E5EEB]"
            >
              Add Your First Key
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredKeys.map((key) => {
            const providerMeta = PROVIDERS.find((p) => p.id === key.provider) || PROVIDERS[0];
            const isRevealed = revealedKeyIds[key.id] || false;
            const isTesting = testingKeyId === key.id;
            const successMsg = testSuccessMessage?.id === key.id ? testSuccessMessage.msg : null;

            return (
              <div
                key={key.id}
                className={`relative rounded-2xl border p-5 transition-all backdrop-blur-md shadow-md hover:z-20 ${
                    !key.enabled
                    ? 'border-white/[0.04] bg-white/[0.01] opacity-60'
                    : key.status === 'rate-limited' || key.status === 'cooldown'
                    ? 'border-amber-500/30 bg-amber-500/[0.03]'
                    : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14]'
                }`}
              >
                {/* Header: Provider & Actions */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06]"
                      style={{ backgroundColor: `${providerMeta.color}20`, color: providerMeta.color }}
                    >
                      <ProviderIcon provider={key.provider} size={20} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-white">{key.label}</h4>
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-[#8A94A6]">
                          {providerMeta.name}
                        </span>
                      </div>
                      {/* Key ID & Provider info */}
                      <div className="mt-1 flex items-center space-x-1.5 text-xs text-[#717B8F]">
                        <span className="font-mono text-[10px] text-[#5B6CFF]">{key.id}</span>
                        <span className="text-white/[0.2]">•</span>
                        <span className="text-[11px] text-[#8A94A6]">Priority Tier P{key.priority}</span>
                      </div>
                    </div>
                  </div>

                  {/* Priority and Status Badges */}
                  <div className="flex items-center space-x-2">
                    <div className="group relative cursor-help">
                      <span
                        className={`inline-flex items-center space-x-1 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                          key.priority === 1
                            ? 'bg-[#5B6CFF]/20 text-[#8C9BFF]'
                            : key.priority === 2
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-white/[0.08] text-[#8A94A6]'
                        }`}
                      >
                        <span>P{key.priority}</span>
                      </span>

                      {/* Floating hover tooltip */}
                      <div className="pointer-events-none absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-white/[0.12] bg-[#14161A] p-2.5 text-xs text-[#C5CEE0] opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-200 group-hover:opacity-100">
                        <p className="font-semibold text-white mb-0.5">Priority Tier: P{key.priority}</p>
                        <p className="text-[11px] leading-relaxed text-[#9DA8BE]">
                          {key.priority === 1
                            ? 'Tier 1 Primary: Routed first during normal execution. Preferred if healthy.'
                            : `Tier ${key.priority} Backup: Automatically engaged with zero client drop if P${key.priority - 1} encounters rate limits.`}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center space-x-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                        !key.enabled
                          ? 'bg-white/[0.05] text-[#6C768A]'
                          : key.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : key.status === 'rate-limited' || key.status === 'cooldown'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          !key.enabled
                            ? 'bg-[#6C768A]'
                            : key.status === 'active'
                            ? 'bg-emerald-400'
                            : key.status === 'rate-limited' || key.status === 'cooldown'
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-rose-400'
                        }`}
                      />
                      <span className="capitalize">{!key.enabled ? 'Disabled' : key.status.replace('-', ' ')}</span>
                    </span>
                  </div>
                </div>

                {/* Key Masked Row with Authenticated AES Badge */}
                <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.04] bg-[#0B0D10]/80 px-3 py-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <Lock className="h-3.5 w-3.5 text-[#5B6CFF]" />
                    <span className="font-mono text-[#C5CEE0]">
                      {isRevealed ? key.maskedKey.replace('••••••••', '•AES-GCM-LIVE•') : key.maskedKey}
                    </span>
                    <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] font-medium text-emerald-400">
                      AES-256-GCM
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-[#8A94A6]">
                    <button
                      onClick={() =>
                        setRevealedKeyIds({ ...revealedKeyIds, [key.id]: !isRevealed })
                      }
                      title={isRevealed ? 'Hide Preview' : 'Reveal Mask Preview'}
                      className="rounded p-1 hover:bg-white/[0.06] hover:text-white"
                    >
                      {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(key.maskedKey)}
                      title="Copy Masked Key"
                      className="rounded p-1 hover:bg-white/[0.06] hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics Footer */}
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/[0.04] pt-3 text-xs text-[#8A94A6]">
                  <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1">
                    <div>
                      <span className="text-[#6C768A]">Requests: </span>
                      <span className="font-medium text-white">{key.totalRequests}</span>
                    </div>
                    <div>
                      <span className="text-[#6C768A]">Tokens: </span>
                      <span className="font-medium text-white">{key.tokensUsed.toLocaleString()}</span>
                    </div>
                    {key.lastLatencyMs !== undefined && key.lastLatencyMs > 0 && (
                      <div>
                        <span className="text-[#6C768A]">Latency: </span>
                        <span className="font-medium text-[#8C9BFF]">{key.lastLatencyMs}ms</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5 self-end sm:self-auto shrink-0">
                    {successMsg && (
                      <span className="mr-2 text-[10px] font-medium text-emerald-400 animate-fade-in">
                        {successMsg}
                      </span>
                    )}

                    {/* Test Key Connection */}
                    <button
                      onClick={() => handleTestSingleKey(key.id)}
                      disabled={isTesting}
                      title="Test latency & provider connection"
                      className="flex items-center space-x-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-[#C5CEE0] hover:border-white/[0.14] hover:text-white"
                    >
                      <Zap className={`h-3 w-3 ${isTesting ? 'animate-spin text-amber-400' : 'text-[#5B6CFF]'}`} />
                      <span>{isTesting ? 'Testing...' : 'Ping'}</span>
                    </button>

                    {/* Edit Key */}
                    <button
                      onClick={() => setEditingKey(key)}
                      title="Edit key configuration"
                      className="rounded-lg p-1 text-[#8A94A6] hover:bg-white/[0.06] hover:text-white"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Toggle Enable */}
                    <button
                      onClick={() => onToggleKey(key.id, !key.enabled)}
                      title={key.enabled ? 'Disable Key' : 'Enable Key'}
                      className={`rounded-lg p-1 ${
                        key.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-[#6C768A] hover:text-white'
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete Key */}
                    <button
                      onClick={() => {
                        if (confirm(`Remove "${key.label}" from key vault?`)) {
                          onDeleteKey(key.id);
                        }
                      }}
                      title="Delete Key"
                      className="rounded-lg p-1 text-[#8A94A6] hover:bg-rose-500/20 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD KEY MODAL */}
      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="my-auto flex w-full max-w-lg max-h-[90vh] flex-col rounded-2xl border border-white/[0.14] bg-[#161924] shadow-2xl shadow-black animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/[0.08] p-5 pb-4 shrink-0 bg-[#191D2B] rounded-t-2xl">
              <div className="flex items-center space-x-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5B6CFF]/20 text-[#5B6CFF] border border-[#5B6CFF]/30">
                  <Lock className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-white">Add New API Key to Vault</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs text-[#8A94A6] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="flex flex-col overflow-hidden">
              <div className="overflow-y-auto p-5 space-y-4 max-h-[calc(90vh-140px)]">
                {/* Error Banner if any */}
                {modalError && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 p-3.5 text-xs text-rose-200 flex items-start space-x-2.5 animate-in fade-in duration-150">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold text-rose-300">Error adding key: </span>
                      <span className="text-white/90">{modalError}</span>
                    </div>
                  </div>
                )}

                {/* Provider Selector Grid */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-[#C5CEE0]">Select AI Provider</label>
                    <span className="text-[10px] text-[#5B6CFF] font-medium uppercase tracking-wider">
                      Active: {newProvider}
                    </span>
                  </div>
                  <div className="mt-1.5 grid max-h-36 grid-cols-3 gap-2 overflow-y-auto pr-1">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setNewProvider(p.id);
                          setProviderManuallySelected(true);
                          if (modalError) setModalError(null);
                        }}
                        className={`flex items-center space-x-2 rounded-xl border p-2 text-left text-xs transition ${
                          newProvider === p.id
                            ? 'border-[#5B6CFF] bg-[#5B6CFF]/20 text-white shadow-sm ring-1 ring-[#5B6CFF]'
                            : 'border-white/[0.06] bg-[#0B0D10]/70 text-[#8A94A6] hover:text-white'
                        }`}
                      >
                        <ProviderIcon provider={p.id} size={14} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Raw Key Input with Eye toggle & Paste */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-[#C5CEE0]">API Secret Key</label>
                    {typeof navigator !== 'undefined' && navigator.clipboard && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) handleKeyInputChange(text.trim());
                          } catch {}
                        }}
                        className="text-[11px] text-[#5B6CFF] hover:text-[#8C9BFF] transition flex items-center space-x-1"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Paste from clipboard</span>
                      </button>
                    )}
                  </div>
                  <div className="relative mt-1">
                    <input
                      id="modal-raw-key-input"
                      type={showKeyPassword ? 'text' : 'password'}
                      placeholder="e.g. sk-..., gsk_..., AIzaSy..."
                      value={newRawKey}
                      onChange={(e) => handleKeyInputChange(e.target.value)}
                      required
                      autoFocus
                      className="w-full rounded-xl border border-white/[0.15] bg-[#0E121B] px-3 py-2 pr-10 text-xs font-mono text-white placeholder-[#6C768A] focus:border-[#5B6CFF] focus:bg-[#121622] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyPassword(!showKeyPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717B8F] hover:text-white transition p-1"
                      title={showKeyPassword ? 'Hide key' : 'Show key'}
                    >
                      {showKeyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <span className="mt-1 block text-[11px] text-[#717B8F]">
                    Encrypted at rest with AES-256-GCM. Never logged or exposed in client responses.
                  </span>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-xs font-medium text-[#C5CEE0]">Key Friendly Label</label>
                  <input
                    type="text"
                    placeholder={`e.g. Personal ${newProvider.toUpperCase()} #1`}
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/[0.15] bg-[#0E121B] px-3 py-2 text-xs text-white placeholder-[#6C768A] focus:border-[#5B6CFF] focus:bg-[#121622] focus:outline-none"
                  />
                </div>

                {/* Priority Selection with Tooltips */}
                <div>
                  <div className="flex items-center space-x-1.5">
                    <label className="block text-xs font-medium text-[#C5CEE0]">
                      Rotation Priority / Weight
                    </label>
                    <div className="group relative cursor-help">
                      <HelpCircle className="h-3.5 w-3.5 text-[#5B6CFF]/80 group-hover:text-[#8C9BFF] transition-colors" />
                      <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-white/[0.12] bg-[#14161A] p-3 text-xs text-[#C5CEE0] opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-200 group-hover:opacity-100">
                        <p className="font-semibold text-white mb-1">Rotation Priority Tiers</p>
                        <p className="text-[11px] leading-relaxed text-[#9DA8BE]">
                          <strong className="text-white">P1 (Primary):</strong> First line of routing. Requests use healthy P1 keys.<br />
                          <strong className="text-white">P2 (Secondary):</strong> Standby backup if P1 keys hit rate limits or downtime.<br />
                          <strong className="text-white">P3 (Emergency):</strong> Ultimate fallback pool for 100% zero-drop uptime.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {[
                      { val: 1, title: 'P1 - Primary', desc: 'Lower number = tried first in rotation' },
                      { val: 2, title: 'P2 - Secondary', desc: 'Rotated if P1 is busy' },
                      { val: 3, title: 'P3 - Fallback', desc: 'Emergency backup' },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setNewPriority(p.val)}
                        className={`rounded-xl border p-2 text-left text-xs transition ${
                          newPriority === p.val
                            ? 'border-[#5B6CFF] bg-[#5B6CFF]/15 text-white'
                            : 'border-white/[0.06] bg-[#0B0D10] text-[#8A94A6] hover:text-white'
                        }`}
                      >
                        <div className="font-semibold">{p.title}</div>
                        <div className="text-[10px] text-[#6C768A] leading-tight mt-0.5">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* If Custom Provider: Base URL & Auth Header */}
                {newProvider === 'custom' && (
                  <div className="space-y-3 rounded-xl border border-white/[0.06] bg-[#0B0D10]/50 p-3">
                    <div>
                      <label className="block text-xs font-medium text-[#C5CEE0]">
                        Custom OpenAI-Compatible Endpoint URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://your-custom-llm-host.com/v1/chat/completions"
                        value={newCustomBaseUrl}
                        onChange={(e) => setNewCustomBaseUrl(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0B0D10] px-3 py-2 text-xs text-white placeholder-[#6C768A] focus:border-[#5B6CFF] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#C5CEE0]">
                        Custom Authorization Header (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Bearer ${KEY} or api-key: ${KEY}"
                        value={newCustomAuthHeader}
                        onChange={(e) => setNewCustomAuthHeader(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0B0D10] px-3 py-2 text-xs text-white placeholder-[#6C768A] focus:border-[#5B6CFF] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:space-x-3 border-t border-white/[0.08] bg-[#191D2B] p-4 shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full sm:w-auto rounded-xl border border-white/[0.1] bg-[#141822] px-4 py-2.5 sm:py-2 text-xs font-medium text-[#8A94A6] hover:text-white transition text-center"
                >
                  Cancel
                </button>
                <button
                  id="submit-add-key-btn"
                  type="submit"
                  disabled={isSubmitting || !newRawKey.trim()}
                  className="w-full sm:w-auto rounded-xl bg-[#5B6CFF] px-4 py-2.5 sm:py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#4E5EEB] disabled:opacity-50 text-center"
                >
                  {isSubmitting ? 'Encrypting with AES-256-GCM...' : 'Vault & Encrypt Key'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT KEY MODAL */}
      {editingKey && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.14] bg-[#161924] p-6 shadow-2xl shadow-black animate-in zoom-in-95 duration-150">
            <h3 className="font-semibold text-white">Edit Key Configuration</h3>
            <p className="text-xs text-[#8A94A6]">Update label, Gmail tag, or rotation priority</p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#C5CEE0]">Label</label>
                <input
                  type="text"
                  value={editingKey.label}
                  onChange={(e) => setEditingKey({ ...editingKey, label: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/[0.15] bg-[#0E121B] px-3 py-2 text-xs text-white focus:border-[#5B6CFF] focus:bg-[#121622] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#C5CEE0]">Rotation Priority</label>
                <select
                  value={editingKey.priority}
                  onChange={(e) => setEditingKey({ ...editingKey, priority: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-white/[0.14] bg-[#0E121B] px-3 py-2 text-xs text-white focus:border-[#5B6CFF] focus:outline-none [&>option]:bg-[#161924] [&>option]:text-white"
                >
                  <option value={1}>P1 - Primary (Tried First)</option>
                  <option value={2}>P2 - Secondary (Rotated if P1 busy)</option>
                  <option value={3}>P3 - Fallback (Emergency Backup)</option>
                </select>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:space-x-3 border-t border-white/[0.08] pt-4">
                <button
                  type="button"
                  onClick={() => setEditingKey(null)}
                  className="w-full sm:w-auto rounded-xl border border-white/[0.1] bg-[#141822] px-4 py-2.5 sm:py-2 text-xs font-medium text-[#8A94A6] hover:text-white transition text-center"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await onUpdateKey(editingKey.id, {
                      label: editingKey.label,
                      priority: editingKey.priority,
                    });
                    setEditingKey(null);
                  }}
                  className="w-full sm:w-auto rounded-xl bg-[#5B6CFF] px-4 py-2.5 sm:py-2 text-xs font-medium text-white hover:bg-[#4E5EEB] transition text-center"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
