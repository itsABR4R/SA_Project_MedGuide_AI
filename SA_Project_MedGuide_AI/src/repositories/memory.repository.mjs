import crypto from 'node:crypto';

function copy(value) {
  return value === null || value === undefined ? value : structuredClone(value);
}

export function createMemoryRepository() {
  const state = { users: [], sessions: [], checks: [] };

  return {
    kind: 'memory',

    async createUser(data) {
      if (state.users.some((entry) => entry.email === data.email)) {
        const error = new Error('Duplicate email');
        error.code = 11000;
        throw error;
      }
      const now = new Date();
      const user = { id: data.id || crypto.randomUUID(), ...copy(data), createdAt: data.createdAt || now, updatedAt: now };
      state.users.push(user);
      return copy(user);
    },

    async findUserByEmail(email) {
      return copy(state.users.find((entry) => entry.email === email) || null);
    },

    async findUserById(id) {
      return copy(state.users.find((entry) => entry.id === id) || null);
    },

    async updateUser(id, fields) {
      const user = state.users.find((entry) => entry.id === id);
      if (!user) return null;
      Object.assign(user, copy(fields), { updatedAt: new Date() });
      return copy(user);
    },

    async createSession(data) {
      const now = new Date();
      state.sessions = state.sessions.filter((entry) => new Date(entry.expiresAt) > now);
      state.sessions.push({ id: crypto.randomUUID(), ...copy(data) });
    },

    async findSession(hash, now = new Date()) {
      return copy(state.sessions.find((entry) => entry.tokenHash === hash && new Date(entry.expiresAt) > now) || null);
    },

    async deleteSession(hash) {
      state.sessions = state.sessions.filter((entry) => entry.tokenHash !== hash);
    },

    async countChecks(userId) {
      return state.checks.filter((entry) => entry.userId === userId).length;
    },

    async createCheck(data) {
      const check = { id: data.id || crypto.randomUUID(), ...copy(data), createdAt: data.createdAt || new Date() };
      state.checks.push(check);
      const userChecks = state.checks
        .filter((entry) => entry.userId === data.userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const keep = new Set(userChecks.slice(0, 100).map((entry) => entry.id));
      state.checks = state.checks.filter((entry) => entry.userId !== data.userId || keep.has(entry.id));
      return copy(check);
    },

    async listChecks(userId) {
      return copy(state.checks
        .filter((entry) => entry.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    },

    async findLatestCheck(userId) {
      return (await this.listChecks(userId))[0] || null;
    },

    async deleteCheck(checkId, userId) {
      const before = state.checks.length;
      state.checks = state.checks.filter((entry) => entry.id !== checkId || entry.userId !== userId);
      return state.checks.length < before;
    },

    snapshot() {
      return copy(state);
    }
  };
}
