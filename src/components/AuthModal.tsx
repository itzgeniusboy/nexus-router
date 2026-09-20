import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  Lock,
  ArrowRight,
  Check,
  X,
  AlertCircle,
  BadgeCheck,
  LogIn,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string, name?: string) => Promise<void>;
  currentUser?: UserProfile | null;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      setTimeout(() => usernameInputRef.current?.focus(), 100);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Please enter your username.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (activeTab === 'register') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter.');
        }
        await onRegister(cleanUsername, password, displayName.trim() || cleanUsername);
        setSuccessMessage('Account created and signed in successfully!');
      } else {
        await onLogin(cleanUsername, password);
        setSuccessMessage('Signed in successfully!');
      }

      setTimeout(() => {
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div
        id="auth-modal-dialog"
        className="relative w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#141720] shadow-2xl p-6 text-white my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-xl border border-white/[0.08] p-2 text-[#8A94A6] hover:text-white hover:bg-white/[0.06] transition"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#5B6CFF]/30 bg-[#5B6CFF]/15 text-[#8C9BFF]">
            {activeTab === 'login' ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {activeTab === 'login' ? 'Sign In to Nexus Router' : 'Create Gateway Account'}
            </h3>
            <p className="text-xs text-[#8A94A6]">
              {activeTab === 'login'
                ? 'Enter your credentials to access your vaulted keys and router tokens.'
                : 'Choose a unique username and secure password to get started.'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#0E1116] p-1 border border-white/[0.06] mb-5">
          <button
            id="tab-sign-in"
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-2 rounded-lg py-2 text-xs font-semibold transition ${
              activeTab === 'login'
                ? 'bg-[#5B6CFF] text-white shadow-sm'
                : 'text-[#8A94A6] hover:text-white'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>
          <button
            id="tab-register"
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-2 rounded-lg py-2 text-xs font-semibold transition ${
              activeTab === 'register'
                ? 'bg-[#5B6CFF] text-white shadow-sm'
                : 'text-[#8A94A6] hover:text-white'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error / Success feedback */}
        {error && (
          <div className="mb-4 flex items-start space-x-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#C5CEE0] mb-1.5">
              Unique Username <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-[#717B8F]" />
              <input
                id="auth-username-input"
                ref={usernameInputRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex_dev"
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0E1116] py-2 pl-9 pr-3 text-xs text-white placeholder-[#586174] focus:border-[#5B6CFF] focus:outline-none transition disabled:opacity-50"
              />
            </div>
            {activeTab === 'register' && (
              <p className="mt-1 text-[11px] text-[#717B8F]">
                3-30 characters, letters, numbers, underscores, and hyphens.
              </p>
            )}
          </div>

          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#C5CEE0] mb-1.5">
                Display Name <span className="text-[#717B8F]">(Optional)</span>
              </label>
              <div className="relative">
                <BadgeCheck className="absolute left-3 top-2.5 h-4 w-4 text-[#717B8F]" />
                <input
                  id="auth-display-name-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0E1116] py-2 pl-9 pr-3 text-xs text-white placeholder-[#586174] focus:border-[#5B6CFF] focus:outline-none transition disabled:opacity-50"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#C5CEE0] mb-1.5">
              Password <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#717B8F]" />
              <input
                id="auth-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0E1116] py-2 pl-9 pr-3 text-xs text-white placeholder-[#586174] focus:border-[#5B6CFF] focus:outline-none transition disabled:opacity-50"
              />
            </div>
            {activeTab === 'register' && (
              <p className="mt-1 text-[11px] text-[#717B8F]">Minimum 6 characters.</p>
            )}
          </div>

          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#C5CEE0] mb-1.5">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#717B8F]" />
                <input
                  id="auth-confirm-password-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0E1116] py-2 pl-9 pr-3 text-xs text-white placeholder-[#586174] focus:border-[#5B6CFF] focus:outline-none transition disabled:opacity-50"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 rounded-xl bg-[#5B6CFF] py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#5B6CFF]/20 hover:bg-[#4E5EEB] transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>{activeTab === 'login' ? 'Sign In' : 'Create Unique Account'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security & Privacy Guarantee */}
        <div className="mt-5 border-t border-white/[0.06] pt-3.5 text-center">
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[11px] text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-medium">100% Private & Encrypted Vault</span>
          </div>
          <p className="mt-2 text-[11px] text-[#8A94A6] leading-relaxed">
            Your credentials & API keys are strictly protected with AES-256-GCM and salted PBKDF2 hashing. Completely self-hosted, private, and isolated.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
