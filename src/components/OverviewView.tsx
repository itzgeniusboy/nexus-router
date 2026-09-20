import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  Globe,
  HardDrive,
  HelpCircle,
  Key,
  Layers,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { PROVIDERS } from '../data/providers';
import { ApiKeyItem, ProviderId, RouterSettings, UsageLog } from '../types';
import { ProviderIcon } from './ProviderIcon';
import { ThreeCanvas } from './ThreeCanvas';

interface Props {
  keys: ApiKeyItem[];
  logs: UsageLog[];
  settings: RouterSettings;
  onNavigateToTester: () => void;
  onNavigateToKeys: () => void;
}

export const OverviewView: React.FC<Props> = ({
  keys,
  logs,
  settings,
  onNavigateToTester,
  onNavigateToKeys,
}) => {
  const activeKeys = keys.filter((k) => k.enabled && k.status === 'active');
  const totalRequests = keys.reduce((acc, k) => acc + (k.totalRequests || 0), 0);
  const totalTokens = keys.reduce((acc, k) => acc + (k.tokensUsed || 0), 0);
  const avgLatency = Math.round(
    keys.reduce((acc, k) => acc + (k.lastLatencyMs || 350), 0) / (keys.length || 1)
  );

  // Group keys by provider
  const providerStats = PROVIDERS.map((prov) => {
    const provKeys = keys.filter((k) => k.provider === prov.id);
    const activeProvKeys = provKeys.filter((k) => k.enabled && k.status === 'active');
    const totalProvRequests = provKeys.reduce((acc, k) => acc + (k.totalRequests || 0), 0);
    const minLatency = provKeys.reduce((min, k) => (k.lastLatencyMs && k.lastLatencyMs < min ? k.lastLatencyMs : min), 9999);
    return {
      provider: prov,
      totalKeys: provKeys.length,
      activeKeys: activeProvKeys.length,
      requests: totalProvRequests,
      latency: minLatency === 9999 ? 0 : minLatency,
      hasKey: provKeys.length > 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Hero / Gateway Status Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#121620] via-[#10131A] to-[#0D0F14] p-6 shadow-xl">
        {/* Animated 3D background behind dashboard hero only */}
        <ThreeCanvas className="opacity-75" />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#5B6CFF]">
              <ShieldCheck className="h-4 w-4" />
              <span>Nexus Router Gateway</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Zero-Downtime Multi-Provider Key Rotation
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#8A94A6]">
              All your client apps and autonomous agents call a single unified endpoint. The gateway
              authenticates requests, auto-rotates across your Gmail accounts, and seamlessly falls
              back if a key encounters rate limits.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <button
              id="hero-test-flow-btn"
              onClick={onNavigateToTester}
              className="flex w-full sm:w-auto items-center justify-center space-x-2 rounded-xl bg-[#5B6CFF] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#5B6CFF]/20 transition hover:bg-[#4E5EEB] active:scale-[0.98] text-center"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Simulate Continuous Fallback</span>
            </button>
            <button
              id="hero-view-vault-btn"
              onClick={onNavigateToKeys}
              className="flex w-full sm:w-auto items-center justify-center space-x-2 rounded-xl border border-white/[0.1] bg-[#141822] px-4 py-2.5 text-sm font-medium text-[#C5CEE0] transition hover:border-white/[0.2] hover:text-white text-center"
            >
              <Key className="h-4 w-4 text-[#8A94A6]" />
              <span>Manage Key Vault</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative grid effect */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#5B6CFF]/10 blur-3xl" />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#141720]/80 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#7E8B9F]">Total Requests</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5B6CFF]/10 text-[#5B6CFF]">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white">{totalRequests.toLocaleString()}</span>
            <span className="text-xs text-emerald-400">100% routed</span>
          </div>
          <p className="mt-1 text-xs text-[#6C768A]">Across all active client sessions</p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#141720]/80 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#7E8B9F]">Vaulted Keys</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Key className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white">{activeKeys.length}</span>
            <span className="text-xs text-[#8A94A6]">/ {keys.length} configured</span>
          </div>
          <p className="mt-1 text-xs text-[#6C768A]">Rotated automatically per request</p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#141720]/80 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#7E8B9F]">Tokens Processed</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {totalTokens > 1000000 ? (totalTokens / 1000000).toFixed(2) + 'M' : totalTokens.toLocaleString()}
            </span>
            <span className="text-xs text-[#8A94A6]">tokens</span>
          </div>
          <p className="mt-1 text-xs text-[#6C768A]">Est. Cost Savings: ~$42.80</p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#141720]/80 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#7E8B9F]">Fallback Health</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white">99.8%</span>
            <span className="text-xs text-emerald-400">Continuity</span>
          </div>
          <p className="mt-1 text-xs text-[#6C768A]">Auto-recovers 429 rate-limits</p>
        </div>
      </div>

      {/* Provider Mesh Status Matrix */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/70 p-6 backdrop-blur-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-white">Provider Availability & Key Mesh</h2>
            <p className="text-xs text-[#8A94A6]">Real-time rotation pools across providers</p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-[#717B8F]">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span>Active Pool</span>
            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-white/20" />
            <span>Unconfigured</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {providerStats.map((item) => (
            <div
              key={item.provider.id}
              className={`flex items-center justify-between rounded-xl border p-3.5 transition ${
                item.hasKey
                  ? 'border-white/[0.1] bg-[#161B26]/90 hover:border-white/[0.18]'
                  : 'border-white/[0.03] bg-white/[0.01] opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: `${item.provider.color}20`, color: item.provider.color }}
                >
                  <ProviderIcon provider={item.provider.id} size={18} />
                </div>
                <div className="truncate">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="truncate text-xs font-semibold text-white">{item.provider.name}</span>
                  </div>
                  <span className="text-[11px] text-[#717B8F]">{item.provider.defaultModel}</span>
                </div>
              </div>

              <div className="text-right">
                {item.hasKey ? (
                  <>
                    <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                      {item.activeKeys} active
                    </span>
                    <p className="mt-0.5 text-[10px] text-[#6C768A]">
                      {item.latency > 0 ? `${item.latency}ms` : 'Ready'}
                    </p>
                  </>
                ) : (
                  <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-[#6C768A]">
                    No key
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Live Stream / Logs preview + Unified Endpoint Snippet */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Live Rotation Feed */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/70 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Live Router Activity Feed</h3>
              <p className="text-xs text-[#8A94A6]">Recent requests dispatched through the gateway</p>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>Streaming</span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {logs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between rounded-xl border border-white/[0.06] bg-[#161B26]/60 p-3 text-xs"
              >
                <div className="flex items-start space-x-2.5 truncate">
                  <div className="mt-0.5 shrink-0 text-[#5B6CFF]">
                    <ProviderIcon provider={log.provider} size={16} />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-medium text-white">{log.keyLabel}</span>
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.2 text-[10px] text-[#8A94A6]">
                        {log.model}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-[#717B8F]">{log.promptPreview || 'Prompt processed'}</p>
                  </div>
                </div>

                <div className="ml-3 shrink-0 text-right">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      log.status === 'fallback_recovered'
                        ? 'border border-amber-500/30 bg-amber-500/10 text-amber-400'
                        : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {log.status === 'fallback_recovered' ? 'Recovered' : 'Success'}
                  </span>
                  <p className="mt-0.5 text-[10px] text-[#6C768A]">{log.latencyMs}ms</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quick Integration Architecture */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/70 p-6 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-white">How Your Apps Connect</h3>
          <p className="text-xs text-[#8A94A6]">
            Configure your client tools once. The router handles all token management and failover.
          </p>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-white/[0.06] bg-[#0E1116] p-3 text-xs">
              <div className="flex items-center justify-between text-[#8A94A6]">
                <span className="font-mono text-[#5B6CFF]">POST /api/v1/route</span>
                <span className="text-[11px]">Unified Endpoint</span>
              </div>
              <p className="mt-1 text-[11px] text-[#9DA8BE]">
                Accepts provider parameter (or "auto"), automatically maps to healthiest key.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-[#0E1116] p-3 text-xs">
              <div className="flex items-center justify-between text-[#8A94A6]">
                <span className="font-mono text-emerald-400">POST /api/v1/chat/completions</span>
                <span className="text-[11px]">OpenAI Compatible</span>
              </div>
              <p className="mt-1 text-[11px] text-[#9DA8BE]">
                Drop-in replacement for OpenAI SDK, LangChain, n8n, and Cursor without changing payload structures.
              </p>
            </div>

            <div className="group relative flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 text-[#5B6CFF]" />
                <span className="text-xs font-medium text-white">Auto-Rotation Strategy</span>
                <HelpCircle className="h-3.5 w-3.5 text-[#5B6CFF]/60 group-hover:text-[#8C9BFF] transition-colors" />
              </div>
              <span className="rounded-md bg-[#5B6CFF]/20 px-2 py-0.5 text-xs font-medium capitalize text-[#8C9BFF]">
                {settings.rotationStrategy.replace('-', ' ')}
              </span>

              {/* Hover Tooltip explaining Rotation Strategy */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-xl border border-white/[0.12] bg-[#14161A] p-3 text-xs text-[#C5CEE0] opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-200 group-hover:opacity-100">
                <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 text-[#5B6CFF]" /> Rotation Strategy
                </p>
                <p className="leading-relaxed text-[11px] text-[#9DA8BE]">
                  Defines how client requests are distributed across active keys. <strong className="text-white">Priority-First</strong> exhausts Tier 1 keys before falling back. <strong className="text-white">Round-Robin</strong> alternates evenly to prevent provider throttling. <strong className="text-white">Least-Latency</strong> dynamically selects the lowest ping key.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
