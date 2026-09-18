import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/src/app.js';
import { createMemoryRepository } from '../server/src/repositories/memory.repository.js';
import { createAiService } from '../server/src/services/ai.service.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = {
  env: 'test',
  trustProxy: false,
  publicDir: path.join(projectRoot, 'client', 'dist'),
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
const spokenTexts = [];
const speechService = {
  async speak(text) {
    spokenTexts.push(text);
    return Buffer.from('test-mp3-audio');
  }
};
const app = createApp({
  repository,
  aiService,
  speechService,
  config,
  getDatabaseStatus: () => 'connected'
});
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
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
  let conversationId = '';
  let conversationResponseId = '';

  await t.test('serves the application and reports its dependencies', async () => {
    const page = await fetch(baseUrl);
    assert.equal(page.status, 200);
    const pageText = await page.text();
    assert.match(pageText, /MedGuide AI/);
    assert.match(pageText, /id="root"/);

    const { response, json } = await request('/api/health');
    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.match(response.headers.get('x-request-id'), /^[A-Za-z0-9-]+$/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(response.headers.get('content-security-policy'), /script-src[^;]*unsafe-inline/);
    assert.match(response.headers.get('content-security-policy'), /media-src 'self' blob:/);
    assert.match(response.headers.get('permissions-policy'), /microphone=\(self\)/);
    assert.doesNotMatch(response.headers.get('permissions-policy'), /microphone=\(\)/);
    assert.deepEqual(json.database, { provider: 'memory', status: 'connected' });
    assert.equal(json.provider, 'openrouter');
    assert.equal(json.model, 'test/model');
  });

  await t.test('requires JSON for state-changing API requests', async () => {
    const response = await fetch(`${baseUrl}/api/register`, { method: 'POST', body: 'not-json' });
    assert.equal(response.status, 415);
    assert.equal((await response.json()).error.code, 'JSON_REQUIRED');

    const banglaResponse = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Accept-Language': 'bn-BD' },
      body: 'not-json'
    });
    const banglaError = await banglaResponse.json();
    assert.equal(banglaResponse.status, 415);
    assert.equal(banglaResponse.headers.get('content-language'), 'bn-BD');
    assert.equal(banglaError.error.code, 'JSON_REQUIRED');
    assert.match(banglaError.error.message, /[\u0980-\u09ff]/);
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

  await t.test('generates authenticated fallback audio for read aloud', async () => {
    const response = await fetch(`${baseUrl}/api/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ text: 'পর্যাপ্ত বিশ্রাম নিন।' })
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^audio\/mpeg(?:;|$)/i);
    assert.equal(Buffer.from(await response.arrayBuffer()).toString(), 'test-mp3-audio');
    assert.equal(spokenTexts.at(-1), 'পর্যাপ্ত বিশ্রাম নিন।');
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

  await t.test('returns Bangla analysis and source metadata when Bangla mode is selected', async () => {
    const analyzed = await request('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'bn-BD',
        Cookie: cookie
      },
      body: JSON.stringify({
        symptoms: 'গতকাল থেকে মাথাব্যথা ও ক্লান্তি অনুভব করছি',
        severity: 'moderate',
        tags: ['Headache']
      })
    });
    assert.equal(analyzed.response.status, 200);
    assert.equal(analyzed.response.headers.get('content-language'), 'bn-BD');
    assert.equal(analyzed.json.check.language, 'bn');
    assert.match(analyzed.json.check.analysis.summary, /[\u0980-\u09ff]/);
    assert.match(analyzed.json.check.sources[0].title, /[\u0980-\u09ff]/);

    const deleted = await request(`/api/checks/${analyzed.json.check.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookie }
    });
    assert.equal(deleted.response.status, 200);
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
    assert.equal(analyzed.json.check.analysis.conditions.length, 3);
    assert.ok(
      analyzed.json.check.analysis.conditions.slice(1).every((entry) => entry.matchLevel !== 'strong')
    );
    assert.ok(
      analyzed.json.check.analysis.conditions.every(
        (entry) => entry.matchPercentage >= 20 && entry.matchPercentage <= 89
      )
    );
    assert.ok(
      analyzed.json.check.analysis.conditions.every((entry) => entry.simpleExplanationPoints.length >= 3)
    );
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
    assert.equal(chatted.json.conversation.messages.length, 2);
    conversationId = chatted.json.conversation.id;

    const list = await request('/api/chat/conversations', { headers: { Cookie: cookie } });
    assert.equal(list.response.status, 200);
    assert.equal(list.json.conversations.length, 1);
    assert.equal(list.json.conversations[0].id, conversationId);

    const opened = await request(`/api/chat/conversations/${conversationId}`, {
      headers: { Cookie: cookie }
    });
    assert.equal(opened.response.status, 200);
    assert.equal(opened.json.conversation.messages[0].role, 'user');

    const continued = await request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ message: 'What changed most recently?', conversationId })
    });
    assert.equal(continued.response.status, 200);
    assert.equal(continued.json.conversation.id, conversationId);
    assert.equal(continued.json.conversation.messages.length, 4);
    conversationResponseId = continued.json.conversation.messages.at(-1).id;
  });

  await t.test('creates two saved branches with inherited context and rejects a third', async () => {
    const branchIds = [];
    for (let branchNumber = 1; branchNumber <= 2; branchNumber += 1) {
      const branched = await request(`/api/chat/conversations/${conversationId}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ sourceMessageId: conversationResponseId })
      });
      assert.equal(branched.response.status, 201);
      assert.equal(branched.json.conversation.rootConversationId, conversationId);
      assert.equal(branched.json.conversation.branchNumber, branchNumber);
      assert.equal(branched.json.conversation.messages.length, 0);
      assert.match(branched.json.conversation.contextSummary, /What changed most recently/i);
      branchIds.push(branched.json.conversation.id);
    }

    const rejected = await request(`/api/chat/conversations/${conversationId}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ sourceMessageId: conversationResponseId })
    });
    assert.equal(rejected.response.status, 409);
    assert.equal(rejected.json.error.code, 'BRANCH_LIMIT_REACHED');

    const list = await request('/api/chat/conversations', { headers: { Cookie: cookie } });
    assert.equal(list.json.conversations.length, 3);
    assert.deepEqual(
      list.json.conversations
        .filter((entry) => entry.rootConversationId === conversationId)
        .map((entry) => entry.branchNumber)
        .sort(),
      [1, 2]
    );
  });

  await t.test('deletes a saved chat conversation', async () => {
    const deleted = await request(`/api/chat/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: { Cookie: cookie }
    });
    assert.equal(deleted.response.status, 200);

    const list = await request('/api/chat/conversations', { headers: { Cookie: cookie } });
    assert.deepEqual(list.json.conversations, []);
  });

  await t.test('deleting a check also deletes its linked chat and branches', async () => {
    const analyzed = await request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        symptoms: 'Nausea after eating since this morning',
        severity: 'mild',
        tags: []
      })
    });
    const linkedCheckId = analyzed.json.check.id;
    const chatted = await request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ message: 'What should I monitor?', checkId: linkedCheckId, history: [] })
    });
    const linkedConversationId = chatted.json.conversation.id;
    const responseId = chatted.json.conversation.messages.at(-1).id;
    const branched = await request(`/api/chat/conversations/${linkedConversationId}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ sourceMessageId: responseId, checkId: linkedCheckId })
    });
    assert.equal(branched.response.status, 201);

    const scoped = await request(`/api/chat/conversations?checkId=${encodeURIComponent(linkedCheckId)}`, {
      headers: { Cookie: cookie }
    });
    assert.equal(scoped.response.status, 200);
    assert.equal(scoped.json.conversations.length, 2);
    assert.ok(scoped.json.conversations.every((entry) => entry.checkId === linkedCheckId));
    const unrelated = await request('/api/chat/conversations', { headers: { Cookie: cookie } });
    assert.deepEqual(unrelated.json.conversations, []);

    const deleted = await request(`/api/checks/${linkedCheckId}`, {
      method: 'DELETE',
      headers: { Cookie: cookie }
    });
    assert.equal(deleted.response.status, 200);
    const removedChat = await request(`/api/chat/conversations/${linkedConversationId}`, {
      headers: { Cookie: cookie }
    });
    assert.equal(removedChat.response.status, 404);
    assert.equal(removedChat.json.error.code, 'CONVERSATION_NOT_FOUND');
    assert.ok(
      repository.snapshot().conversations.every((entry) => entry.checkId !== linkedCheckId),
      'no linked root or branch remains after deleting its check'
    );
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

