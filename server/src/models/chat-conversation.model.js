import crypto from 'node:crypto';
import mongoose from 'mongoose';

const { Schema } = mongoose;

const chatMessageSchema = new Schema(
  {
    id: { type: String, required: true, default: () => crypto.randomUUID() },
    role: { type: String, required: true, enum: ['user', 'assistant'] },
    content: { type: String, required: true, maxlength: 4000 },
    createdAt: { type: Date, required: true, default: Date.now }
  },
  { _id: false }
);

export const chatConversationSchema = new Schema(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    userId: { type: String, required: true, ref: 'User' },
    accountType: { type: String, enum: ['registered', 'guest'], default: 'registered' },
    checkId: { type: String, default: null, ref: 'HealthCheck', maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    contextLabel: { type: String, default: '', trim: true, maxlength: 120 },
    contextSummary: { type: String, default: '', maxlength: 6000 },
    rootConversationId: { type: String, default: null, maxlength: 80 },
    parentConversationId: { type: String, default: null, maxlength: 80 },
    sourceMessageId: { type: String, default: null, maxlength: 80 },
    branchNumber: { type: Number, default: null, min: 1, max: 2 },
    language: { type: String, enum: ['en', 'bn'], default: 'en' },
    messages: { type: [chatMessageSchema], default: [] }
  },
  {
    collection: 'chat_conversations',
    timestamps: true,
    versionKey: false
  }
);

chatConversationSchema.index({ userId: 1, updatedAt: -1 });
chatConversationSchema.index({ userId: 1, checkId: 1, updatedAt: -1 });
chatConversationSchema.index({ accountType: 1, updatedAt: -1 });
chatConversationSchema.index(
  { userId: 1, rootConversationId: 1, branchNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      rootConversationId: { $type: 'string' },
      branchNumber: { $type: 'number' }
    }
  }
);
