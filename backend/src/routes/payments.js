// src/routes/payments.js — MongoDB version

const express  = require('express');
const Payment  = require('../models/Payment');
const { requireAdmin, requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/payments/summary — must come BEFORE /:id ────────────────────────
router.get('/summary', requireAdmin, async (req, res) => {
  try {
    // Total
    const totalResult = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const total = totalResult[0]?.total || 0;

    // By payment method
    const byMethod = await Payment.aggregate([
      { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { _id: 0, method: '$_id', total: 1, count: 1 } },
    ]);

    // By month (last 12 months)
    const byMonth = await Payment.aggregate([
      {
        $group: {
          _id:   { $substr: ['$payment_date', 0, 7] }, // 'YYYY-MM'
          total: { $sum: '$amount' },
        },
      },
      { $sort:    { _id: -1 } },
      { $limit:   12 },
      { $project: { _id: 0, month: '$_id', total: 1 } },
    ]);

    // By recorder (who logged the payment)
    const byRecorder = await Payment.aggregate([
      { $match:  { recorded_by: { $ne: null } } },
      { $group:  { _id: '$recorded_by', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      {
        $lookup: {
          from:         'users',
          localField:   '_id',
          foreignField: '_id',
          as:           'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id:      0,
          recorder: '$user.name',
          role:     '$user.role',
          total:    1,
          count:    1,
        },
      },
    ]);

    res.json({
      total:      +total.toFixed(2),
      byMethod,
      byMonth,
      byRecorder,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/payments ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.studentId) filter.student = req.query.studentId;

    const payments = await Payment.find(filter)
      .populate('student',     'name')
      .populate('recorded_by', 'name')
      .sort({ payment_date: -1 })
      .lean();

    res.json(payments.map(formatPayment));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments — admin or teacher ─────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { student_id, amount, payment_date, method, reference_type, reference_id, notes } = req.body;

    if (!student_id || !amount)
      return res.status(400).json({ error: 'student_id and amount required' });

    const payment = await new Payment({
      student:        student_id,
      amount:         Number(amount),
      payment_date:   payment_date || new Date().toISOString().slice(0, 10),
      method:         method || 'cash',
      reference_type: reference_type || 'other',
      reference_id:   reference_id || null,
      recorded_by:    req.user.id,
      notes:          notes || null,
    }).save();

    res.status(201).json({ id: payment._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/payments/:id — admin only ────────────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { amount, payment_date, method, notes } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { amount, payment_date, method, notes: notes || null },
      { new: true, runValidators: true }
    );
    if (!payment)
      return res.status(404).json({ error: 'Payment not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/payments/:id — admin only ─────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment)
      return res.status(404).json({ error: 'Payment not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Format helper ─────────────────────────────────────────────────────────────
function formatPayment(p) {
  return {
    id:               p._id.toString(),
    _id:              p._id.toString(),
    student_id:       p.student?._id?.toString() || p.student?.toString(),
    student_name:     p.student?.name || '—',
    amount:           p.amount,
    payment_date:     p.payment_date,
    method:           p.method,
    reference_type:   p.reference_type,
    reference_id:     p.reference_id?.toString() || null,
    recorded_by:      p.recorded_by?._id?.toString() || p.recorded_by?.toString(),
    recorded_by_name: p.recorded_by?.name || '—',
    notes:            p.notes,
    createdAt:        p.createdAt,
  };
}

module.exports = router;