test('guest signup persists its profile, session, checks, chats, and branches as testing data', async () => {
  const created = await request('/api/guest-register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Guest Tester', age: 31, occupation: 'Product researcher' })
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.json.user.accountType, 'guest');
  assert.equal(created.json.user.email, '');
  assert.equal(created.json.user.age, 31);
  assert.equal(created.json.user.occupation, 'Product researcher');
  assert.match(created.json.user.id, /^guest_/);
  const guestId = created.json.user.id;
  const guestCookie = created.response.headers.get('set-cookie').split(';')[0];

  const me = await request('/api/me', { headers: { Cookie: guestCookie } });
  assert.equal(me.response.status, 200);
  assert.equal(me.json.user.id, guestId);
  assert.equal(me.json.user.accountType, 'guest');

  const updated = await request('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: guestCookie },
    body: JSON.stringify({
      name: 'Updated Guest Tester',
      age: 32,
      occupation: 'UX researcher',
      bloodType: '',
      allergies: ''
    })
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.json.user.occupation, 'UX researcher');

  const analyzed = await request('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: guestCookie },
    body: JSON.stringify({
      symptoms: 'Mild headache since this morning',
      severity: 'mild',
      tags: ['Headache']
    })
  });
  assert.equal(analyzed.response.status, 200);
  const guestCheckId = analyzed.json.check.id;

  const chatted = await request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: guestCookie },
    body: JSON.stringify({
      message: 'What should I monitor?',
      checkId: guestCheckId,
      history: []
    })
  });
  assert.equal(chatted.response.status, 200);
  const guestConversationId = chatted.json.conversation.id;
  const sourceMessageId = chatted.json.conversation.messages.at(-1).id;

  const branched = await request(`/api/chat/conversations/${guestConversationId}/branches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: guestCookie },
    body: JSON.stringify({ sourceMessageId, checkId: guestCheckId })
  });
  assert.equal(branched.response.status, 201);

  const beforeLogout = repository.snapshot();
  assert.ok(beforeLogout.guestUsers.some((entry) => entry.id === guestId));
  assert.ok(beforeLogout.sessions.some((entry) => entry.userId === guestId && entry.accountType === 'guest'));
  assert.ok(
    beforeLogout.checks.some(
      (entry) => entry.userId === guestId && entry.accountType === 'guest' && entry.id === guestCheckId
    )
  );
  assert.equal(
    beforeLogout.conversations.filter(
      (entry) => entry.userId === guestId && entry.accountType === 'guest' && entry.checkId === guestCheckId
    ).length,
    2
  );
  assert.ok(beforeLogout.users.every((entry) => entry.id !== guestId));

  const logout = await request('/api/logout', { method: 'POST', headers: { Cookie: guestCookie } });
  assert.equal(logout.response.status, 200);
  const afterLogout = repository.snapshot();
  assert.ok(afterLogout.guestUsers.some((entry) => entry.id === guestId));
  assert.ok(afterLogout.checks.some((entry) => entry.userId === guestId));
  assert.equal(afterLogout.conversations.filter((entry) => entry.userId === guestId).length, 2);
  assert.ok(afterLogout.sessions.every((entry) => entry.userId !== guestId));
});
