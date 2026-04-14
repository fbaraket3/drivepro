// src/models/Payment.js

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be positive'],
    },
    payment_date: {
      type: String, // 'YYYY-MM-DD'
      default: () => new Date().toISOString().slice(0, 10),
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'transfer', 'cheque'],
      default: 'cash',
    },
    reference_type: {
      type: String,
      enum: ['class', 'test', 'other'],
      default: 'other',
    },
    // Optional: ObjectId of the related ClassSession or Test document
    reference_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // The user (admin or teacher) who logged this payment
    recorded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
paymentSchema.index({ student: 1 });
paymentSchema.index({ payment_date: -1 });
paymentSchema.index({ recorded_by: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
