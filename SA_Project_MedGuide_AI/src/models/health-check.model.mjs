import crypto from 'node:crypto';
import mongoose from 'mongoose';

const { Schema } = mongoose;

const conditionSchema = new Schema({
  name: { type: String, required: true, maxlength: 120 },
  matchLevel: { type: String, required: true, enum: ['strong', 'possible', 'limited'] },
  urgency: { type: String, required: true, enum: ['routine', 'soon', 'urgent'] },
  matchedSymptoms: [{ type: String, maxlength: 80 }],
  simpleExplanation: { type: String, default: '', maxlength: 600 },
  detailedExplanation: { type: String, default: '', maxlength: 1400 },
  sourceIds: [{ type: String, maxlength: 80 }]
}, { _id: false });

const analysisSchema = new Schema({
  summary: { type: String, required: true, maxlength: 700 },
  urgent: { type: Boolean, required: true },
  urgentMessage: { type: String, default: '', maxlength: 600 },
  conditions: { type: [conditionSchema], default: [] },
  selfCare: [{ type: String, maxlength: 300 }],
  seeClinician: [{ type: String, maxlength: 300 }],
  sourceIds: [{ type: String, maxlength: 80 }]
}, { _id: false });

export const healthCheckSchema = new Schema({
  _id: { type: String, default: () => crypto.randomUUID() },
  userId: { type: String, required: true, ref: 'User' },
  symptoms: { type: String, default: '', maxlength: 4000 },
  severity: { type: String, required: true, enum: ['mild', 'moderate', 'severe'] },
  tags: [{ type: String, maxlength: 60 }],
  analysis: { type: analysisSchema, required: true }
}, {
  collection: 'health_checks',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false
});

healthCheckSchema.index({ userId: 1, createdAt: -1 });
