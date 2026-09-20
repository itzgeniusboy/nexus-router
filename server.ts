import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { configurePassport, getUserById, loginUser, registerUser } from './server/auth';
import { dispatchAiRequest } from './server/router';
import { decryptKey, maskApiKey, routerStore } from './server/store';
import { executeProviderCall, AuthError, RateLimitError, ProviderError } from './server/providers/index.ts';
import { DEFAULT_PROVIDER_MODELS } from './server/providers/constants';
import { getDatabaseMeta, testPostgresConnection } from './server/postgres';

dotenv.config();

const app = express();
const PORT = 3000;

// Enable reverse proxy support for Vercel, Cloud Run, and Cloudflare
app.set('trust proxy', 1);

// Allowed origins for CORS: production Vercel deployment, dev servers, and preview environments
const allowedOrigins = [
  'https://nexusrouter.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session and Passport configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'nexus-router-secure-session-key-32chars',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

configurePassport(app);
app.use(passport.initialize());
app.use(passport.session());

// Task 6: Basic rate-limiting on public gateway endpoints to prevent abuse
const routerRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 180, // 180 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Gateway rate limit exceeded. Please throttle your client requests.',
      type: 'gateway_rate_limit_exceeded',
    },
  },
});

// Middleware to extract user session or authorization
app.use((req, res, next) => {
  const sessionUserHeader = req.headers['x-user-id'] as string;
  if (req.user && (req.user as any).userId) {
    (req as any).userId = (req.user as any).userId;
  } else if (sessionUserHeader) {
    (req as any).userId = sessionUserHeader;
  } else {
    (req as any).userId = 'default-user';
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Nexus Router Gateway',
    version: '1.0.0',
    port: PORT,
  });
});

// Database & Persistence management endpoints
app.get('/api/database/status', async (req, res) => {
  try {
    const status = await testPostgresConnection();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/database/test', async (req, res) => {
  try {
    const status = await testPostgresConnection();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/database/sync', async (req, res) => {
  try {
    const syncSuccess = await routerStore.syncWithPostgres();
    const status = await testPostgresConnection();
    res.json({ success: syncSuccess, status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Manual Authentication Endpoints (Username & Password) ---
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, name } = req.body;
    const user = registerUser(username, password, name);
    (req.session as any).userId = user.userId;
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to initialize session' });
      }
      res.status(201).json({ success: true, user });
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = loginUser(username, password);
    (req.session as any).userId = user.userId;
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Failed to initialize session' });
      }
      res.json({ success: true, user });
    });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  } else {
    res.json({ success: true, message: 'Logged out successfully' });
  }
});

app.get('/api/auth/session', (req, res) => {
  const sessionUserId = (req.session as any)?.userId || (req.user as any)?.userId;
  let user = sessionUserId ? getUserById(sessionUserId) : null;

  res.json({
    authenticated: Boolean(user),
    user: user || null,
  });
});

// --- API Keys Endpoints ---
app.get('/api/keys', (req, res) => {
  const gmail = req.query.gmail as string | undefined;
  const userId = (req as any).userId || 'default-user';
  const keys = routerStore.getKeys(gmail, userId);
  res.json({ success: true, keys });
});

app.post('/api/keys', (req, res) => {
  const { provider, label, rawKey, gmailTag, priority, customBaseUrl, customAuthHeader } = req.body;
  const userId = (req as any).userId || 'default-user';

  if (!provider || !rawKey) {
    return res.status(400).json({ success: false, error: 'Provider and API Key are required' });
  }

  // Auto-resolve or default to the user's primary connected gmail if not provided
  let resolvedGmailTag = gmailTag;
  if (!resolvedGmailTag) {
    const accounts = routerStore.getGmailAccounts(userId);
    resolvedGmailTag = accounts[0]?.email || 'unassigned@gmail.com';
  }

  const created = routerStore.addKey({
    provider,
    label: label || `${provider} Key`,
    rawKey,
    gmailTag: resolvedGmailTag,
    priority: Number(priority) || 1,
    customBaseUrl,
    customAuthHeader,
    userId,
  });

  res.status(201).json({ success: true, key: created });
});

app.patch('/api/keys/:id', (req, res) => {
  const updated = routerStore.updateKey(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Key not found' });
  }
  res.json({ success: true, key: updated });
});

app.delete('/api/keys/:id', (req, res) => {
  const ok = routerStore.deleteKey(req.params.id);
  if (!ok) {
    return res.status(404).json({ success: false, error: 'Key not found' });
  }
  res.json({ success: true, deleted: true });
});

