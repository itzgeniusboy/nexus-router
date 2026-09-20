import React, { useState } from 'react';
import {
  Activity,
  Check,
  ChevronDown,
  Copy,
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
import { GmailAccount, UserProfile } from '../types';
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
}) => {
  const [gmailDropdownOpen, setGmailDropdownOpen] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

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
    <header className="relative z-20 border-b border-white/[0.08] bg-[#0B0D10]/85 backdrop-blur-md">
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
            </div>
            <p className="text-xs text-[#8A94A6]">Multi-Provider Key Rotation & Fallback Mesh</p>
          </div>
        </div>

        {/* Right side controls: Gmail Tag Switcher, Quick Action, Master Token, Google Account */}
        <div className="flex items-center space-x-3">
          {/* Gmail Account Selector */}
          <div className="relative">
            <button
              id="gmail-account-selector-btn"
              onClick={() => setGmailDropdownOpen(!gmailDropdownOpen)}
              className="flex items-center space-x-2 rounded-xl border border-white/[0.08] bg-[#14161A] px-3 py-1.5 text-xs text-[#C5CEE0] transition hover:border-white/[0.18] hover:text-white"
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: currentAccount?.avatarColor || '#5B6CFF' }}
              />
              <span className="max-w-[160px] truncate font-medium">
                {selectedGmail === 'all' ? 'All Gmail Tags' : selectedGmail}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[#6C768A]" />
            </button>

            {gmailDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => setGmailDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/[0.1] bg-[#14161A] p-1.5 shadow-2xl backdrop-blur-xl z-30">
                  <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-[#6C768A]">
                    Filter By Gmail Identity
                  </div>
                  <button
                    onClick={() => {
                      setSelectedGmail('all');
                      setGmailDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                      selectedGmail === 'all'
                        ? 'bg-[#5B6CFF]/15 font-medium text-white'
                        : 'text-[#9DA8BE] hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <span>All Accounts ({totalKeysCount} keys)</span>
                    {selectedGmail === 'all' && <Check className="h-3.5 w-3.5 text-[#5B6CFF]" />}
                  </button>

                  {gmailAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => {
                        setSelectedGmail(acc.email);
                        setGmailDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                        selectedGmail === acc.email
                          ? 'bg-[#5B6CFF]/15 font-medium text-white'
                          : 'text-[#9DA8BE] hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: acc.avatarColor }} />
                        <span className="truncate">{acc.email}</span>
                      </div>
                      {selectedGmail === acc.email && <Check className="h-3.5 w-3.5 text-[#5B6CFF]" />}
                    </button>
                  ))}

                  <div className="mt-1 border-t border-white/[0.06] pt-1">
                    <button
                      onClick={() => {
                        setGmailDropdownOpen(false);
                        setGoogleModalOpen(true);
                      }}
                      className="flex w-full items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#5B6CFF] hover:bg-[#5B6CFF]/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Connect Google Account</span>
                    </button>
                  </div>
                </div>
              </>
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
