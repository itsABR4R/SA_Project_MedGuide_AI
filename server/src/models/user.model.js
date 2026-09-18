import crypto from 'node:crypto';
import mongoose from 'mongoose';

const { Schema } = mongoose;

export const userSchema = new Schema(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    accountType: { type: String, enum: ['registered'], default: 'registered', immutable: true },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    age: { type: Number, default: null, min: 13, max: 120 },
    bloodType: { type: String, default: '', enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    allergies: { type: String, default: '', maxlength: 500 },
    onboardingCompleted: { type: Boolean, default: true },
    passwordSalt: { type: String, required: true, select: false },
    passwordHash: { type: String, required: true, select: false }
  },
  {
    collection: 'users',
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ email: 1 }, { unique: true });

userSchema.set('toJSON', {
  transform(_document, value) {
    value.id = String(value._id);
    delete value._id;
    delete value.passwordSalt;
    delete value.passwordHash;
    return value;
  }
});
