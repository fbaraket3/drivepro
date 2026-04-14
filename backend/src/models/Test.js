// src/models/Test.js
// Audit trail is embedded directly in the test document as a sub-array.
// This avoids a separate test_audit collection while keeping full history.

const mongoose = require('mongoose');

// ── Audit entry sub-document ──────────────────────────────────────────────────
// One entry is appended for every field changed on an existing test.
const auditEntrySchema = new mongoose.Schema(
  {
    changed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changed_at: {
      type: Date,
      default: Date.now,
    },
    field:     { type: String, required: true },
    old_value: { type: String, default: null },
    new_value: { type: String, default: null },
  },
  { _id: false }
);

// ── Test document ─────────────────────────────────────────────────────────────
const testSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    lesson_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LessonType',
      required: true,
    },
    // Auto-calculated before save: how many prior attempts for this
    // student + lesson_type combination
    attempt_number: {
      type: Number,
      required: true,
      min: 1,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    result: {
      type: String,
      enum: ['pass', 'fail', 'pending'],
      required: true,
    },
    cost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Full field-level change history — appended by the PUT route
    audit: {
      type: [auditEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
testSchema.index({ student: 1, lesson_type: 1 });
testSchema.index({ date: -1 });

module.exports = mongoose.model('Test', testSchema);
