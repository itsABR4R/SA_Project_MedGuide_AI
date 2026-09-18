import assert from 'node:assert/strict';
import test from 'node:test';
import { ConfigurationError, loadConfig } from '../server/src/config/env.js';

const baseEnvironment = {
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/medguide_ai',
  OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  OPENROUTER_APP_URL: 'http://localhost:3000'
};

test('configuration is validated, normalized, and deeply immutable', () => {
  const configuration = loadConfig({
    env: baseEnvironment,
    argv: ['node', 'server/index.js', '--port', '4100', '--host', '127.0.0.1']
  });

  assert.equal(configuration.env, 'test');
  assert.equal(configuration.host, '127.0.0.1');
  assert.equal(configuration.port, 4100);
  assert.equal(configuration.mongodb.maxPoolSize, 10);
  assert.equal(configuration.openRouter.dataCollection, 'deny');
  assert.equal(configuration.openRouter.speechModel, 'google/gemini-3.1-flash-tts-preview');
  assert.equal(configuration.openRouter.speechVoice, 'Kore');
  assert.equal(configuration.openRouter.speechApiUrl, 'https://openrouter.ai/api/v1/audio/speech');
  assert.equal(configuration.logLevel, 'silent');
  assert.ok(Object.isFrozen(configuration));
  assert.ok(Object.isFrozen(configuration.mongodb));
});

test('configuration rejects invalid values before the server starts', () => {
  assert.throws(
    () => loadConfig({ env: { ...baseEnvironment, PORT: '70000' }, argv: [] }),
    (error) => error instanceof ConfigurationError && /PORT/.test(error.message)
  );
  assert.throws(
    () => loadConfig({ env: { ...baseEnvironment, TRUST_PROXY: 'sometimes' }, argv: [] }),
    (error) => error instanceof ConfigurationError && /TRUST_PROXY/.test(error.message)
  );
  assert.throws(
    () =>
      loadConfig({
        env: {
          ...baseEnvironment,
          HTTP_KEEP_ALIVE_TIMEOUT_MS: '10000',
          HTTP_HEADERS_TIMEOUT_MS: '9000'
        },
        argv: []
      }),
    (error) => error instanceof ConfigurationError && /HTTP_HEADERS_TIMEOUT_MS/.test(error.message)
  );
});

test('Vercel configuration uses platform-safe defaults without changing local defaults', () => {
  const environment = { ...baseEnvironment };
  delete environment.OPENROUTER_APP_URL;
  const configuration = loadConfig({
    env: {
      ...environment,
      VERCEL: '1',
      VERCEL_URL: 'medguide-ai-preview.vercel.app'
    },
    argv: []
  });

  assert.equal(configuration.trustProxy, true);
  assert.equal(configuration.mongodb.maxPoolSize, 5);
  assert.match(configuration.publicDir, /[/\\]public$/);
  assert.equal(configuration.openRouter.appUrl, 'https://medguide-ai-preview.vercel.app/');
});
