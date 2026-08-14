import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.mjs';
import { createMemoryRepository } from '../src/repositories/memory.repository.mjs';
import { createAiService } from '../src/services/ai.service.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = {
  env: 'test',
  trustProxy: false,
  publicDir: path.join(projectRoot, 'public'),
  session: { cookieName: 'ahc_session', maxAgeSeconds: 60 * 60 * 24 * 7 },
  openRouter: {
    apiKey: '',
    apiUrl: 'https://example.invalid/chat/completions',
    model: 'test/model',
    appUrl: 'http://localhost:3000',
    appName: 'MedGuide AI Test',
    dataCollection: 'deny',
    zeroDataRetention: true,
    timeoutMs: 1000
  }
};
const repository = createMemoryRepository();
const aiService = createAiService({ config, testMode: true });
const app = createApp({ repository, aiService, config, getDatabaseStatus: () => 'connected' });
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function request(url, options = {}) {
  const response = await fetch(`${baseUrl}${url}`, options);
  const json = await response.json();
  return { response, json };
}

test('complete account, profile, analysis, chat, history, and security flow', async (t) => {
  let cookie = '';
  let checkId = '';
  let emergencyCheckId = '';

  await t.test('serves the application and reports its dependencies', async () => {
    const page = await fetch(baseUrl);
    assert.equal(page.status, 200);
    const pageText = await page.text();
    assert.match(pageText, /MedGuide AI/);
    assert.match(pageText, /id="product-tour"/);

    const browserScript = await fetch(`${baseUrl}/app.js`);
    assert.equal(browserScript.status, 200);
    assert.match(await browserScript.text(), /Other possible matches/);

    const { response, json } = await request('/api/health');
    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.deepEqual(json.database, { provider: 'memory', status: 'connected' });
    assert.equal(json.provider, 'openrouter');
    assert.equal(json.model, 'test/model');
  });

  await t.test('requires JSON for state-changing API requests', async () => {
    const response = await fetch(`${baseUrl}/api/register`, { method: 'POST', body: 'not-json' });
    assert.equal(response.status, 415);
    assert.equal((await response.json()).error.code, 'JSON_REQUIRED');
  });

  await t.test('creates an account without storing the plaintext password', async () => {
    const { response, json } = await request('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'correct-horse-42' })
    });
    assert.equal(response.status, 201);
    assert.equal(json.user.email, 'test@example.com');
    assert.equal(json.user.onboardingCompleted, false);
    cookie = response.headers.get('set-cookie').split(';')[0];
    assert.match(cookie, /^ahc_session=/);
    assert.doesNotMatch(JSON.stringify(repository.snapshot()), /correct-horse-42/);
  });

  await t.test('prevents duplicate accounts', async () => {
    const duplicate = await request('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Duplicate', email: 'TEST@example.com', password: 'another-password' })
    });
    assert.equal(duplicate.response.status, 409);
    assert.equal(duplicate.json.error.code, 'EMAIL_EXISTS');
  });

  await t.test('persists one-time product-tour completion for the account', async () => {
    const before = await request('/api/me', { headers: { Cookie: cookie } });
    assert.equal(before.json.user.onboardingCompleted, false);

    const completed = await request('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ completed: true })
    });
    assert.equal(completed.response.status, 200);
    assert.equal(completed.json.user.onboardingCompleted, true);

    const after = await request('/api/me', { headers: { Cookie: cookie } });
    assert.equal(after.json.user.onboardingCompleted, true);
  });

  await t.test('loads and updates the signed-in profile', async () => {
    const me = await request('/api/me', { headers: { Cookie: cookie } });
    assert.equal(me.response.status, 200);
    assert.equal(me.json.user.name, 'Test User');

    const updated = await request('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Updated User', age: 34, bloodType: 'O+', allergies: 'Penicillin' })
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.json.user.age, 34);
    assert.equal(updated.json.user.bloodType, 'O+');
  });

  await t.test('creates and saves a structured AI check', async () => {
    const analyzed = await request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ symptoms: 'Headache and fatigue since yesterday', severity: 'moderate', tags: ['Headache'] })
    });
    assert.equal(analyzed.response.status, 200);
    assert.equal(analyzed.json.check.analysis.urgent, false);
    assert.equal(analyzed.json.check.analysis.conditions.length, 3);
    assert.ok(analyzed.json.check.analysis.conditions.slice(1).every((entry) => entry.matchLevel !== 'strong'));
    assert.ok(analyzed.json.check.sources.length > 0);
    checkId = analyzed.json.check.id;
  });

  await t.test('prioritizes emergency warning language before AI analysis', async () => {
    const analyzed = await request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ symptoms: "I have severe chest pain and can't breathe", severity: 'severe', tags: [] })
    });
    assert.equal(analyzed.response.status, 200);
    assert.equal(analyzed.json.check.analysis.urgent, true);
    assert.match(analyzed.json.check.analysis.urgentMessage, /emergency/i);
    emergencyCheckId = analyzed.json.check.id;
  });

  await t.test('returns a safety-bounded chat reply', async () => {
    const chatted = await request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ message: 'What should I monitor?', history: [] })
    });
    assert.equal(chatted.response.status, 200);
    assert.match(chatted.json.reply, /cannot diagnose/i);
  });

  await t.test('lists and deletes only the signed-in user history', async () => {
    const history = await request('/api/checks', { headers: { Cookie: cookie } });
    assert.equal(history.response.status, 200);
    assert.equal(history.json.checks.length, 2);
    assert.ok(history.json.checks.some((entry) => entry.id === checkId));

    for (const id of [checkId, emergencyCheckId]) {
      const deleted = await request(`/api/checks/${id}`, { method: 'DELETE', headers: { Cookie: cookie } });
      assert.equal(deleted.response.status, 200);
    }
    const empty = await request('/api/checks', { headers: { Cookie: cookie } });
    assert.equal(empty.json.checks.length, 0);
  });

  await t.test('rejects a cross-origin state-changing request', async () => {
    const rejected = await request('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: 'https://attacker.example' },
      body: JSON.stringify({ name: 'Should Not Save' })
    });
    assert.equal(rejected.response.status, 403);
    assert.equal(rejected.json.error.code, 'ORIGIN_REJECTED');
  });

  await t.test('signs out and rejects the old session', async () => {
    const logout = await request('/api/logout', { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(logout.response.status, 200);
    const me = await request('/api/me', { headers: { Cookie: cookie } });
    assert.equal(me.response.status, 401);
  });
});
