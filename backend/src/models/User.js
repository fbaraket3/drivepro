// src/models/User.js
// Covers both admin accounts and teacher accounts.
// teacher_type is only relevant when role === 'teacher'.

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      // Never send password back in responses
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'teacher'],
      required: true,
    },
    // Only meaningful when role === 'teacher'
    // 'theory'          → can teach multiple students per session
    // 'driving_parking' → exactly one student per session, assigned at creation
    teacher_type: {
      type: String,
      enum: ['theory', 'driving_parking', null],
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

// ── Pre-save hook: hash password if it was modified ───────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ── Instance method: compare plain password against stored hash ───────────────
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// ── toJSON: strip the password field from any serialised output ───────────────
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
