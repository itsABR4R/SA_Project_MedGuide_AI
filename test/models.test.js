import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { registerModels } from '../server/src/models/index.js';

test('MongoDB schemas define uniqueness, history, chat, and session-expiry indexes', () => {
  const connection = mongoose.createConnection();
  const { User, GuestUser, Session, HealthCheck, ChatConversation } = registerModels(connection);

  assert.ok(User.schema.indexes().some(([keys, options]) => keys.email === 1 && options.unique === true));
  assert.ok(GuestUser.schema.indexes().some(([keys]) => keys.createdAt === -1));
  assert.ok(
    Session.schema
      .indexes()
      .some(([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0)
  );
  assert.ok(
    Session.schema.indexes().some(([keys, options]) => keys.tokenHash === 1 && options.unique === true)
  );
  assert.ok(HealthCheck.schema.indexes().some(([keys]) => keys.userId === 1 && keys.createdAt === -1));
  assert.ok(HealthCheck.schema.indexes().some(([keys]) => keys.accountType === 1 && keys.createdAt === -1));
  assert.ok(ChatConversation.schema.indexes().some(([keys]) => keys.userId === 1 && keys.updatedAt === -1));
  assert.ok(
    ChatConversation.schema.indexes().some(([keys]) => keys.accountType === 1 && keys.updatedAt === -1)
  );
  assert.ok(
    ChatConversation.schema
      .indexes()
      .some(([keys]) => keys.userId === 1 && keys.checkId === 1 && keys.updatedAt === -1)
  );
  assert.ok(
    ChatConversation.schema
      .indexes()
      .some(
        ([keys, options]) =>
          keys.userId === 1 &&
          keys.rootConversationId === 1 &&
          keys.branchNumber === 1 &&
          options.unique === true
      )
  );
});

test('MongoDB chat schema validates message roles and stores bounded content fields', async () => {
  const connection = mongoose.createConnection();
  const { ChatConversation } = registerModels(connection);
  const invalid = new ChatConversation({
    userId: 'user-id',
    title: 'Example conversation',
    messages: [{ id: 'message-id', role: 'system', content: 'Not allowed' }]
  });

  await assert.rejects(invalid.validate(), /not a valid enum value/);

  const invalidBranch = new ChatConversation({
    userId: 'user-id',
    title: 'Invalid branch',
    rootConversationId: 'root-id',
    branchNumber: 3,
    messages: []
  });
  await assert.rejects(invalidBranch.validate(), /more than maximum allowed value/);
});

test('MongoDB user schema validates profile constraints', async () => {
  const connection = mongoose.createConnection();
  const { User } = registerModels(connection);
  const invalid = new User({
    email: 'test@example.com',
    name: 'Test User',
    age: 10,
    passwordSalt: 'salt',
    passwordHash: 'hash'
  });
  assert.equal(invalid.onboardingCompleted, true);
  assert.equal(invalid.accountType, 'registered');
  await assert.rejects(invalid.validate(), /less than minimum allowed value/);
});

test('MongoDB guest schema keeps testing profiles separate and requires demographics', async () => {
  const connection = mongoose.createConnection();
  const { GuestUser } = registerModels(connection);
  const valid = new GuestUser({
    name: 'Guest Tester',
    age: 27,
    occupation: 'Student'
  });

  await valid.validate();
  assert.match(valid.id, /^guest_/);
  assert.equal(valid.accountType, 'guest');
  assert.equal(valid.onboardingCompleted, false);
  assert.equal(GuestUser.collection.collectionName, 'guest_users');

  const missingOccupation = new GuestUser({ name: 'Guest Tester', age: 27 });
  await assert.rejects(missingOccupation.validate(), /occupation.*required/i);
});
