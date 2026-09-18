import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, '../../..');
dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });

const ENVIRONMENTS = new Set(['development', 'test', 'production']);
const LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'silent']);

export class ConfigurationError extends Error {
  constructor(variable, message) {
    super(`${variable}: ${message}`);
    this.name = 'ConfigurationError';
    this.code = 'INVALID_CONFIGURATION';
  }
}

function commandLineValue(argv, flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function booleanValue(variable, value, fallback) {
  if (value === undefined || value === '') return fallback;
  if (/^(1|true|yes|on)$/i.test(String(value))) return true;
  if (/^(0|false|no|off)$/i.test(String(value))) return false;
  throw new ConfigurationError(variable, 'use true or false.');
}

function integerValue(variable, value, fallback, { min, max }) {
  const parsed = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ConfigurationError(variable, `use an integer from ${min} to ${max}.`);
  }
  return parsed;
}

function enumValue(variable, value, fallback, allowed) {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase();
  if (!allowed.has(normalized)) {
    throw new ConfigurationError(variable, `use one of: ${[...allowed].join(', ')}.`);
  }
  return normalized;
}

function httpUrl(variable, value) {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
    return parsed.toString();
  } catch {
    throw new ConfigurationError(variable, 'use a valid HTTP or HTTPS URL.');
  }
}

function deploymentUrl(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return undefined;
  return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
}

function mongoUri(value) {
  const normalized = String(value || '').trim();
  if (!/^mongodb(?:\+srv)?:\/\//i.test(normalized)) {
    throw new ConfigurationError(
      'MONGODB_URI',
      'use a valid mongodb:// or mongodb+srv:// connection string.'
    );
  }
  return normalized;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

export function loadConfig({ env = process.env, argv = process.argv } = {}) {
  const environment = enumValue('NODE_ENV', env.NODE_ENV, 'development', ENVIRONMENTS);
  const isVercel = booleanValue('VERCEL', env.VERCEL, false);
  const port = integerValue('PORT', commandLineValue(argv, '--port') || env.PORT, 3000, {
    min: 1,
    max: 65_535
  });
  const host = String(commandLineValue(argv, '--host') || env.HOST || '0.0.0.0').trim();
  if (!host) throw new ConfigurationError('HOST', 'cannot be empty.');

  const appUrl =
    env.OPENROUTER_APP_URL ||
    deploymentUrl(env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL) ||
    `http://localhost:${port}`;
  const configuration = {
    env: environment,
    logLevel: enumValue('LOG_LEVEL', env.LOG_LEVEL, environment === 'test' ? 'silent' : 'info', LOG_LEVELS),
    host,
    port,
    projectRoot,
    publicDir: isVercel ? path.join(projectRoot, 'public') : path.join(projectRoot, 'client', 'dist'),
    trustProxy: booleanValue('TRUST_PROXY', env.TRUST_PROXY, isVercel),
    http: {
      bodyLimit: env.HTTP_BODY_LIMIT || '48kb',
      keepAliveTimeoutMs: integerValue('HTTP_KEEP_ALIVE_TIMEOUT_MS', env.HTTP_KEEP_ALIVE_TIMEOUT_MS, 5_000, {
        min: 1_000,
        max: 120_000
      }),
      headersTimeoutMs: integerValue('HTTP_HEADERS_TIMEOUT_MS', env.HTTP_HEADERS_TIMEOUT_MS, 6_000, {
        min: 2_000,
        max: 180_000
      }),
      requestTimeoutMs: integerValue('HTTP_REQUEST_TIMEOUT_MS', env.HTTP_REQUEST_TIMEOUT_MS, 60_000, {
        min: 5_000,
        max: 300_000
      }),
      shutdownTimeoutMs: integerValue('SHUTDOWN_TIMEOUT_MS', env.SHUTDOWN_TIMEOUT_MS, 10_000, {
        min: 1_000,
        max: 60_000
      })
    },
    mongodb: {
      uri: mongoUri(env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medguide_ai'),
      autoIndex: booleanValue('MONGODB_AUTO_INDEX', env.MONGODB_AUTO_INDEX, true),
      serverSelectionTimeoutMs: integerValue(
        'MONGODB_SERVER_SELECTION_TIMEOUT_MS',
        env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
        10_000,
        { min: 1_000, max: 120_000 }
      ),
      socketTimeoutMs: integerValue('MONGODB_SOCKET_TIMEOUT_MS', env.MONGODB_SOCKET_TIMEOUT_MS, 45_000, {
        min: 5_000,
        max: 300_000
      }),
      minPoolSize: integerValue('MONGODB_MIN_POOL_SIZE', env.MONGODB_MIN_POOL_SIZE, 0, { min: 0, max: 50 }),
      maxPoolSize: integerValue('MONGODB_MAX_POOL_SIZE', env.MONGODB_MAX_POOL_SIZE, isVercel ? 5 : 10, {
        min: 1,
        max: 100
      })
    },
    session: {
      cookieName: env.SESSION_COOKIE_NAME || 'ahc_session',
      maxAgeSeconds: integerValue('SESSION_MAX_AGE_SECONDS', env.SESSION_MAX_AGE_SECONDS, 60 * 60 * 24 * 7, {
        min: 300,
        max: 60 * 60 * 24 * 30
      })
    },
    openRouter: {
      apiKey: String(env.OPENROUTER_API_KEY || '').trim(),
      apiUrl: httpUrl(
        'OPENROUTER_API_URL',
        env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions'
      ),
      model: String(env.OPENROUTER_MODEL || 'google/gemini-2.5-flash').trim(),
      speechModel: String(env.OPENROUTER_TTS_MODEL || 'google/gemini-3.1-flash-tts-preview').trim(),
      speechVoice: String(env.OPENROUTER_TTS_VOICE || 'Kore').trim(),
      speechApiUrl: httpUrl(
        'OPENROUTER_TTS_API_URL',
        env.OPENROUTER_TTS_API_URL || 'https://openrouter.ai/api/v1/audio/speech'
      ),
      appUrl: httpUrl('OPENROUTER_APP_URL', appUrl),
      appName: String(env.OPENROUTER_APP_NAME || 'MedGuide AI').trim(),
      dataCollection: env.OPENROUTER_DATA_COLLECTION === 'allow' ? 'allow' : 'deny',
      zeroDataRetention: booleanValue('OPENROUTER_ZDR', env.OPENROUTER_ZDR, true),
      timeoutMs: integerValue('OPENROUTER_TIMEOUT_MS', env.OPENROUTER_TIMEOUT_MS, 45_000, {
        min: 5_000,
        max: 180_000
      })
    }
  };

  if (!configuration.openRouter.model) {
    throw new ConfigurationError('OPENROUTER_MODEL', 'cannot be empty.');
  }
  if (!configuration.openRouter.speechModel || !configuration.openRouter.speechVoice) {
    throw new ConfigurationError('OPENROUTER_TTS_MODEL / OPENROUTER_TTS_VOICE', 'must not be empty.');
  }
  if (!configuration.openRouter.appName) {
    throw new ConfigurationError('OPENROUTER_APP_NAME', 'cannot be empty.');
  }
  if (configuration.http.headersTimeoutMs <= configuration.http.keepAliveTimeoutMs) {
    throw new ConfigurationError(
      'HTTP_HEADERS_TIMEOUT_MS',
      'must be greater than HTTP_KEEP_ALIVE_TIMEOUT_MS.'
    );
  }

  return deepFreeze(configuration);
}

export const config = loadConfig();
