// src/models/LessonType.js
// There are exactly 3 lesson types: theory → driving → parking.
// Costs are configurable by admin. Documents are seeded once.

const mongoose = require('mongoose');

const lessonTypeSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      enum: ['theory', 'driving', 'parking'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Determines the required progression order (1, 2, 3)
    sequence_order: {
      type: Number,
      required: true,
    },
    // Default cost charged per attended class session
    class_cost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    // Default cost charged per test attempt
    test_cost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('LessonType', lessonTypeSchema);
