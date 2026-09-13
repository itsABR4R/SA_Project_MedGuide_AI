import mongoose from 'mongoose';

function toDomain(document) {
  if (!document) return null;
  const value = typeof document.toObject === 'function' ? document.toObject() : { ...document };
  const id = String(value._id);
  delete value._id;
  delete value.__v;
  return { id, ...value };
}

export function createMongoRepository({ User, GuestUser, Session, HealthCheck, ChatConversation }) {
  return {
    kind: 'mongodb',

    async createUser(data) {
      return toDomain(await User.create(data));
    },

    async createGuestUser(data) {
      return toDomain(await GuestUser.create(data));
    },

    async findUserByEmail(email, { includePassword = false } = {}) {
      let query = User.findOne({ email });
      if (includePassword) query = query.select('+passwordSalt +passwordHash');
      return toDomain(await query.lean());
    },

    async findUserById(id, accountType) {
      if (accountType === 'guest') return toDomain(await GuestUser.findById(id).lean());
      if (accountType === 'registered') return toDomain(await User.findById(id).lean());
      const registeredUser = toDomain(await User.findById(id).lean());
      return registeredUser || toDomain(await GuestUser.findById(id).lean());
    },

    async updateUser(id, fields, accountType) {
      async function update(Model) {
        return toDomain(
          await Model.findByIdAndUpdate(
            id,
            { $set: fields },
            {
              new: true,
              runValidators: true
            }
          ).lean()
        );
      }

      if (accountType === 'guest') return update(GuestUser);
      if (accountType === 'registered') return update(User);
      return (await update(User)) || update(GuestUser);
    },

    async deleteUser(id, accountType) {
      if (accountType === 'guest') {
        await GuestUser.deleteOne({ _id: id });
        return;
      }
      if (accountType === 'registered') {
        await User.deleteOne({ _id: id });
        return;
      }
      await Promise.all([User.deleteOne({ _id: id }), GuestUser.deleteOne({ _id: id })]);
    },

    async createSession(data) {
      await Session.deleteMany({ expiresAt: mongoose.trusted({ $lte: new Date() }) });
      await Session.create(data);
    },

    async findSession(tokenHash, now = new Date()) {
      return toDomain(
        await Session.findOne({
          tokenHash,
          expiresAt: mongoose.trusted({ $gt: now })
        }).lean()
      );
    },

    async deleteSession(tokenHash) {
      await Session.deleteOne({ tokenHash });
    },

    async countChecks(userId) {
      return HealthCheck.countDocuments({ userId });
    },

    async createCheck(data) {
      const check = toDomain(await HealthCheck.create(data));
      const oldChecks = await HealthCheck.find({ userId: data.userId })
        .sort({ createdAt: -1 })
        .skip(100)
        .select('_id')
        .lean();
      if (oldChecks.length) {
        const ids = oldChecks.map((entry) => String(entry._id));
        for (const checkId of ids) await this.deleteChatsForCheck(checkId, data.userId);
        await HealthCheck.deleteMany(
          mongoose.trusted({ userId: data.userId, _id: mongoose.trusted({ $in: ids }) })
        );
        for (const checkId of ids) await this.deleteChatsForCheck(checkId, data.userId);
      }
      return check;
    },

    async listChecks(userId) {
      const checks = await HealthCheck.find({ userId }).sort({ createdAt: -1 }).limit(100).lean();
      return checks.map(toDomain);
    },

    async findLatestCheck(userId) {
      return toDomain(await HealthCheck.findOne({ userId }).sort({ createdAt: -1 }).lean());
    },

    async findCheck(checkId, userId) {
      return toDomain(await HealthCheck.findOne({ _id: checkId, userId }).lean());
    },

    async deleteCheck(checkId, userId) {
      if (!(await this.findCheck(checkId, userId))) return false;
      // Standalone local MongoDB does not support multi-document transactions.
      // Delete children first so a failure leaves the check available for retry.
      await this.deleteChatsForCheck(checkId, userId);
      const deleted = Boolean(await HealthCheck.findOneAndDelete({ _id: checkId, userId }).lean());
      await this.deleteChatsForCheck(checkId, userId);
      return deleted;
    },

    async deleteChatsForCheck(checkId, userId) {
      const linked = await ChatConversation.find({ userId, checkId }).select('_id').lean();
      await ChatConversation.deleteMany(
        mongoose.trusted({
          userId,
          $or: [
            { checkId },
            { rootConversationId: mongoose.trusted({ $in: linked.map((entry) => String(entry._id)) }) }
          ]
        })
      );
    },

    async listLegacyChatRoots(userId) {
      const roots = await ChatConversation.find({
        userId,
        checkId: mongoose.trusted({ $exists: false }),
        rootConversationId: null
      })
        .select('_id contextSummary createdAt')
        .lean();
      return roots.map(toDomain);
    },

    async linkChatTreeToCheck(rootId, userId, checkId) {
      await ChatConversation.updateMany(
        mongoose.trusted({
          userId,
          checkId: mongoose.trusted({ $exists: false }),
          $or: [{ _id: rootId }, { rootConversationId: rootId }]
        }),
        { $set: { checkId } },
        { timestamps: false }
      );
    },

    async createChatConversation(data) {
      const conversation = toDomain(await ChatConversation.create(data));
      const oldConversations = await ChatConversation.find({ userId: data.userId, rootConversationId: null })
        .sort({ updatedAt: -1 })
        .skip(50)
        .select('_id')
        .lean();
      if (oldConversations.length) {
        const ids = oldConversations.map((entry) => entry._id);
        await ChatConversation.deleteMany(
          mongoose.trusted({
            userId: data.userId,
            $or: [
              { _id: mongoose.trusted({ $in: ids }) },
              { rootConversationId: mongoose.trusted({ $in: ids }) }
            ]
          })
        );
      }
      return conversation;
    },

    async listChatConversations(userId, checkId = null) {
      const conversations = await ChatConversation.find({ userId, checkId })
        .sort({ updatedAt: -1 })
        .limit(150)
        .select(
          '_id title checkId contextLabel rootConversationId parentConversationId sourceMessageId branchNumber language createdAt updatedAt'
        )
        .lean();
      return conversations.map(toDomain);
    },

    async findChatConversation(conversationId, userId) {
      return toDomain(await ChatConversation.findOne({ _id: conversationId, userId }).lean());
    },

    async appendChatMessages(conversationId, userId, messages) {
      return toDomain(
        await ChatConversation.findOneAndUpdate(
          { _id: conversationId, userId },
          { $push: { messages: { $each: messages, $slice: -100 } } },
          { new: true, runValidators: true }
        ).lean()
      );
    },

    async listChatBranches(rootConversationId, userId) {
      const branches = await ChatConversation.find({ rootConversationId, userId })
        .sort({ branchNumber: 1 })
        .lean();
      return branches.map(toDomain);
    },

    async deleteChatConversation(conversationId, userId) {
      return Boolean(await ChatConversation.findOneAndDelete({ _id: conversationId, userId }).lean());
    },

    async deleteChatConversationTree(rootConversationId, userId) {
      const result = await ChatConversation.deleteMany(
        mongoose.trusted({
          userId,
          $or: [{ _id: rootConversationId }, { rootConversationId }]
        })
      );
      return result.deletedCount > 0;
    }
  };
}
