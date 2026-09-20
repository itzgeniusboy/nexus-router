import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Check,
  ChevronDown,
  Copy,
  Database,
  Globe,
  Key,
  Layers,
  LogOut,
  Plus,
  RefreshCw,
  ScrollText,
  Settings,
  Shield,
  User,
  Zap,
} from 'lucide-react';
import { DatabaseStatus, GmailAccount, UserProfile } from '../types';
import { GoogleAuthModal } from './GoogleAuthModal';

interface Props {
  activeTab: 'overview' | 'keys' | 'simulator' | 'tokens' | 'logs' | 'settings';
  setActiveTab: (tab: 'overview' | 'keys' | 'simulator' | 'tokens' | 'logs' | 'settings') => void;
  gmailAccounts: GmailAccount[];
  selectedGmail: string;
  setSelectedGmail: (email: string) => void;
  onOpenAddKey: () => void;
  onOpenAddGmail: () => void;
  totalKeysCount: number;
  user?: UserProfile | null;
  onConnectGoogle?: (email: string, name?: string) => Promise<void>;
  databaseStatus?: DatabaseStatus | null;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  gmailAccounts,
  selectedGmail,
  setSelectedGmail,
  onOpenAddKey,
  onOpenAddGmail,
  totalKeysCount,
  user,
  onConnectGoogle,
  databaseStatus,
}) => {
  const [gmailDropdownOpen, setGmailDropdownOpen] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setGmailDropdownOpen(false);
      }
    };
    if (gmailDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [gmailDropdownOpen]);

  const currentAccount = gmailAccounts.find((a) => a.email === selectedGmail);

  const handleCopyQuickToken = () => {
    navigator.clipboard.writeText('gw_live_8f49a2b9c7e1_master_router');
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleGoogleSubmit = async (email: string, name?: string) => {
    if (onConnectGoogle) {
      await onConnectGoogle(email, name);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0B0D10]/95 backdrop-blur-lg shadow-lg shadow-black/40">
      {/* Top Banner / Identity Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#5B6CFF]/30 bg-[#14161A] text-[#5B6CFF] shadow-inner">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold tracking-tight text-white">Nexus Router</span>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-emerald-400">
                ACTIVE
              </span>
              <button
                id="nav-db-status-badge"
                onClick={() => setActiveTab('settings')}
                title="View Database & Cloud Persistence Settings"
                className={`hidden sm:inline-flex items-center space-x-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium transition ${
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
            <p className="text-xs text-[#8A94A6]">Multi-Provider Key Rotation & Fallback Mesh</p>
          </div>
        </div>

        {/* Right side controls: Gmail Tag Switcher, Quick Action, Master Token, Google Account */}
        <div className="flex items-center space-x-3">
          {/* Gmail Account Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="gmail-account-selector-btn"
              onClick={() => setGmailDropdownOpen(!gmailDropdownOpen)}
              className="flex items-center space-x-2 rounded-xl border border-white/[0.1] bg-[#14161F] px-3 py-1.5 text-xs text-[#C5CEE0] transition hover:border-[#5B6CFF]/40 hover:text-white"
            >
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: currentAccount?.avatarColor || '#5B6CFF' }}
              />
              <span className="max-w-[160px] truncate font-medium">
                {selectedGmail === 'all' ? 'All Gmail Tags' : selectedGmail}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#6C768A] transition-transform duration-150 ${
                  gmailDropdownOpen ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {gmailDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-white/[0.14] bg-[#161924] p-1.5 shadow-2xl shadow-black/90 z-[60] animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[#7E8B9F]">
                  Filter By Gmail Identity
                </div>
                <button
                  onClick={() => {
                    setSelectedGmail('all');
                    setGmailDropdownOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                    selectedGmail === 'all'
                      ? 'bg-[#5B6CFF]/20 font-medium text-white border border-[#5B6CFF]/30'
                      : 'text-[#9DA8BE] hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-[#5B6CFF]" />
                    <span>All Accounts ({totalKeysCount} keys)</span>
                  </div>
                  {selectedGmail === 'all' && <Check className="h-3.5 w-3.5 text-[#5B6CFF]" />}
                </button>

                <div className="my-1 max-h-48 overflow-y-auto space-y-0.5">
                  {gmailAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => {
                        setSelectedGmail(acc.email);
                        setGmailDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                        selectedGmail === acc.email
                          ? 'bg-[#5B6CFF]/20 font-medium text-white border border-[#5B6CFF]/30'
                          : 'text-[#9DA8BE] hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: acc.avatarColor }} />
                        <div className="truncate">
                          <div className="truncate font-medium text-white">{acc.name}</div>
                          <div className="text-[10px] text-[#717B8F] truncate">{acc.email}</div>
                        </div>
                      </div>
                      {selectedGmail === acc.email && <Check className="h-3.5 w-3.5 text-[#5B6CFF] shrink-0" />}
                    </button>
                  ))}
                </div>

                <div className="mt-1 border-t border-white/[0.08] pt-1.5">
                  <button
                    onClick={() => {
                      setGmailDropdownOpen(false);
                      setGoogleModalOpen(true);
                    }}
                    className="flex w-full items-center justify-center space-x-1.5 rounded-lg bg-[#5B6CFF]/15 px-2.5 py-2 text-xs font-medium text-[#8C9BFF] hover:bg-[#5B6CFF]/25 hover:text-white transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Connect Google Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>

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

          {/* Google Identity / Sign in Button */}
          <button
            onClick={() => setGoogleModalOpen(true)}
            className="flex items-center space-x-2 rounded-xl border border-white/[0.08] bg-[#14161A] px-3 py-1.5 text-xs text-[#C5CEE0] transition hover:border-[#5B6CFF]/50 hover:text-white"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5B6CFF]/20 text-[#5B6CFF]">
              <User className="h-3 w-3" />
            </div>
            <span className="hidden md:inline font-medium">
              {user ? user.email.split('@')[0] : 'Google Auth'}
            </span>
          </button>

          {/* Add Key Quick Button */}
          <button
            id="nav-add-key-btn"
            onClick={onOpenAddKey}
            className="flex items-center space-x-1.5 rounded-xl bg-[#5B6CFF] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#4E5EEB] active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Key</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto py-1.5">
          {[
            { id: 'overview', label: 'Overview & Health', icon: Activity },
            { id: 'keys', label: `API Key Vault (${totalKeysCount})`, icon: Key },
            { id: 'simulator', label: 'Continuous Flow Testbench', icon: Zap },
            { id: 'tokens', label: 'Master Tokens', icon: Shield },
            { id: 'logs', label: 'Usage Logs', icon: ScrollText },
            { id: 'settings', label: 'Routing & Identities', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-[#8A94A6] hover:bg-white/[0.03] hover:text-[#C5CEE0]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[#5B6CFF]' : 'text-[#6C768A]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* GOOGLE ACCOUNT AUTHENTICATION PORTAL MODAL (Uses createPortal with z-[100] to always float on top) */}
      <GoogleAuthModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        onConnect={handleGoogleSubmit}
        currentUser={user}
        existingAccounts={gmailAccounts}
      />
    </header>
  );
};
