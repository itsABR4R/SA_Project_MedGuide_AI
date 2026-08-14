import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, '../..');
dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });

function commandLineValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function booleanValue(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return !/^(0|false|no|off)$/i.test(String(value));
}

const port = Number(commandLineValue('--port') || process.env.PORT || 3000);

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  host: commandLineValue('--host') || process.env.HOST || '0.0.0.0',
  port,
  projectRoot,
  publicDir: path.join(projectRoot, 'public'),
  trustProxy: booleanValue(process.env.TRUST_PROXY, false),
  mongodb: {
    uri: String(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medguide_ai').trim(),
    autoIndex: booleanValue(process.env.MONGODB_AUTO_INDEX, true),
    serverSelectionTimeoutMs: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10_000),
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10)
  },
  session: {
    cookieName: 'ahc_session',
    maxAgeSeconds: 60 * 60 * 24 * 7
  },
  openRouter: {
    apiKey: String(process.env.OPENROUTER_API_KEY || '').trim(),
    apiUrl: process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
    appUrl: process.env.OPENROUTER_APP_URL || `http://localhost:${port}`,
    appName: process.env.OPENROUTER_APP_NAME || 'MedGuide AI',
    dataCollection: process.env.OPENROUTER_DATA_COLLECTION === 'allow' ? 'allow' : 'deny',
    zeroDataRetention: booleanValue(process.env.OPENROUTER_ZDR, true),
    timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS || 45_000)
  }
});
