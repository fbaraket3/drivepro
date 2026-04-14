// src/models/ClassSession.js
// A scheduled teaching session. Enrollments are embedded as a sub-array
// to avoid the need for a separate join collection while keeping atomicity.

const mongoose = require('mongoose');

// ── Enrollment sub-document ───────────────────────────────────────────────────
// Each entry represents one student enrolled in this session.
const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    attended: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false } // no separate _id for sub-docs; student ref is the unique key
);

// ── Class Session ─────────────────────────────────────────────────────────────
const classSessionSchema = new mongoose.Schema(
  {
    lesson_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LessonType',
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    start_time: {
      type: String, // 'HH:MM'
      required: true,
    },
    end_time: {
      type: String, // 'HH:MM'
      required: true,
    },
    // null  = unlimited students (theory teacher)
    // 1     = single student only (driving/parking teacher)
    max_students: {
      type: Number,
      default: null,
    },
    // When set, overrides lesson_type.class_cost for this specific session
    cost_override: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    // Embedded enrollments — avoids a separate collection for this 1:N
    enrollments: {
      type: [enrollmentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ── Compound index: prevent teacher double-booking ────────────────────────────
classSessionSchema.index(
  { teacher: 1, date: 1, start_time: 1 },
  { unique: true }
);

// ── Compound index: fast calendar queries by date range ───────────────────────
classSessionSchema.index({ date: 1, teacher: 1 });

module.exports = mongoose.model('ClassSession', classSessionSchema);
