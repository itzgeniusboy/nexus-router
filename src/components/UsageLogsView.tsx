import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Search,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { UsageLog } from '../types';
import { ProviderIcon } from './ProviderIcon';

interface Props {
  logs: UsageLog[];
  onClearLogs: () => Promise<void>;
}

export const UsageLogsView: React.FC<Props> = ({ logs, onClearLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<UsageLog | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'recovered' && log.status === 'fallback_recovered') ||
      (statusFilter === 'success' && log.status === 'success') ||
      (statusFilter === 'error' && (log.status === 'error' || log.status === 'rate_limited'));

    const matchesSearch =
      searchQuery === '' ||
      log.keyLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.gmailTag && log.gmailTag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.promptPreview && log.promptPreview.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ai_router_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col justify-between gap-3.5 rounded-2xl border border-white/[0.08] bg-[#141720]/70 p-4 backdrop-blur-sm md:flex-row md:items-center">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6C768A]" />
            <input
              id="search-logs-input"
              type="text"
              placeholder="Search by model, label, or prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#0E1116] py-2 pl-9 pr-4 text-xs text-white placeholder-[#6C768A] focus:border-[#5B6CFF] focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-[#6C768A] shrink-0" />
            <select
              id="status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-white/[0.08] bg-[#0E1116] px-3 py-2 text-xs text-[#C5CEE0] focus:border-[#5B6CFF] focus:outline-none cursor-pointer [&>option]:bg-[#161924] [&>option]:text-white"
            >
              <option value="all">All Logs ({logs.length})</option>
              <option value="success">Success</option>
              <option value="recovered">Fallback Recovered</option>
              <option value="error">Errors</option>
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={exportLogsAsJson}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 rounded-xl border border-white/[0.08] bg-[#161B26] px-3 py-2 text-xs text-[#C5CEE0] hover:border-white/[0.2] hover:text-white transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            id="clear-logs-btn"
            onClick={onClearLogs}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 rounded-xl border border-white/[0.08] bg-[#161B26] px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141720]/80 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] bg-[#0E1116]/50 text-[#7E8B9F]">
              <tr>
                <th className="p-4 font-medium">Timestamp</th>
                <th className="p-4 font-medium">Provider & Model</th>
                <th className="p-4 font-medium">Key Used & Gmail Tag</th>
                <th className="p-4 font-medium">Tokens</th>
                <th className="p-4 font-medium">Latency</th>
                <th className="p-4 font-medium">Routing Status</th>
                <th className="p-4 font-medium text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-[#C5CEE0]">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="cursor-pointer transition hover:bg-white/[0.02]"
                >
                  <td className="p-4 whitespace-nowrap text-[#8A94A6]">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <ProviderIcon provider={log.provider} size={15} />
                      <span className="font-semibold text-white">{log.model}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-white">{log.keyLabel}</div>
                      {log.gmailTag && <div className="text-[11px] text-[#717B8F]">{log.gmailTag}</div>}
                    </div>
                  </td>
                  <td className="p-4">{log.tokensUsed}</td>
                  <td className="p-4 text-[#8C9BFF]">{log.latencyMs}ms</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center space-x-1 rounded px-2 py-0.5 text-[10px] font-medium ${
                        log.status === 'fallback_recovered'
                          ? 'bg-amber-500/10 text-amber-400'
                          : log.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {log.status === 'fallback_recovered' && <RefreshCw className="h-3 w-3" />}
                      {log.status === 'success' && <CheckCircle2 className="h-3 w-3" />}
                      <span className="capitalize">
                        {log.status === 'fallback_recovered' ? 'Fallback Recovered' : log.status}
                      </span>
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-[11px] text-[#5B6CFF] hover:underline">View</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="my-auto flex w-full max-w-lg max-h-[90vh] flex-col rounded-2xl border border-white/[0.14] bg-[#161924] shadow-2xl shadow-black animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/[0.08] p-5 pb-4 shrink-0 bg-[#191D2B] rounded-t-2xl">
              <div className="flex items-center space-x-2">
                <ProviderIcon provider={selectedLog.provider} size={18} />
                <h3 className="font-semibold text-white">Log Inspection: {selectedLog.id}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded p-1 text-[#8A94A6] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/[0.08] bg-[#0E121B] p-3">
                <div>
                  <span className="text-[#6C768A]">Timestamp:</span>
                  <p className="font-mono text-white">{new Date(selectedLog.timestamp).toISOString()}</p>
                </div>
                <div>
                  <span className="text-[#6C768A]">Endpoint:</span>
                  <p className="font-mono text-white">{selectedLog.endpoint}</p>
                </div>
                <div>
                  <span className="text-[#6C768A]">Tokens Count:</span>
                  <p className="font-mono text-white">{selectedLog.tokensUsed} tokens</p>
                </div>
                <div>
                  <span className="text-[#6C768A]">Total Latency:</span>
                  <p className="font-mono text-[#8C9BFF]">{selectedLog.latencyMs}ms</p>
                </div>
              </div>

              {/* Fallback Chain */}
              {selectedLog.fallbackChain && selectedLog.fallbackChain.length > 0 && (
                <div>
                  <span className="font-medium text-amber-400">Rotation & Fallback Audit Trail:</span>
                  <div className="mt-1 space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 font-mono text-[11px] text-[#C5CEE0]">
                    {selectedLog.fallbackChain.map((step, idx) => (
                      <div key={idx}>
                        #{idx + 1}: {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt Preview */}
              <div>
                <span className="text-[#6C768A]">Prompt Preview:</span>
                <p className="mt-1 rounded-xl border border-white/[0.08] bg-[#0E121B] p-3 text-[#A9B7D0]">
                  {selectedLog.promptPreview || 'No prompt content recorded.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-white/[0.08] bg-[#191D2B] p-4 shrink-0 rounded-b-2xl">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-[#5B6CFF] px-4 py-2 text-xs font-medium text-white hover:bg-[#4E5EEB] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
