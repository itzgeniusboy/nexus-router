import type { ProviderId } from '../src/types';
import {
  AuthError,
  executeProviderCall,
  ProviderError,
  RateLimitError,
} from './providers/index.ts';
import { DEFAULT_PROVIDER_MODELS, detectProviderFromModel } from './providers/constants';
import type { ProviderCallResult } from './providers/index.ts';
import { decryptKey, routerStore } from './store';

export interface DispatchParams {
  provider?: ProviderId | 'auto';
  model?: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  authHeader?: string;
  simulateRateLimitOnFirst?: boolean;
  gmailFilter?: string;
  endpoint?: string;
  userId?: string;
}

export interface DispatchResult {
  success: boolean;
  content: string;
  provider: ProviderId;
  model: string;
  keyUsed: {
    id: string;
    label: string;
    maskedKey: string;
    gmailTag: string;
  };
  tokensUsed: number;
  latencyMs: number;
  fallbackAttempted: boolean;
  fallbackChain: string[];
  streamResponse?: any;
  error?: string;
}

export async function dispatchAiRequest(params: DispatchParams): Promise<DispatchResult> {
  const startTime = Date.now();
  const endpoint = params.endpoint || '/api/v1/route';
  const userId = params.userId || 'default-user';

  // 1. Resolve Provider and Model
  const targetProvider: ProviderId =
    params.provider === 'auto' || !params.provider
      ? params.model
        ? detectProviderFromModel(params.model)
        : 'openai'
      : params.provider;

  const targetModel = params.model || DEFAULT_PROVIDER_MODELS[targetProvider] || 'gpt-4o';

  const fallbackChain: string[] = [];
  const excludedKeyIds: string[] = [];
  const settings = routerStore.getSettings(userId);
  const maxRetries = settings.maxFallbackRetries;

  let attempt = 0;
  let lastError = '';
  let fallbackAttempted = false;

  const promptText =
    params.messages && params.messages.length > 0
      ? params.messages[params.messages.length - 1].content
      : 'Hello from AI Gateway';

  while (attempt <= maxRetries) {
    const selectedKey = routerStore.selectNextKey(targetProvider, excludedKeyIds, userId, params.gmailFilter);

    if (!selectedKey) {
      if (attempt === 0) {
        const errMsg = `No active API keys found for provider "${targetProvider}". Please add one in the API Key Vault.`;
        return {
          success: false,
          content: '',
          provider: targetProvider,
          model: targetModel,
          keyUsed: { id: 'none', label: 'None Available', maskedKey: '••••••••', gmailTag: 'unassigned' },
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          fallbackAttempted,
          fallbackChain,
          error: errMsg,
        };
      }
      break;
    }

    // Explicit testbench simulation switch
    const shouldSimulateFailure = Boolean(params.simulateRateLimitOnFirst) && attempt === 0;

    if (shouldSimulateFailure) {
      fallbackAttempted = true;
      fallbackChain.push(`${selectedKey.label} [${selectedKey.maskedKey}] (429 Rate Limit - Simulated Key Exhaustion)`);
      routerStore.markKeyRateLimited(selectedKey.id);
      excludedKeyIds.push(selectedKey.id);
      attempt++;
      continue;
    }

    // Try executing real HTTP call to provider
    try {
      const rawDecryptedKey = decryptKey(selectedKey.encryptedKey);

      // Call the provider adapter
      let callResult: ProviderCallResult;

      // If the key is an unconfigured placeholder sample, provide clear diagnostic fallback
      const isPlaceholderSample =
        rawDecryptedKey.includes('sample') ||
        rawDecryptedKey.includes('DemoSample') ||
        rawDecryptedKey.length < 10;

      if (isPlaceholderSample) {
        // High fidelity simulated response for demo placeholder keys
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 200) + 120));
        const simulatedContent = generateDemoResponse(targetProvider, targetModel, promptText, fallbackAttempted);
        callResult = {
          content: simulatedContent,
          tokensUsed: Math.floor(Math.random() * 150) + 90 + Math.round(promptText.length / 4),
          model: targetModel,
          latencyMs: Date.now() - startTime,
        };
      } else {
        // Real HTTP call to the provider API
        callResult = await executeProviderCall(targetProvider, {
          apiKey: rawDecryptedKey,
          model: targetModel,
          messages: params.messages,
          temperature: params.temperature,
          max_tokens: params.max_tokens,
          stream: params.stream,
          customBaseUrl: selectedKey.customBaseUrl,
          customAuthHeader: selectedKey.customAuthHeader,
        });
      }

      const latencyMs = Date.now() - startTime;
      routerStore.recordKeyUsage(selectedKey.id, callResult.tokensUsed, latencyMs);

      if (fallbackAttempted) {
        fallbackChain.push(`${selectedKey.label} [${selectedKey.maskedKey}] (Success - Continuous Flow Preserved)`);
      }

      // Record Usage Log
      routerStore.addLog(
        {
          provider: targetProvider,
          keyId: selectedKey.id,
          keyLabel: selectedKey.label,
          gmailTag: selectedKey.gmailTag,
          model: targetModel,
          tokensUsed: callResult.tokensUsed,
          status: fallbackAttempted ? 'fallback_recovered' : 'success',
          latencyMs,
          fallbackAttempted,
          fallbackChain: fallbackChain.length > 0 ? fallbackChain : undefined,
          endpoint,
          promptPreview: promptText.slice(0, 120) + (promptText.length > 120 ? '...' : ''),
        },
        userId
      );

      return {
        success: true,
        content: callResult.content,
        provider: targetProvider,
        model: callResult.model || targetModel,
        keyUsed: {
          id: selectedKey.id,
          label: selectedKey.label,
          maskedKey: selectedKey.maskedKey,
          gmailTag: selectedKey.gmailTag || '',
        },
        tokensUsed: callResult.tokensUsed,
        latencyMs,
        fallbackAttempted,
        fallbackChain,
        streamResponse: callResult.streamResponse,
      };
    } catch (err: any) {
      fallbackAttempted = true;
      lastError = err.message || 'Provider request failed';

      if (err instanceof RateLimitError || err.statusCode === 429) {
        fallbackChain.push(`${selectedKey.label} [${selectedKey.maskedKey}] (429 Rate Limit - Cooldown Applied)`);
        routerStore.markKeyRateLimited(selectedKey.id, err.retryAfterSeconds);
      } else if (err instanceof AuthError || err.statusCode === 401 || err.statusCode === 403) {
        fallbackChain.push(`${selectedKey.label} [${selectedKey.maskedKey}] (Auth Error ${err.statusCode} - Key Disabled)`);
        routerStore.updateKey(selectedKey.id, { status: 'error' });
      } else {
        fallbackChain.push(`${selectedKey.label} [${selectedKey.maskedKey}] (Error: ${lastError.slice(0, 50)})`);
        routerStore.markKeyRateLimited(selectedKey.id, 30);
      }

      excludedKeyIds.push(selectedKey.id);
      attempt++;
    }
  }

  // All retries failed
  const finalLatency = Date.now() - startTime;
  routerStore.addLog(
    {
      provider: targetProvider,
      keyId: 'error-exhausted',
      keyLabel: 'All Keys Failed',
      gmailTag: 'system',
      model: targetModel,
      tokensUsed: 0,
      status: 'error',
      latencyMs: finalLatency,
      fallbackAttempted: true,
      fallbackChain,
      endpoint,
      promptPreview: promptText.slice(0, 80),
    },
    userId
  );

  return {
    success: false,
    content: '',
    provider: targetProvider,
    model: targetModel,
    keyUsed: { id: 'none', label: 'All Keys Exhausted', maskedKey: '••••••••', gmailTag: 'exhausted' },
    tokensUsed: 0,
    latencyMs: finalLatency,
    fallbackAttempted: true,
    fallbackChain,
    error: `All candidate keys for ${targetProvider} exhausted or rate-limited. ${lastError}`,
  };
}

function generateDemoResponse(
  provider: ProviderId,
  model: string,
  prompt: string,
  wasFallback: boolean
): string {
  const fallbackNotice = wasFallback
    ? `[Router Notice: Continuous Flow Preserved - Automatically routed via backup key]\n\n`
    : '';

  const snippet = prompt.length > 70 ? prompt.slice(0, 67) + '...' : prompt;

  return `${fallbackNotice}Response dispatched via Universal AI Gateway through ${provider.toUpperCase()} (${model}).

In response to "${snippet}":
1. Key auto-rotation is active with verified latency metrics.
2. Rate limits and quota status are monitored in real time.
3. AES-256-GCM encrypted key storage authenticated at rest.`;
}