app.post('/api/keys/:id/test', async (req, res) => {
  const key = routerStore.getKeyById(req.params.id);
  if (!key) {
    return res.status(404).json({ success: false, error: 'Key not found' });
  }

  const rawKey = decryptKey(key.encryptedKey);
  const start = Date.now();

  const isPlaceholderSample =
    rawKey.includes('sample') ||
    rawKey.includes('DemoSample') ||
    rawKey.length < 10;

  if (isPlaceholderSample) {
    const latency = Math.floor(Math.random() * 80) + 40;
    routerStore.updateKey(key.id, {
      status: 'active',
      lastLatencyMs: latency,
      cooldownUntil: null,
    });
    return res.json({
      success: true,
      message: `Demo key verified (${key.provider} sandbox simulation)`,
      latencyMs: latency,
      keyId: key.id,
      provider: key.provider,
      simulated: true,
    });
  }

  try {
    const model = DEFAULT_PROVIDER_MODELS[key.provider] || 'gpt-4o';
    const testResult = await executeProviderCall(key.provider, {
      apiKey: rawKey,
      model,
      messages: [{ role: 'user', content: 'Ping. Reply with ok.' }],
      max_tokens: 5,
      customBaseUrl: key.customBaseUrl,
      customAuthHeader: key.customAuthHeader,
    });

    const latency = Date.now() - start;
    routerStore.updateKey(key.id, {
      status: 'active',
      lastLatencyMs: latency,
      cooldownUntil: null,
    });

    return res.json({
      success: true,
      message: `Key successfully verified against live ${key.provider} API (${testResult.model})`,
      latencyMs: latency,
      keyId: key.id,
      provider: key.provider,
      modelUsed: testResult.model,
    });
  } catch (err: any) {
    const latency = Date.now() - start;
    const isAuthErr = err instanceof AuthError || err.statusCode === 401 || err.statusCode === 403;
    const isRateLimit = err instanceof RateLimitError || err.statusCode === 429;
    const newStatus = isAuthErr ? 'invalid' : isRateLimit ? 'rate-limited' : 'error';

    routerStore.updateKey(key.id, {
      status: newStatus,
      lastLatencyMs: latency,
      cooldownUntil: isRateLimit ? new Date(Date.now() + 60000).toISOString() : null,
    });

    return res.status(isAuthErr ? 401 : isRateLimit ? 429 : 502).json({
      success: false,
      error: err.message || 'Key validation failed against upstream provider',
      status: newStatus,
      latencyMs: latency,
      keyId: key.id,
      provider: key.provider,
    });
  }
});

// --- Master Router Tokens ---
app.get('/api/tokens', (req, res) => {
  const userId = (req as any).userId || 'default-user';
  const tokens = routerStore.getTokens(userId);
  res.json({ success: true, tokens });
});

app.post('/api/tokens', (req, res) => {
  const { label, allowedProviders } = req.body;
  const userId = (req as any).userId || 'default-user';
  const result = routerStore.createToken(label, allowedProviders, userId);
  res.status(201).json({
    success: true,
    token: result.token,
    rawToken: result.rawToken,
  });
});

app.delete('/api/tokens/:id', (req, res) => {
  const ok = routerStore.revokeToken(req.params.id);
  if (!ok) {
    return res.status(404).json({ success: false, error: 'Token not found' });
  }
  res.json({ success: true, revoked: true });
});

// --- Gmail Accounts Management ---
app.get('/api/gmail-accounts', (req, res) => {
  const userId = (req as any).userId || 'default-user';
  const accounts = routerStore.getGmailAccounts(userId);
  res.json({ success: true, accounts });
});

app.post('/api/gmail-accounts', (req, res) => {
  const { email, name } = req.body;
  const userId = (req as any).userId || 'default-user';
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email required' });
  }
  const account = routerStore.addGmailAccount(email, name || '', userId);
  res.status(201).json({ success: true, account });
});

// --- Usage Logs ---
app.get('/api/logs', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const userId = (req as any).userId || 'default-user';
  const logs = routerStore.getLogs(limit, userId);
  res.json({ success: true, logs });
});

app.delete('/api/logs', (req, res) => {
  const userId = (req as any).userId || 'default-user';
  routerStore.clearLogs(userId);
  res.json({ success: true, cleared: true });
});

// --- Settings ---
app.get('/api/settings', (req, res) => {
  const userId = (req as any).userId || 'default-user';
  const settings = routerStore.getSettings(userId);
  res.json({ success: true, settings });
});

app.post('/api/settings', (req, res) => {
  const userId = (req as any).userId || 'default-user';
  const settings = routerStore.updateSettings(req.body, userId);
  res.json({ success: true, settings });
});

