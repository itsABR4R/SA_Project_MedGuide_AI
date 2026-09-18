import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { createMongoRepository } from '../server/src/repositories/mongo.repository.js';

function assertTrustedOperator(filter, field, operator) {
  mongoose.sanitizeFilter(filter);
  assert.equal(filter[field].$eq, undefined);
  assert.ok(operator in filter[field]);
}

test('guest account operations use the separate guest-user model', async () => {
  const calls = [];
  const User = {
    findById() {
      throw new Error('Registered-user model should not be queried for a known guest session.');
    },
    findByIdAndUpdate() {
      throw new Error('Registered-user model should not be updated for a guest profile.');
    },
    async deleteOne() {
      throw new Error('Registered-user model should not delete a guest profile.');
    }
  };
  const GuestUser = {
    async create(data) {
      calls.push(['create', data]);
      return { _id: 'guest-created', accountType: 'guest', ...data };
    },
    findById(id) {
      calls.push(['find', id]);
      return {
        async lean() {
          return { _id: id, accountType: 'guest', name: 'Guest Tester' };
        }
      };
    },
    findByIdAndUpdate(id, update) {
      calls.push(['update', id, update]);
      return {
        async lean() {
          return { _id: id, accountType: 'guest', ...update.$set };
        }
      };
    },
    async deleteOne(filter) {
      calls.push(['delete', filter]);
    }
  };
  const repository = createMongoRepository({
    User,
    GuestUser,
    Session: {},
    HealthCheck: {},
    ChatConversation: {}
  });

  const created = await repository.createGuestUser({ name: 'Guest Tester' });
  const found = await repository.findUserById('guest-created', 'guest');
  const updated = await repository.updateUser('guest-created', { occupation: 'Researcher' }, 'guest');
  await repository.deleteUser('guest-created', 'guest');

  assert.equal(created.id, 'guest-created');
  assert.equal(found.accountType, 'guest');
  assert.equal(updated.occupation, 'Researcher');
  assert.deepEqual(
    calls.map(([operation]) => operation),
    ['create', 'find', 'update', 'delete']
  );
});

test('session range filters remain valid when Mongoose filter sanitization is enabled', async () => {
  const filters = {};
  const Session = {
    async deleteMany(filter) {
      filters.expired = filter;
    },
    async create() {},
    findOne(filter) {
      filters.active = filter;
      return {
        async lean() {
          return {
            _id: 'session-id',
            tokenHash: 'token-hash',
            userId: 'user-id',
            expiresAt: new Date('2030-01-01T00:00:00.000Z')
          };
        }
      };
    }
  };
  const repository = createMongoRepository({ User: {}, Session, HealthCheck: {} });

  await repository.createSession({
    tokenHash: 'token-hash',
    userId: 'user-id',
    expiresAt: new Date('2030-01-01T00:00:00.000Z')
  });
  const session = await repository.findSession('token-hash', new Date('2029-01-01T00:00:00.000Z'));

  assertTrustedOperator(filters.expired, 'expiresAt', '$lte');
  assertTrustedOperator(filters.active, 'expiresAt', '$gt');
  assert.equal(session.userId, 'user-id');
});

test('history cleanup keeps its internal $in filter valid under sanitization', async () => {
  let cleanupFilter;
  const chatDeleteFilters = [];
  const HealthCheck = {
    async create(data) {
      return { _id: 'new-check', ...data };
    },
    find() {
      return {
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        select() {
          return this;
        },
        async lean() {
          return [{ _id: 'old-check' }];
        }
      };
    },
    async deleteMany(filter) {
      cleanupFilter = filter;
    }
  };
  const ChatConversation = {
    find() {
      return {
        select() {
          return this;
        },
        async lean() {
          return [];
        }
      };
    },
    async deleteMany(filter) {
      chatDeleteFilters.push(filter);
    }
  };
  const repository = createMongoRepository({ User: {}, Session: {}, HealthCheck, ChatConversation });

  await repository.createCheck({ userId: 'user-id', symptoms: 'Headache' });

  assertTrustedOperator(cleanupFilter, '_id', '$in');
  assert.deepEqual(cleanupFilter._id.$in, ['old-check']);
  assert.equal(chatDeleteFilters.length, 2);
  assert.ok(chatDeleteFilters.every((filter) => filter.$or[0].checkId === 'old-check'));
});

test('chat retention cleanup keeps its internal $in filter valid under sanitization', async () => {
  let cleanupFilter;
  const ChatConversation = {
    async create(data) {
      return { _id: 'new-conversation', ...data };
    },
    find() {
      return {
        sort() {
          return this;
        },
        skip() {
          return this;
        },
        select() {
          return this;
        },
        async lean() {
          return [{ _id: 'old-conversation' }];
        }
      };
    },
    async deleteMany(filter) {
      cleanupFilter = filter;
    }
  };
  const repository = createMongoRepository({
    User: {},
    Session: {},
    HealthCheck: {},
    ChatConversation
  });

  await repository.createChatConversation({
    userId: 'user-id',
    title: 'Example',
    messages: []
  });

  mongoose.sanitizeFilter(cleanupFilter);
  assert.equal(cleanupFilter.userId, 'user-id');
  assert.deepEqual(cleanupFilter.$or[0]._id.$in, ['old-conversation']);
  assert.deepEqual(cleanupFilter.$or[1].rootConversationId.$in, ['old-conversation']);
});

test('check deletion removes linked roots and legacy branches before deleting the check', async () => {
  const deleteFilters = [];
  const HealthCheck = {
    findOne() {
      return {
        async lean() {
          return { _id: 'check-id', userId: 'user-id' };
        }
      };
    },
    findOneAndDelete() {
      return {
        async lean() {
          return { _id: 'check-id', userId: 'user-id' };
        }
      };
    }
  };
  const ChatConversation = {
    find() {
      return {
        select() {
          return this;
        },
        async lean() {
          return [{ _id: 'root-chat' }];
        }
      };
    },
    async deleteMany(filter) {
      deleteFilters.push(filter);
    }
  };
  const repository = createMongoRepository({ User: {}, Session: {}, HealthCheck, ChatConversation });

  assert.equal(await repository.deleteCheck('check-id', 'user-id'), true);
  assert.equal(deleteFilters.length, 2);
  for (const filter of deleteFilters) {
    mongoose.sanitizeFilter(filter);
    assert.equal(filter.userId, 'user-id');
    assert.deepEqual(filter.$or[0], { checkId: 'check-id' });
    assert.deepEqual(filter.$or[1].rootConversationId.$in, ['root-chat']);
  }
});

test('chat folder deletion preserves its internal branch filter under sanitization', async () => {
  let deleteFilter;
  const ChatConversation = {
    async deleteMany(filter) {
      deleteFilter = filter;
      return { deletedCount: 3 };
    }
  };
  const repository = createMongoRepository({
    User: {},
    Session: {},
    HealthCheck: {},
    ChatConversation
  });

  const deleted = await repository.deleteChatConversationTree('root-conversation', 'user-id');
  mongoose.sanitizeFilter(deleteFilter);

  assert.equal(deleted, true);
  assert.equal(deleteFilter.userId, 'user-id');
  assert.deepEqual(deleteFilter.$or, [
    { _id: 'root-conversation' },
    { rootConversationId: 'root-conversation' }
  ]);
});
