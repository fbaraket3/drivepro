// src/models/Student.js

const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    // National ID (CIN in Tunisia)
    cin: {
      type: String,
      trim: true,
      default: null,
    },
    registration_date: {
      type: String, // stored as 'YYYY-MM-DD' string to match frontend expectations
      default: () => new Date().toISOString().slice(0, 10),
    },
    notes: {
      type: String,
      default: null,
    },
    // The student's current progression stage.
    // Automatically advanced when a test is passed.
    current_stage: {
      type: String,
      enum: ['theory', 'driving', 'parking', 'completed'],
      default: 'theory',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Student', studentSchema);
