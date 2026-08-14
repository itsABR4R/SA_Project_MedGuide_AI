function toDomain(document) {
  if (!document) return null;
  const value = typeof document.toObject === 'function' ? document.toObject() : { ...document };
  const id = String(value._id);
  delete value._id;
  delete value.__v;
  return { id, ...value };
}

export function createMongoRepository({ User, Session, HealthCheck }) {
  return {
    kind: 'mongodb',

    async createUser(data) {
      return toDomain(await User.create(data));
    },

    async findUserByEmail(email, { includePassword = false } = {}) {
      let query = User.findOne({ email });
      if (includePassword) query = query.select('+passwordSalt +passwordHash');
      return toDomain(await query.lean());
    },

    async findUserById(id) {
      return toDomain(await User.findById(id).lean());
    },

    async updateUser(id, fields) {
      return toDomain(await User.findByIdAndUpdate(id, { $set: fields }, {
        new: true,
        runValidators: true
      }).lean());
    },

    async createSession(data) {
      await Session.deleteMany({ expiresAt: { $lte: new Date() } });
      await Session.create(data);
    },

    async findSession(tokenHash, now = new Date()) {
      return toDomain(await Session.findOne({ tokenHash, expiresAt: { $gt: now } }).lean());
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
        await HealthCheck.deleteMany({ _id: { $in: oldChecks.map((entry) => entry._id) } });
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

    async deleteCheck(checkId, userId) {
      return Boolean(await HealthCheck.findOneAndDelete({ _id: checkId, userId }).lean());
    }
  };
}
