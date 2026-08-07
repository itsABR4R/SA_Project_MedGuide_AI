import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const testDirectory = await mkdtemp(path.join(tmpdir(), 'medguide-ai-'));
process.env.DATA_FILE = path.join(testDirectory, 'app.json');
process.env.NODE_ENV = 'test';
process.env.AI_TEST_MODE = '1';
delete process.env.OPENROUTER_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;

const { createServer } = await import('../server.mjs');
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(testDirectory, { recursive: true, force: true });
});

async function request(url, options = {}) {
  const response = await fetch(`${baseUrl}${url}`, options);
  const json = await response.json();
  return { response, json };
}

test('complete account, profile, analysis, chat, and history flow', async (t) => {
  let cookie = '';
  let checkId = '';
  let emergencyCheckId = '';

  await t.test('serves the application and health endpoint', async () => {
    const page = await fetch(baseUrl);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /MedGuide AI/);

    const { response, json } = await request('/api/health');
    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.equal(json.provider, 'openrouter');
    assert.equal(json.model, 'google/gemini-2.5-flash');
  });

  await t.test('creates an account and session', async () => {
    const { response, json } = await request('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'correct-horse-42' })
    });
    assert.equal(response.status, 201);
    assert.equal(json.user.email, 'test@example.com');
    cookie = response.headers.get('set-cookie').split(';')[0];
    assert.match(cookie, /^ahc_session=/);

    const stored = await readFile(process.env.DATA_FILE, 'utf8');
    assert.doesNotMatch(stored, /correct-horse-42/);
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
      body: JSON.stringify({
        symptoms: 'Headache and fatigue since yesterday',
        severity: 'moderate',
        tags: ['Headache']
      })
    });
    assert.equal(analyzed.response.status, 200);
    assert.equal(analyzed.json.check.analysis.urgent, false);
    assert.ok(analyzed.json.check.analysis.conditions.length > 0);
    assert.ok(analyzed.json.check.sources.length > 0);
    checkId = analyzed.json.check.id;
  });

  await t.test('prioritizes emergency warning language before AI analysis', async () => {
    const analyzed = await request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        symptoms: "I have severe chest pain and can't breathe",
        severity: 'severe',
        tags: []
      })
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

  await t.test('lists and deletes saved history', async () => {
    const history = await request('/api/checks', { headers: { Cookie: cookie } });
    assert.equal(history.response.status, 200);
    assert.equal(history.json.checks.length, 2);
    assert.ok(history.json.checks.some((entry) => entry.id === checkId));

    const deleted = await request(`/api/checks/${checkId}`, {
      method: 'DELETE',
      headers: { Cookie: cookie }
    });
    assert.equal(deleted.response.status, 200);

    const deletedEmergency = await request(`/api/checks/${emergencyCheckId}`, {
      method: 'DELETE',
      headers: { Cookie: cookie }
    });
    assert.equal(deletedEmergency.response.status, 200);

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
