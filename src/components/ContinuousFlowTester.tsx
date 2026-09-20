import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Play,
  RefreshCw,
  Shield,
  Zap,
} from 'lucide-react';
import { PROVIDERS } from '../data/providers';
import { ApiKeyItem, ProviderId } from '../types';
import { ProviderIcon } from './ProviderIcon';

interface Props {
  keys: ApiKeyItem[];
  onRefreshLogs: () => void;
  selectedGmail?: string;
}

export const ContinuousFlowTester: React.FC<Props> = ({ keys, onRefreshLogs, selectedGmail }) => {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | 'auto'>('auto');
  const [promptInput, setPromptInput] = useState(
    'Analyze the resilience of multi-key API rotation architectures for autonomous agents.'
  );
  const [simulateRateLimit, setSimulateRateLimit] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [stepState, setStepState] = useState<number>(0); // 0: idle, 1: auth, 2: routing, 3: dispatch, 4: complete

  const handleRunTest = async () => {
    setIsRunning(true);
    setExecutionResult(null);
    setStepState(1);

    try {
      // Step 1: Auth simulation
      await new Promise((r) => setTimeout(r, 200));
      setStepState(2);

      // Step 2: Routing algorithm evaluation
      await new Promise((r) => setTimeout(r, 250));
      setStepState(3);

      const res = await fetch('/api/v1/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer gw_live_8f49a2b9c7e1_master_router',
          'x-panel-origin': 'dashboard',
        },
        body: JSON.stringify({
          provider: selectedProvider,
          messages: [{ role: 'user', content: promptInput }],
          simulateRateLimitOnFirst: simulateRateLimit,
          gmailFilter: selectedGmail && selectedGmail !== 'all' ? selectedGmail : undefined,
        }),
      });

      const data = await res.json();
      setExecutionResult(data);
      setStepState(4);
      onRefreshLogs();
    } catch (err: any) {
      setExecutionResult({
        error: { message: err.message || 'Network dispatch failure' },
      });
      setStepState(4);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/70 p-6 backdrop-blur-sm">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#5B6CFF]">
          <RefreshCw className="h-4 w-4" />
          <span>Continuous Flow / Zero-Downtime Engine</span>
        </div>
        <h2 className="mt-1 text-xl font-bold text-white">Interactive Failover & Rotation Testbench</h2>
        <p className="mt-1 max-w-3xl text-xs text-[#8A94A6]">
          Test how the router protects your agent workflows from rate limits. When a primary key hits
          an HTTP 429 or quota limit, the router silently intercepts the failure, rotates to the next
          healthy key in your pool, and completes the request seamlessly.
        </p>
      </div>

      {/* Main interactive grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Request Configuration (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/80 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-white">1. Dispatch Parameters</h3>

            {/* Provider Picker */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-[#C5CEE0]">Target Provider</label>
              <select
                id="tester-provider-select"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0E1116] px-3 py-2 text-xs text-white focus:border-[#5B6CFF] focus:outline-none"
              >
                <option value="auto">Auto-Detect Model & Healthy Provider</option>
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.defaultModel})
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt input */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-[#C5CEE0]">Test Prompt</label>
              <textarea
                id="tester-prompt-textarea"
                rows={3}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Enter prompt to route..."
                className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0E1116] p-3 text-xs text-white placeholder-[#6C768A] focus:border-[#5B6CFF] focus:outline-none"
              />
            </div>

            {/* Continuous Failover Toggle */}
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
              <div className="flex items-start space-x-3">
                <input
                  id="simulate-ratelimit-checkbox"
                  type="checkbox"
                  checked={simulateRateLimit}
                  onChange={(e) => setSimulateRateLimit(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/[0.1] bg-[#0E1116] text-[#5B6CFF] focus:ring-0"
                />
                <div>
                  <label htmlFor="simulate-ratelimit-checkbox" className="text-xs font-medium text-amber-200">
                    Simulate 429 Rate-Limit on Key #1
                  </label>
                  <p className="mt-0.5 text-[11px] text-amber-300/70">
                    Triggers artificial key exhaustion so you can observe the automatic fallback in action.
                  </p>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button
              id="dispatch-test-btn"
              onClick={handleRunTest}
              disabled={isRunning || !promptInput.trim()}
              className="mt-5 flex w-full items-center justify-center space-x-2 rounded-xl bg-[#5B6CFF] py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#5B6CFF]/25 transition hover:bg-[#4E5EEB] active:scale-[0.99] disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Routing Request Through Mesh...' : 'Dispatch Request via Router'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Visual Mesh Pipeline & Results (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Visual Step Pipeline */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/80 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-white">2. Router Pipeline Execution State</h3>

            <div className="mt-4 space-y-3">
              {/* Step 1: Token Auth */}
              <div
                className={`flex items-center justify-between rounded-xl border p-3 text-xs transition ${
                  stepState >= 1
                    ? 'border-[#5B6CFF]/30 bg-[#5B6CFF]/10 text-white'
                    : 'border-white/[0.04] bg-[#0E1116] text-[#6C768A]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Shield className="h-4 w-4 text-[#5B6CFF]" />
                  <span className="font-medium">Master Token Verification</span>
                </div>
                <span>{stepState >= 1 ? 'Authenticated' : 'Waiting'}</span>
              </div>

              {/* Step 2: Pool & Key Selection */}
              <div
                className={`flex items-center justify-between rounded-xl border p-3 text-xs transition ${
                  stepState >= 2
                    ? 'border-[#5B6CFF]/30 bg-[#5B6CFF]/10 text-white'
                    : 'border-white/[0.04] bg-[#0E1116] text-[#6C768A]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <RefreshCw className="h-4 w-4 text-[#5B6CFF]" />
                  <span className="font-medium">Rotation Pool Evaluation</span>
                </div>
                <span>{stepState >= 2 ? 'Active Key Selected' : 'Waiting'}</span>
              </div>

              {/* Step 3: Upstream Call & Fallback */}
              <div
                className={`flex items-center justify-between rounded-xl border p-3 text-xs transition ${
                  stepState >= 3
                    ? simulateRateLimit
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-white/[0.04] bg-[#0E1116] text-[#6C768A]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Zap className="h-4 w-4" />
                  <span className="font-medium">
                    {simulateRateLimit ? 'Continuous Fallback Chain' : 'Upstream Provider Dispatch'}
                  </span>
                </div>
                <span>
                  {stepState >= 3
                    ? simulateRateLimit
                      ? 'Fallback Executed (0s Drop)'
                      : 'Dispatched'
                    : 'Waiting'}
                </span>
              </div>
            </div>

            {/* Fallback Chain Breadcrumb Display */}
            {executionResult?.fallbackChain && executionResult.fallbackChain.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 text-xs">
                <div className="flex items-center space-x-2 text-amber-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-semibold">Continuous Flow Successfully Maintained</span>
                </div>
                <div className="mt-2 space-y-1.5 pl-6 font-mono text-[11px]">
                  {executionResult.fallbackChain.map((step: string, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2 text-[#C5CEE0]">
                      <span className="text-[#6C768A]">#{idx + 1}:</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Response Inspector */}
          {executionResult && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/80 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-white">Routed Response Payload</span>
                  {executionResult.choices && (
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                      HTTP 200 OK
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-xs text-[#8A94A6]">
                  {executionResult.latencyMs && <span>{executionResult.latencyMs}ms</span>}
                  {executionResult.usage && <span>{executionResult.usage.total_tokens} tokens</span>}
                </div>
              </div>

              {/* Key & Identity Attribution */}
              {executionResult.keyUsed && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#8A94A6]">
                  <span className="rounded bg-white/[0.06] px-2 py-0.5 text-white">
                    Provider: {executionResult.provider}
                  </span>
                  <span className="rounded bg-white/[0.06] px-2 py-0.5 text-white">
                    Key: {executionResult.keyUsed.label} ({executionResult.keyUsed.maskedKey})
                  </span>
                  <span className="rounded bg-[#5B6CFF]/20 px-2 py-0.5 text-[#8C9BFF]">
                    Gmail: {executionResult.keyUsed.gmailTag}
                  </span>
                </div>
              )}

              {/* Output Content */}
              <div className="mt-3 rounded-xl border border-white/[0.06] bg-[#0E1116] p-4">
                {executionResult.choices ? (
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#E1E4EA]">
                    {executionResult.choices[0]?.message?.content}
                  </pre>
                ) : executionResult.error ? (
                  <div className="flex items-start space-x-2 text-rose-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="text-xs">{executionResult.error.message || 'Routing error occurred'}</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#6C768A]">No output data</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
