import React, { useState } from 'react';
import {
  Activity,
  Check,
  Copy,
  Database,
  Key,
  Layers,
  LogIn,
  LogOut,
  Plus,
  ScrollText,
  Settings,
  Shield,
  User,
  Zap,
} from 'lucide-react';
import { DatabaseStatus, UserProfile } from '../types';
import { AuthModal } from './AuthModal';

interface Props {
  activeTab: 'overview' | 'keys' | 'simulator' | 'tokens' | 'logs' | 'settings';
  setActiveTab: (tab: 'overview' | 'keys' | 'simulator' | 'tokens' | 'logs' | 'settings') => void;
  onOpenAddKey: () => void;
  totalKeysCount: number;
  user?: UserProfile | null;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string, name?: string) => Promise<void>;
  onLogout: () => Promise<void>;
  databaseStatus?: DatabaseStatus | null;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  onOpenAddKey,
  totalKeysCount,
  user,
  onLogin,
  onRegister,
  onLogout,
  databaseStatus,
}) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleCopyQuickToken = () => {
    navigator.clipboard.writeText('gw_live_8f49a2b9c7e1_master_router');
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0B0D10]/95 backdrop-blur-lg shadow-lg shadow-black/40">
      {/* Top Banner / Identity Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3 lg:px-8 gap-2">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-[#5B6CFF]/30 bg-[#14161A] text-[#5B6CFF] shadow-inner shrink-0">
            <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-semibold tracking-tight text-white text-sm sm:text-base truncate">Nexus Router</span>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium tracking-wide text-emerald-400 shrink-0">
                ACTIVE
              </span>
              <button
                id="nav-db-status-badge"
                onClick={() => setActiveTab('settings')}
                title="View Database & Cloud Persistence Settings"
                className={`hidden md:inline-flex items-center space-x-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium transition ${
                  databaseStatus?.connected
                    ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    : databaseStatus?.configured
                    ? 'border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    : 'border border-white/[0.1] bg-white/[0.04] text-[#8A94A6] hover:text-white'
                }`}
              >
                <Database className="h-3 w-3" />
                <span>
                  {databaseStatus?.connected
                    ? databaseStatus.provider === 'supabase'
                      ? 'Supabase: Connected'
                      : 'PostgreSQL: Connected'
                    : databaseStatus?.configured
                    ? 'PostgreSQL: Standby'
                    : 'SQLite: Local'}
                </span>
              </button>
            </div>
            <p className="hidden md:block text-xs text-[#8A94A6] truncate">Multi-Provider Key Rotation & Fallback Mesh</p>
          </div>
        </div>

        {/* Right side controls: Master Token, Auth status, Add Key */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {/* Quick Copy Master Token */}
          <button
            onClick={handleCopyQuickToken}
            title="Copy Master Client Bearer Token"
            className="hidden items-center space-x-1.5 rounded-xl border border-white/[0.08] bg-[#14161A] px-3 py-1.5 text-xs text-[#A3B0CC] transition hover:border-white/[0.18] hover:text-white sm:flex"
          >
            <Key className="h-3.5 w-3.5 text-[#5B6CFF]" />
            <span>{copiedToken ? 'Token Copied!' : 'Master Token'}</span>
            {copiedToken ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-[#6C768A]" />}
          </button>

          {/* User Account / Sign In Controls */}
          {user ? (
            <div className="flex items-center space-x-1.5 bg-[#14161F] border border-white/[0.08] rounded-xl px-2 sm:px-2.5 py-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#5B6CFF]/20 text-[#8C9BFF] font-semibold text-xs shrink-0">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-[11px] font-semibold text-white truncate max-w-[90px] md:max-w-[120px]">
                  {user.name || user.username}
                </div>
                <div className="text-[10px] text-[#717B8F] truncate max-w-[90px] md:max-w-[120px]">
                  @{user.username}
                </div>
              </div>
              <button
                id="btn-nav-logout"
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                title="Log Out"
                className="p-1 rounded-lg text-[#717B8F] hover:text-rose-400 hover:bg-rose-500/10 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="btn-nav-sign-in"
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center space-x-1.5 rounded-xl border border-[#5B6CFF]/40 bg-[#5B6CFF]/15 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#8C9BFF] hover:bg-[#5B6CFF]/25 hover:text-white transition shrink-0"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Add Key Quick Button */}
          <button
            id="nav-add-key-btn"
            onClick={onOpenAddKey}
            className="flex items-center space-x-1 sm:space-x-1.5 rounded-xl bg-[#5B6CFF] px-2.5 sm:px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#4E5EEB] active:scale-[0.98] shrink-0"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Add Key</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto py-1.5 no-scrollbar scrollbar-none">
          {[
            { id: 'overview', label: 'Overview & Health', icon: Activity },
            { id: 'keys', label: `API Key Vault (${totalKeysCount})`, icon: Key },
            { id: 'simulator', label: 'Continuous Flow Testbench', icon: Zap },
            { id: 'tokens', label: 'Master Tokens', icon: Shield },
            { id: 'logs', label: 'Usage Logs', icon: ScrollText },
            { id: 'settings', label: 'Settings & Routing', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 sm:space-x-2 shrink-0 whitespace-nowrap rounded-lg px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-[#8A94A6] hover:bg-white/[0.03] hover:text-[#C5CEE0]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isActive ? 'text-[#5B6CFF]' : 'text-[#6C768A]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Manual Username & Password Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={onLogin}
        onRegister={onRegister}
        currentUser={user}
      />
    </header>
  );
};
