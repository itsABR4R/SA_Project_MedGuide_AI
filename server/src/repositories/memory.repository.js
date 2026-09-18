import crypto from 'node:crypto';

function copy(value) {
  return value === null || value === undefined ? value : structuredClone(value);
}

export function createMemoryRepository() {
  const state = { users: [], guestUsers: [], sessions: [], checks: [], conversations: [] };

  return {
    kind: 'memory',

    async createUser(data) {
      if (state.users.some((entry) => entry.email === data.email)) {
        const error = new Error('Duplicate email');
        error.code = 11000;
        throw error;
      }
      const now = new Date();
      const user = {
        id: data.id || crypto.randomUUID(),
        ...copy(data),
        createdAt: data.createdAt || now,
        updatedAt: now
      };
      state.users.push(user);
      return copy(user);
    },

    async createGuestUser(data) {
      const now = new Date();
      const user = {
        id: data.id || `guest_${crypto.randomUUID()}`,
        accountType: 'guest',
        ...copy(data),
        createdAt: data.createdAt || now,
        updatedAt: now
      };
      state.guestUsers.push(user);
      return copy(user);
    },

    async findUserByEmail(email) {
      return copy(state.users.find((entry) => entry.email === email) || null);
    },

    async findUserById(id, accountType) {
      if (accountType === 'guest') {
        return copy(state.guestUsers.find((entry) => entry.id === id) || null);
      }
      if (accountType === 'registered') {
        return copy(state.users.find((entry) => entry.id === id) || null);
      }
      return copy(
        state.users.find((entry) => entry.id === id) ||
          state.guestUsers.find((entry) => entry.id === id) ||
          null
      );
    },

    async updateUser(id, fields, accountType) {
      const collection = accountType === 'guest' ? state.guestUsers : state.users;
      let user = collection.find((entry) => entry.id === id);
      if (!user && accountType === undefined) {
        user = state.guestUsers.find((entry) => entry.id === id);
      }
      if (!user) return null;
      Object.assign(user, copy(fields), { updatedAt: new Date() });
      return copy(user);
    },

    async deleteUser(id, accountType) {
      if (accountType !== 'guest') {
        state.users = state.users.filter((entry) => entry.id !== id);
      }
      if (accountType !== 'registered') {
        state.guestUsers = state.guestUsers.filter((entry) => entry.id !== id);
      }
    },

    async createSession(data) {
      const now = new Date();
      state.sessions = state.sessions.filter((entry) => new Date(entry.expiresAt) > now);
      state.sessions.push({ id: crypto.randomUUID(), ...copy(data) });
    },

    async findSession(hash, now = new Date()) {
      return copy(
        state.sessions.find((entry) => entry.tokenHash === hash && new Date(entry.expiresAt) > now) || null
      );
    },

    async deleteSession(hash) {
      state.sessions = state.sessions.filter((entry) => entry.tokenHash !== hash);
    },

    async countChecks(userId) {
      return state.checks.filter((entry) => entry.userId === userId).length;
    },

    async createCheck(data) {
      const check = {
        id: data.id || crypto.randomUUID(),
        ...copy(data),
        createdAt: data.createdAt || new Date()
      };
      state.checks.push(check);
      const userChecks = state.checks
        .filter((entry) => entry.userId === data.userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const keep = new Set(userChecks.slice(0, 100).map((entry) => entry.id));
      for (const oldCheck of userChecks.slice(100)) {
        await this.deleteChatsForCheck(oldCheck.id, data.userId);
      }
      state.checks = state.checks.filter((entry) => entry.userId !== data.userId || keep.has(entry.id));
      return copy(check);
    },

    async listChecks(userId) {
      return copy(
        state.checks
          .filter((entry) => entry.userId === userId)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      );
    },

    async findLatestCheck(userId) {
      return (await this.listChecks(userId))[0] || null;
    },

    async findCheck(checkId, userId) {
      return copy(state.checks.find((entry) => entry.id === checkId && entry.userId === userId) || null);
    },

    async deleteCheck(checkId, userId) {
      if (!(await this.findCheck(checkId, userId))) return false;
      await this.deleteChatsForCheck(checkId, userId);
      const before = state.checks.length;
      state.checks = state.checks.filter((entry) => entry.id !== checkId || entry.userId !== userId);
      await this.deleteChatsForCheck(checkId, userId);
      return state.checks.length < before;
    },

    async deleteChatsForCheck(checkId, userId) {
      const linkedIds = new Set(
        state.conversations
          .filter((entry) => entry.userId === userId && entry.checkId === checkId)
          .map((entry) => entry.id)
      );
      state.conversations = state.conversations.filter(
        (entry) =>
          entry.userId !== userId || (entry.checkId !== checkId && !linkedIds.has(entry.rootConversationId))
      );
    },

    async listLegacyChatRoots(userId) {
      return copy(
        state.conversations.filter(
          (entry) => entry.userId === userId && entry.checkId === undefined && !entry.rootConversationId
        )
      );
    },

    async linkChatTreeToCheck(rootId, userId, checkId) {
      for (const entry of state.conversations) {
        if (
          entry.userId === userId &&
          entry.checkId === undefined &&
          (entry.id === rootId || entry.rootConversationId === rootId)
        )
          entry.checkId = checkId;
      }
    },

    async createChatConversation(data) {
      const now = new Date();
      const conversation = {
        id: data.id || crypto.randomUUID(),
        ...copy(data),
        createdAt: data.createdAt || now,
        updatedAt: now
      };
      state.conversations.push(conversation);
      const userConversations = state.conversations
        .filter((entry) => entry.userId === data.userId && !entry.rootConversationId)
        .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
      const keep = new Set(userConversations.slice(0, 50).map((entry) => entry.id));
      state.conversations = state.conversations.filter(
        (entry) => entry.userId !== data.userId || keep.has(entry.rootConversationId || entry.id)
      );
      return copy(conversation);
    },

    async listChatConversations(userId, checkId = null) {
      return copy(
        state.conversations
          .filter((entry) => entry.userId === userId && (entry.checkId || null) === checkId)
          .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
          .map(
            ({
              id,
              title,
              checkId,
              contextLabel,
              rootConversationId,
              parentConversationId,
              sourceMessageId,
              branchNumber,
              createdAt,
              updatedAt
            }) => ({
              id,
              title,
              checkId: checkId || null,
              contextLabel,
              rootConversationId,
              parentConversationId,
              sourceMessageId,
              branchNumber,
              createdAt,
              updatedAt
            })
          )
      );
    },

    async findChatConversation(conversationId, userId) {
      return copy(
        state.conversations.find((entry) => entry.id === conversationId && entry.userId === userId) || null
      );
    },

    async appendChatMessages(conversationId, userId, messages) {
      const conversation = state.conversations.find(
        (entry) => entry.id === conversationId && entry.userId === userId
      );
      if (!conversation) return null;
      conversation.messages = [...conversation.messages, ...copy(messages)].slice(-100);
      conversation.updatedAt = new Date();
      return copy(conversation);
    },

    async listChatBranches(rootConversationId, userId) {
      return copy(
        state.conversations
          .filter((entry) => entry.userId === userId && entry.rootConversationId === rootConversationId)
          .sort((left, right) => left.branchNumber - right.branchNumber)
      );
    },

    async deleteChatConversation(conversationId, userId) {
      const before = state.conversations.length;
      state.conversations = state.conversations.filter(
        (entry) => entry.id !== conversationId || entry.userId !== userId
      );
      return state.conversations.length < before;
    },

    async deleteChatConversationTree(rootConversationId, userId) {
      const before = state.conversations.length;
      state.conversations = state.conversations.filter(
        (entry) =>
          entry.userId !== userId ||
          (entry.id !== rootConversationId && entry.rootConversationId !== rootConversationId)
      );
      return state.conversations.length < before;
    },

    snapshot() {
      return copy(state);
    }
  };
}
