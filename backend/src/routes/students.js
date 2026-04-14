// src/routes/students.js

const express  = require('express');
const Student  = require('../models/Student');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getStudentFinancials, getStudentProgress } = require('../utils/progression');

const router = express.Router();

// ── GET /api/students ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const ClassSession = require('../models/ClassSession');

    const students = await Student.find().sort('name').lean();

    // Attach total_classes count to each student efficiently
    // Count sessions where each student has an enrollment
    const studentIds = students.map((s) => s._id);

    // Aggregate: for each student, count distinct sessions they're enrolled in
    const CountResult = await ClassSession.aggregate([
      { $unwind: '$enrollments' },
      { $match: { 'enrollments.student': { $in: studentIds } } },
      { $group: { _id: '$enrollments.student', total_classes: { $sum: 1 } } },
    ]);

    const countMap = {};
    CountResult.forEach((r) => { countMap[r._id.toString()] = r.total_classes; });

    const result = students.map((s) => ({
      ...s,
      _id: s._id.toString(),
      id:  s._id.toString(),
      total_classes: countMap[s._id.toString()] || 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/students/:id ─────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).lean();
    if (!student)
      return res.status(404).json({ error: 'Student not found' });

    const [financials, progress] = await Promise.all([
      getStudentFinancials(student._id),
      getStudentProgress(student._id),
    ]);

    res.json({ ...student, id: student._id.toString(), financials, progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/students/:id/progress ───────────────────────────────────────────
router.get('/:id/progress', requireAuth, async (req, res) => {
  try {
    const progress = await getStudentProgress(req.params.id);
    if (!progress)
      return res.status(404).json({ error: 'Student not found' });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/students/:id/financials ─────────────────────────────────────────
router.get('/:id/financials', requireAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('_id').lean();
    if (!student)
      return res.status(404).json({ error: 'Student not found' });
    const financials = await getStudentFinancials(student._id);
    res.json(financials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/students ────────────────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, phone, email, cin, registration_date, notes } = req.body;
    if (!name || !phone)
      return res.status(400).json({ error: 'Name and phone required' });

    const student = await new Student({
      name,
      phone,
      email:             email || null,
      cin:               cin || null,
      registration_date: registration_date || new Date().toISOString().slice(0, 10),
      notes:             notes || null,
      current_stage:     'theory',
    }).save();

    res.status(201).json({ ...student.toJSON(), id: student._id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/students/:id ─────────────────────────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, phone, email, cin, notes } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { name, phone, email: email || null, cin: cin || null, notes: notes || null },
      { new: true, runValidators: true }
    );
    if (!student)
      return res.status(404).json({ error: 'Student not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/students/:id ──────────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student)
      return res.status(404).json({ error: 'Student not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
