import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { registerModels } from '../src/models/index.mjs';

test('MongoDB schemas define uniqueness, history, and session-expiry indexes', () => {
  const connection = mongoose.createConnection();
  const { User, Session, HealthCheck } = registerModels(connection);

  assert.ok(User.schema.indexes().some(([keys, options]) => keys.email === 1 && options.unique === true));
  assert.ok(Session.schema.indexes().some(([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0));
  assert.ok(Session.schema.indexes().some(([keys, options]) => keys.tokenHash === 1 && options.unique === true));
  assert.ok(HealthCheck.schema.indexes().some(([keys]) => keys.userId === 1 && keys.createdAt === -1));
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
  await assert.rejects(invalid.validate(), /less than minimum allowed value/);
});
