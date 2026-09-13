import crypto from 'node:crypto';
import mongoose from 'mongoose';

const { Schema } = mongoose;

export const guestUserSchema = new Schema(
  {
    _id: { type: String, default: () => `guest_${crypto.randomUUID()}` },
    accountType: { type: String, enum: ['guest'], default: 'guest', immutable: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    age: { type: Number, required: true, min: 13, max: 120 },
    occupation: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    bloodType: { type: String, default: '', enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    allergies: { type: String, default: '', maxlength: 500 },
    onboardingCompleted: { type: Boolean, default: false }
  },
  {
    collection: 'guest_users',
    timestamps: true,
    versionKey: false
  }
);

guestUserSchema.index({ createdAt: -1 });
guestUserSchema.index({ occupation: 1, createdAt: -1 });

guestUserSchema.set('toJSON', {
  transform(_document, value) {
    value.id = String(value._id);
    delete value._id;
    return value;
  }
});
