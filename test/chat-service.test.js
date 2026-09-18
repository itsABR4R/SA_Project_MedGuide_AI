import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryRepository } from '../server/src/repositories/memory.repository.js';
import { createChatService } from '../server/src/services/chat.service.js';

test('chat service persists, continues, isolates, and deletes user conversations', async () => {
  const repository = createMemoryRepository();
  const aiService = {
    async chat(_user, payload) {
      return `Safe reply to: ${payload.message}`;
    }
  };
  const chatService = createChatService({ repository, aiService });
  const owner = { id: 'owner-user' };

  const created = await chatService.send(owner, {
    message: 'What should I monitor?',
    history: [],
    conversationId: ''
  });
  assert.equal(created.conversation.userId, owner.id);
  assert.equal(created.conversation.messages.length, 2);

  const continued = await chatService.send(owner, {
    message: 'What if it changes?',
    history: [],
    conversationId: created.conversation.id
  });
  assert.equal(continued.conversation.messages.length, 4);
  assert.equal((await chatService.list(owner.id)).length, 1);

  await assert.rejects(
    chatService.get(created.conversation.id, 'different-user'),
    (error) => error.code === 'CONVERSATION_NOT_FOUND'
  );
  await assert.rejects(
    chatService.remove(created.conversation.id, 'different-user'),
    (error) => error.code === 'CONVERSATION_NOT_FOUND'
  );

  await chatService.remove(created.conversation.id, owner.id);
  assert.deepEqual(await chatService.list(owner.id), []);
});

test('chat service creates two contextual branches and enforces the main-chat limit', async () => {
  const repository = createMemoryRepository();
  const chatPayloads = [];
  const aiService = {
    async chat(_user, payload) {
      chatPayloads.push(payload);
      return `Safe reply to: ${payload.message}`;
    }
  };
  const chatService = createChatService({ repository, aiService });
  const owner = { id: 'branch-owner' };

  const main = await chatService.send(owner, {
    message: 'What should I watch for?',
    history: [],
    conversationId: '',
    contextLabel: 'Symptom-check summary',
    contextSummary: 'Your query: headache and nausea.'
  });
  const firstResponse = main.conversation.messages[1];
  const firstBranch = await chatService.branch(owner, main.conversation.id, firstResponse.id);

  assert.equal(firstBranch.conversation.rootConversationId, main.conversation.id);
  assert.equal(firstBranch.conversation.parentConversationId, main.conversation.id);
  assert.equal(firstBranch.conversation.branchNumber, 1);
  assert.equal(firstBranch.conversation.messages.length, 0);
  assert.match(firstBranch.conversation.contextSummary, /headache and nausea/i);
  assert.match(firstBranch.conversation.contextSummary, /What should I watch for/i);

  const continuedBranch = await chatService.send(owner, {
    message: 'Focus on the nausea instead.',
    history: [],
    conversationId: firstBranch.conversation.id
  });
  assert.equal(
    chatPayloads.at(-1).contextSummary,
    firstBranch.conversation.contextSummary,
    'the inherited context is supplied to AI chat'
  );

  const branchResponse = continuedBranch.conversation.messages.at(-1);
  const secondBranch = await chatService.branch(owner, continuedBranch.conversation.id, branchResponse.id);
  assert.equal(secondBranch.conversation.rootConversationId, main.conversation.id);
  assert.equal(secondBranch.conversation.parentConversationId, firstBranch.conversation.id);
  assert.equal(secondBranch.conversation.branchNumber, 2);

  await assert.rejects(
    chatService.branch(owner, main.conversation.id, firstResponse.id),
    (error) => error.code === 'BRANCH_LIMIT_REACHED' && error.status === 409
  );
  await assert.rejects(
    chatService.branch(owner, main.conversation.id, main.conversation.messages[0].id),
    (error) => error.code === 'BRANCH_SOURCE_INVALID'
  );

  assert.equal((await chatService.list(owner.id)).length, 3);
  await chatService.remove(main.conversation.id, owner.id);
  assert.deepEqual(await chatService.list(owner.id), []);
});