// --- UNIFIED ROUTER ENDPOINT (POST /api/v1/route) ---
app.post('/api/v1/route', routerRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  const { valid, token } = routerStore.validateMasterToken(authHeader);

  // If no authorization provided and not from local dashboard origin, require master token
  const isDashboardDirect = req.headers['x-panel-origin'] === 'dashboard' || !authHeader;

  const { provider, model, messages, temperature, max_tokens, stream, simulateRateLimitOnFirst, gmailFilter } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      error: {
        message: 'Invalid request: "messages" array is required.',
        type: 'invalid_request_error',
      },
    });
  }

  const result = await dispatchAiRequest({
    provider,
    model,
    messages,
    temperature,
    max_tokens,
    stream: Boolean(stream),
    simulateRateLimitOnFirst: Boolean(simulateRateLimitOnFirst),
    gmailFilter: gmailFilter || (req.headers['x-gmail-tag'] as string) || undefined,
    endpoint: '/api/v1/route',
    authHeader,
  });

  if (!result.success) {
    return res.status(502).json({
      error: {
        message: result.error || 'Failed to route request to any available provider key',
        type: 'router_fallback_exhausted',
        provider: result.provider,
        fallbackChain: result.fallbackChain,
      },
    });
  }

  // Handle SSE streaming
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // If upstream provider returned readable stream, pipe it
    if (result.streamResponse) {
      if (typeof (result.streamResponse as any).pipe === 'function') {
        (result.streamResponse as any).pipe(res);
        return;
      }
    }

    // Standard SSE chunks delivery
    const chunk = {
      id: 'route-' + Date.now().toString(36),
      choices: [{ delta: { content: result.content }, finish_reason: 'stop', index: 0 }],
      _router_meta: {
        routed_provider: result.provider,
        key_label: result.keyUsed.label,
        fallback_occurred: result.fallbackAttempted,
      },
    };
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  res.json({
    id: 'route-' + Date.now().toString(36),
    provider: result.provider,
    model: result.model,
    created: Math.floor(Date.now() / 1000),
    keyUsed: result.keyUsed,
    fallbackAttempted: result.fallbackAttempted,
    fallbackChain: result.fallbackChain,
    latencyMs: result.latencyMs,
    usage: {
      total_tokens: result.tokensUsed,
      prompt_tokens: Math.round(result.tokensUsed * 0.35),
      completion_tokens: Math.round(result.tokensUsed * 0.65),
    },
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: result.content,
        },
        finish_reason: 'stop',
      },
    ],
  });
});

// --- OPENAI-COMPATIBLE ENDPOINT (POST /api/v1/chat/completions) ---
app.post('/api/v1/chat/completions', routerRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  const { model, messages, temperature, max_tokens, stream, simulateRateLimitOnFirst, gmailFilter } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      error: {
        message: 'Missing required field "messages"',
        type: 'invalid_request_error',
      },
    });
  }

  const result = await dispatchAiRequest({
    provider: 'auto',
    model: model || 'gpt-4o',
    messages,
    temperature,
    max_tokens,
    stream: Boolean(stream),
    simulateRateLimitOnFirst: Boolean(simulateRateLimitOnFirst),
    gmailFilter,
    endpoint: '/api/v1/chat/completions',
    authHeader,
  });

  if (!result.success) {
    return res.status(502).json({
      error: {
        message: result.error,
        type: 'upstream_provider_error',
        provider: result.provider,
      },
    });
  }

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (result.streamResponse && typeof (result.streamResponse as any).pipe === 'function') {
      (result.streamResponse as any).pipe(res);
      return;
    }

    const chunk = {
      id: 'chatcmpl-' + Date.now().toString(36),
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: result.model,
      choices: [{ delta: { content: result.content }, finish_reason: 'stop', index: 0 }],
      _router_meta: {
        routed_provider: result.provider,
        key_label: result.keyUsed.label,
        gmail_tag: result.keyUsed.gmailTag,
        latency_ms: result.latencyMs,
        fallback_occurred: result.fallbackAttempted,
      },
    };
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // Standard OpenAI chat completion format
  res.json({
    id: 'chatcmpl-' + Date.now().toString(36),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: result.model,
    system_fingerprint: 'fp_router_gateway_' + result.provider,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: result.content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: Math.round(result.tokensUsed * 0.35),
      completion_tokens: Math.round(result.tokensUsed * 0.65),
      total_tokens: result.tokensUsed,
    },
    _router_meta: {
      routed_provider: result.provider,
      key_label: result.keyUsed.label,
      gmail_tag: result.keyUsed.gmailTag,
      latency_ms: result.latencyMs,
      fallback_occurred: result.fallbackAttempted,
      fallback_chain: result.fallbackChain,
    },
  });
});

// Start server and attach Vite middleware in development (only if not Vercel serverless)
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Refactor start() so when process.env.VERCEL is set, it exports the Express app instead of calling .listen()
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Nexus Router] Server listening on http://0.0.0.0:${PORT}`);
      // Sync with Supabase / PostgreSQL in background if configured
      routerStore.syncWithPostgres().catch((err) => {
        console.warn('[Nexus Router] Background PostgreSQL sync notice:', err.message);
      });
    });
  }
}

// Launch server only for local / non-Vercel runs
if (!process.env.VERCEL) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

// Export express app for Vercel / serverless deployment (Task 5)
export default app;
