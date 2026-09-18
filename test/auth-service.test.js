import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryRepository } from '../server/src/repositories/memory.repository.js';
import { createAuthService } from '../server/src/services/auth.service.js';

const config = {
  env: 'test',
  session: {
    cookieName: 'ahc_session',
    maxAgeSeconds: 60 * 60
  }
};

test('registration removes the new user if its session cannot be persisted', async () => {
  const storage = createMemoryRepository();
  const repository = {
    ...storage,
    async createSession() {
      const error = new Error('Session persistence failed');
      error.name = 'ValidationError';
      throw error;
    }
  };
  const authService = createAuthService({ repository, config });

  await assert.rejects(
    authService.register({
      name: 'Rollback User',
      email: 'rollback@example.com',
      password: 'correct-horse-42'
    }),
    /Session persistence failed/
  );

  assert.deepEqual(storage.snapshot().users, []);
});

test('registration and later login both create usable sessions', async () => {
  const repository = createMemoryRepository();
  const authService = createAuthService({ repository, config });
  const credentials = {
    name: 'Session User',
    email: 'session@example.com',
    password: 'correct-horse-42'
  };

  const registered = await authService.register(credentials);
  const loggedIn = await authService.login(credentials);

  assert.equal(registered.user.email, credentials.email);
  assert.equal(loggedIn.user.id, registered.user.id);
  assert.equal(repository.snapshot().sessions.length, 2);
});

test('guest registration stores a separate password-free profile and a guest session', async () => {
  const repository = createMemoryRepository();
  const authService = createAuthService({ repository, config });

  const registered = await authService.registerGuest({
    name: 'Guest Tester',
    age: '28',
    occupation: 'Quality analyst'
  });
  const snapshot = repository.snapshot();

  assert.match(registered.user.id, /^guest_/);
  assert.equal(registered.user.accountType, 'guest');
  assert.equal(registered.user.email, '');
  assert.equal(registered.user.age, 28);
  assert.equal(registered.user.occupation, 'Quality analyst');
  assert.equal(snapshot.users.length, 0);
  assert.equal(snapshot.guestUsers.length, 1);
  assert.equal(snapshot.sessions.length, 1);
  assert.equal(snapshot.sessions[0].userId, registered.user.id);
  assert.equal(snapshot.sessions[0].accountType, 'guest');
  assert.equal('passwordHash' in snapshot.guestUsers[0], false);
  assert.equal('passwordSalt' in snapshot.guestUsers[0], false);
});

test('guest registration validates testing demographics before writing data', async () => {
  const repository = createMemoryRepository();
  const authService = createAuthService({ repository, config });

  await assert.rejects(
    authService.registerGuest({ name: 'Guest Tester', age: '12', occupation: 'Student' }),
    (error) => error.code === 'INVALID_AGE'
  );
  await assert.rejects(
    authService.registerGuest({ name: 'Guest Tester', age: '28', occupation: '' }),
    (error) => error.code === 'INVALID_OCCUPATION'
  );
  assert.deepEqual(repository.snapshot().guestUsers, []);
});

test('guest registration removes the guest profile if its session cannot be persisted', async () => {
  const storage = createMemoryRepository();
  const repository = {
    ...storage,
    async createSession() {
      throw new Error('Guest session persistence failed');
    }
  };
  const authService = createAuthService({ repository, config });

  await assert.rejects(
    authService.registerGuest({ name: 'Guest Tester', age: 28, occupation: 'Researcher' }),
    /Guest session persistence failed/
  );
  assert.deepEqual(storage.snapshot().guestUsers, []);
});