test('chat service scopes threads to a symptom check and check deletion cascades to its branches', async () => {
  const repository = createMemoryRepository();
  const selectedChecks = [];
  const aiService = {
    async chat(_user, payload, check) {
      selectedChecks.push(check?.id || null);
      return `Safe reply to: ${payload.message}`;
    }
  };
  const chatService = createChatService({ repository, aiService });
  const owner = { id: 'scoped-owner' };
  const firstCheck = await repository.createCheck({
    id: 'check-a',
    userId: owner.id,
    symptoms: 'Headache',
    severity: 'mild',
    tags: [],
    analysis: { summary: 'Headache guidance.' }
  });
  await repository.createCheck({
    id: 'check-b',
    userId: owner.id,
    symptoms: 'Stomach ache',
    severity: 'mild',
    tags: [],
    analysis: { summary: 'Stomach guidance.' }
  });

  const firstRoot = await chatService.send(owner, {
    message: 'What should I monitor?',
    checkId: firstCheck.id,
    history: []
  });
  const firstBranch = await chatService.branch(
    owner,
    firstRoot.conversation.id,
    firstRoot.conversation.messages[1].id,
    'en',
    firstCheck.id
  );
  const secondRoot = await chatService.send(owner, {
    message: 'What can settle my stomach?',
    checkId: 'check-b',
    history: []
  });
  const generalRoot = await chatService.send(owner, {
    message: 'How much water is typical?',
    checkId: null,
    history: []
  });

  assert.deepEqual(selectedChecks, ['check-a', 'check-b', null]);
  assert.deepEqual(
    (await chatService.list(owner.id, 'check-a')).map((entry) => entry.id).sort(),
    [firstRoot.conversation.id, firstBranch.conversation.id].sort()
  );
  assert.deepEqual(
    (await chatService.list(owner.id, 'check-b')).map((entry) => entry.id),
    [secondRoot.conversation.id]
  );
  assert.deepEqual(
    (await chatService.list(owner.id)).map((entry) => entry.id),
    [generalRoot.conversation.id]
  );
  await assert.rejects(
    chatService.get(secondRoot.conversation.id, owner.id, 'check-a'),
    (error) => error.code === 'CONVERSATION_SCOPE_MISMATCH'
  );

  assert.equal(await repository.deleteCheck('check-a', owner.id), true);
  const remainingIds = repository.snapshot().conversations.map((entry) => entry.id);
  assert.ok(!remainingIds.includes(firstRoot.conversation.id));
  assert.ok(!remainingIds.includes(firstBranch.conversation.id));
  assert.ok(remainingIds.includes(secondRoot.conversation.id));
  assert.ok(remainingIds.includes(generalRoot.conversation.id));
});

test('legacy symptom conversations are linked only by an exact unique check context', async () => {
  const repository = createMemoryRepository();
  const aiService = {
    async chat() {
      return 'Safe reply.';
    }
  };
  const chatService = createChatService({ repository, aiService });
  const ownerId = 'legacy-owner';
  const check = await repository.createCheck({
    id: 'legacy-check',
    userId: ownerId,
    symptoms: 'headache and nausea',
    severity: 'moderate',
    tags: [],
    analysis: { summary: 'Monitor the pattern and seek care if it worsens.' },
    createdAt: new Date('2026-09-10T10:00:00.000Z')
  });
  const root = await repository.createChatConversation({
    id: 'legacy-root',
    userId: ownerId,
    title: 'Legacy follow-up',
    contextSummary:
      'Your query: headache and nausea\n\nGuidance summary: Monitor the pattern and seek care if it worsens.\n\nSelected pattern: Migraine.',
    messages: [],
    createdAt: new Date('2026-09-10T10:01:00.000Z')
  });
  await repository.createChatConversation({
    id: 'legacy-branch',
    userId: ownerId,
    title: 'Legacy branch',
    rootConversationId: root.id,
    branchNumber: 1,
    messages: [],
    createdAt: new Date('2026-09-10T10:02:00.000Z')
  });

  const linked = await chatService.list(ownerId, check.id);
  assert.deepEqual(linked.map((entry) => entry.id).sort(), ['legacy-branch', 'legacy-root']);
  assert.ok(linked.every((entry) => entry.checkId === check.id));
  assert.deepEqual(await chatService.list(ownerId), []);
});
