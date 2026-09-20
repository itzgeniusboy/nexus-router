export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'mistral'
  | 'cohere'
  | 'xai'
  | 'perplexity'
  | 'openrouter'
  | 'deepseek'
  | 'together'
  | 'fireworks'
  | 'azure'
  | 'bedrock'
  | 'custom';

export type KeyStatus = 'active' | 'rate-limited' | 'cooldown' | 'invalid' | 'expired' | 'error';

export type RotationStrategy = 'round-robin' | 'least-recently-used' | 'priority-weight';

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  category: string;
  defaultModel: string;
  popularModels: string[];
  keyPrefix: string;
  docUrl: string;
  color: string;
}

export interface ApiKeyItem {
  id: string;
  provider: ProviderId;
  label: string;
  maskedKey: string;
  encryptedKey: string;
  gmailTag?: string;
  status: KeyStatus;
  priority: number; // 1 = highest, 5 = lowest
  totalRequests: number;
  tokensUsed: number;
  lastUsedAt: string | null;
  createdAt: string;
  enabled: boolean;
  customBaseUrl?: string;
  customAuthHeader?: string;
  cooldownUntil?: number | string | null;
  lastLatencyMs?: number;
}

export interface GmailAccount {
  id: string;
  email: string;
  name: string;
  isPrimary: boolean;
  avatarColor: string;
  keyCount?: number;
  addedAt: string;
}

export interface RouterToken {
  id: string;
  label: string;
  tokenPrefix: string;
  tokenHash?: string;
  createdAt: string;
  lastUsed: string | null;
  totalCalls: number;
  allowedProviders: string[];
  rawTokenPreview?: string; // shown only upon creation
}

export interface UsageLog {
  id: string;
  timestamp: string;
  provider: ProviderId;
  keyId: string;
  keyLabel: string;
  gmailTag?: string;
  model: string;
  tokensUsed: number;
  status: 'success' | 'fallback_recovered' | 'rate_limited' | 'error';
  latencyMs: number;
  fallbackAttempted: boolean;
  fallbackChain?: string[];
  endpoint: string;
  promptPreview?: string;
}

export interface RouterSettings {
  rotationStrategy: RotationStrategy;
  autoFallback: boolean;
  maxFallbackRetries: number;
  cooldownSeconds: number;
  rateLimitTolerance: number;
  logRetentionDays: number;
}

export interface UserProfile {
  userId: string;
  username: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface DatabaseStatus {
  configured: boolean;
  provider: 'supabase' | 'postgres' | 'sqlite';
  providerName: string;
  connected: boolean;
  host: string;
  databaseName: string;
  sslEnabled: boolean;
  latencyMs: number | null;
  tableStats: {
    apiKeys: number;
    gmailAccounts: number;
    routerTokens: number;
    usageLogs: number;
  };
  lastSyncTime: string;
  error?: string | null;
}
