import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Code2,
  Copy,
  KeyRound,
  Plus,
  Shield,
  Terminal,
  Trash2,
} from 'lucide-react';
import { RouterToken } from '../types';

interface Props {
  tokens: RouterToken[];
  onCreateToken: (label: string, allowedProviders: string[]) => Promise<{ rawToken: string }>;
  onRevokeToken: (id: string) => Promise<void>;
}

export const RouterTokensView: React.FC<Props> = ({ tokens, onCreateToken, onRevokeToken }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tokenLabel, setTokenLabel] = useState('');
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'python' | 'langchain' | 'n8n' | 'curl' | 'node'>('python');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app';
  const sampleToken = newlyCreatedToken || (tokens[0] ? 'gw_live_8f49a2b9c7e1_master_router' : 'YOUR_MASTER_TOKEN');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenLabel.trim()) return;

    try {
      const res = await onCreateToken(tokenLabel.trim(), ['all']);
      setNewlyCreatedToken(res.rawToken);
      setTokenLabel('');
      setIsCreateOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getSnippet = () => {
    switch (activeSnippetTab) {
      case 'python':
        return `# Point official OpenAI Python SDK directly to the Router!
import openai

client = openai.OpenAI(
    base_url="${baseUrl}/api/v1",
    api_key="${sampleToken}"
)

# Works with ANY provider configured in your Vault!
response = client.chat.completions.create(
    model="gpt-4o",  # or claude-3-5-sonnet, llama-3.3-70b, deepseek-chat
    messages=[{"role": "user", "content": "Hello from autonomous agent"}]
)

print(response.choices[0].message.content)`;

      case 'langchain':
        return `# LangChain Python Integration
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="${baseUrl}/api/v1",
    api_key="${sampleToken}",
    model="gpt-4o"  # The router auto-rotates keys seamlessly!
)

result = llm.invoke("Summarize our quarterly metrics")
print(result.content)`;

      case 'n8n':
        return `// n8n HTTP Request Node Configuration:
// Method: POST
// URL: ${baseUrl}/api/v1/chat/completions
// Authentication: Generic Credential Type -> Header Auth
// Header Name: Authorization
// Header Value: Bearer ${sampleToken}
//
// Body Parameters (JSON):
{
  "model": "gpt-4o",
  "messages": [
    { "role": "user", "content": "={{ $json.incomingMessage }}" }
  ]
}`;

      case 'curl':
        return `curl -X POST ${baseUrl}/api/v1/route \\
  -H "Authorization: Bearer ${sampleToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "auto",
    "messages": [{"role": "user", "content": "Hello Router"}]
  }'`;

      case 'node':
        return `// Node.js / Browser Fetch
const response = await fetch("${baseUrl}/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${sampleToken}"
  },
  body: JSON.stringify({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hello Gateway" }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#141720]/70 p-6 backdrop-blur-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#5B6CFF]">
            <Shield className="h-4 w-4" />
            <span>Master Gateway Credentials</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-white">Router Tokens Management</h2>
          <p className="mt-1 text-xs text-[#8A94A6]">
            Pass this token into your external tools and AI workflows instead of individual provider API keys.
          </p>
        </div>

        <button
          id="create-master-token-btn"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 rounded-xl bg-[#5B6CFF] px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#4E5EEB] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Generate Master Token</span>
        </button>
      </div>

      {/* Show newly created token modal/alert */}
      {newlyCreatedToken && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 text-emerald-400">
              <KeyRound className="h-5 w-5" />
              <h3 className="text-sm font-semibold">New Master Token Created</h3>
            </div>
            <button
              onClick={() => setNewlyCreatedToken(null)}
              className="text-xs text-emerald-400/80 hover:text-emerald-300"
            >
              Dismiss
            </button>
          </div>
          <p className="mt-1 text-xs text-emerald-300/80">
            Please copy this token now. For security purposes, you won't be able to see it again.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-[#0E1116] p-3 text-xs">
            <span className="font-mono text-emerald-400">{newlyCreatedToken}</span>
            <button
              onClick={() => copyToClipboard(newlyCreatedToken, 'new-token')}
              className="flex items-center space-x-1 rounded-lg bg-emerald-500/20 px-3 py-1 text-emerald-300 hover:bg-emerald-500/30"
            >
              {copiedKey === 'new-token' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedKey === 'new-token' ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Tokens Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141720]/80 backdrop-blur-sm">
        <div className="border-b border-white/[0.06] p-5">
          <h3 className="text-sm font-semibold text-white">Active Router Master Tokens</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] bg-[#0E1116]/50 text-[#7E8B9F]">
              <tr>
                <th className="p-4 font-medium">Label</th>
                <th className="p-4 font-medium">Token Hash / Prefix</th>
                <th className="p-4 font-medium">Total Calls</th>
                <th className="p-4 font-medium">Last Used</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-[#C5CEE0]">
              {tokens.map((tok) => (
                <tr key={tok.id} className="hover:bg-white/[0.02]">
                  <td className="p-4 font-semibold text-white">{tok.label}</td>
                  <td className="p-4 font-mono text-[#8C9BFF]">
                    {tok.tokenPrefix}••••••••
                  </td>
                  <td className="p-4">{tok.totalCalls.toLocaleString()} calls</td>
                  <td className="p-4 text-[#8A94A6]">
                    {tok.lastUsed ? new Date(tok.lastUsed).toLocaleString() : 'Never'}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      id={`revoke-token-${tok.id}`}
                      onClick={() => onRevokeToken(tok.id)}
                      className="rounded-lg p-1.5 text-[#8A94A6] hover:bg-rose-500/10 hover:text-rose-400"
                      title="Revoke Token"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ready-to-copy Integration Snippets */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141720]/80 p-6 backdrop-blur-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-white">One-Click Client Integration Snippets</h3>
            <p className="text-xs text-[#8A94A6]">
              Copy and paste directly into your agent runtime or automation framework.
            </p>
          </div>

          {/* Snippet Language Switcher */}
          <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.08] bg-[#0E1116] p-1 text-xs">
            {(['python', 'langchain', 'n8n', 'curl', 'node'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSnippetTab(tab)}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  activeSnippetTab === tab
                    ? 'bg-[#5B6CFF] text-white'
                    : 'text-[#8A94A6] hover:text-white'
                }`}
              >
                {tab === 'python'
                  ? 'Python SDK'
                  : tab === 'langchain'
                  ? 'LangChain'
                  : tab === 'n8n'
                  ? 'n8n Workflow'
                  : tab === 'curl'
                  ? 'cURL'
                  : 'Node / Fetch'}
              </button>
            ))}
          </div>
        </div>

        {/* Code Box */}
        <div className="relative mt-4 overflow-hidden rounded-xl border border-white/[0.06] bg-[#0A0C10]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2 text-[11px] text-[#6C768A]">
            <div className="flex items-center space-x-1.5 font-mono">
              <Terminal className="h-3.5 w-3.5 text-[#5B6CFF]" />
              <span>Unified Gateway Endpoint: {baseUrl}/api/v1</span>
            </div>
            <button
              onClick={() => copyToClipboard(getSnippet(), 'snippet')}
              className="flex items-center space-x-1 rounded px-2 py-1 text-white hover:bg-white/[0.08]"
            >
              {copiedKey === 'snippet' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedKey === 'snippet' ? 'Copied' : 'Copy Snippet'}</span>
            </button>
          </div>

          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[#A9B7D0]">
            {getSnippet()}
          </pre>
        </div>
      </div>

      {/* CREATE TOKEN MODAL */}
      {isCreateOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.14] bg-[#161924] p-6 shadow-2xl shadow-black animate-in zoom-in-95 duration-150">
            <h3 className="font-semibold text-white">Generate Master Router Token</h3>
            <p className="text-xs text-[#8A94A6]">
              This token will have full routing access to all keys in your vault.
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#C5CEE0]">Token Label / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Production n8n Agent Workflow"
                  value={tokenLabel}
                  onChange={(e) => setTokenLabel(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-white/[0.14] bg-[#0E121B] px-3 py-2 text-xs text-white placeholder-[#6C768A] focus:border-[#5B6CFF] focus:bg-[#121622] focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 border-t border-white/[0.08] pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-white/[0.1] bg-[#141822] px-4 py-2 text-xs font-medium text-[#8A94A6] hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5B6CFF] px-4 py-2 text-xs font-medium text-white hover:bg-[#4E5EEB] transition"
                >
                  Generate Token
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
