import mongoose from 'mongoose';

const { Schema } = mongoose;

export const sessionSchema = new Schema({
  tokenHash: { type: String, required: true, select: false },
  userId: { type: String, required: true, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
}, {
  collection: 'sessions',
  versionKey: false
});

sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
