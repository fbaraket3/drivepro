// src/routes/tests.js — MongoDB version with embedded audit trail

const express    = require('express');
const Test       = require('../models/Test');
const LessonType = require('../models/LessonType');
const Student    = require('../models/Student');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { advanceStudentStage } = require('../utils/progression');

const router = express.Router();

// ── Shared populate helper ────────────────────────────────────────────────────
function populateTest(query) {
  return query
    .populate('student',     'name current_stage')
    .populate('lesson_type', 'name slug test_cost')
    .populate('created_by',  'name');
}

// ── GET /api/tests ────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.studentId)    filter.student     = req.query.studentId;
    if (req.query.lessonTypeId) filter.lesson_type = req.query.lessonTypeId;

    const tests = await populateTest(Test.find(filter).sort({ date: -1 })).lean();

    res.json(tests.map(formatTest));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tests/:id ────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const test = await populateTest(Test.findById(req.params.id)).lean();
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(formatTest(test));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tests/:id/audit ──────────────────────────────────────────────────
router.get('/:id/audit', requireAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .select('audit')
      .populate('audit.changed_by', 'name')
      .lean();

    if (!test) return res.status(404).json({ error: 'Test not found' });

    const audit = (test.audit || [])
      .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
      .map((a) => ({
        ...a,
        changed_by_name: a.changed_by?.name || '—',
        changed_at:      a.changed_at,
      }));

    res.json(audit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/tests — create (admin or teacher) ───────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { student_id, lesson_type_id, date, result, cost, notes } = req.body;

    if (!student_id || !lesson_type_id || !date || !result)
      return res.status(400).json({ error: 'student_id, lesson_type_id, date, result required' });

    const [lt, student] = await Promise.all([
      LessonType.findById(lesson_type_id).lean(),
      Student.findById(student_id).lean(),
    ]);

    if (!lt)      return res.status(404).json({ error: 'Lesson type not found' });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Calculate attempt number for this student + lesson type combination
    const prevAttempts = await Test.countDocuments({
      student:     student_id,
      lesson_type: lesson_type_id,
    });

    const testCost = (cost !== undefined && cost !== '') ? Number(cost) : lt.test_cost;

    const test = await new Test({
      student:        student_id,
      lesson_type:    lesson_type_id,
      attempt_number: prevAttempts + 1,
      date,
      result,
      cost: testCost,
      notes: notes || null,
      created_by: req.user.id,
    }).save();

    // Advance student stage if they passed their current stage test
    let newStage = student.current_stage;
    if (result === 'pass' && student.current_stage === lt.slug) {
      newStage = await advanceStudentStage(student_id, lt.slug);
    }

    res.status(201).json({
      id:      test._id.toString(),
      newStage,
      attempt: prevAttempts + 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/tests/:id — update with embedded audit trail ─────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).lean();
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const { date, result, cost, notes } = req.body;
    const changedAt  = new Date();
    const changedBy  = req.user.id;
    const auditPush  = [];

    // Detect field-level changes and build audit entries
    if (result !== undefined && result !== test.result)
      auditPush.push({ field: 'result', old_value: test.result,       new_value: result,       changed_by: changedBy, changed_at: changedAt });
    if (date   !== undefined && date   !== test.date)
      auditPush.push({ field: 'date',   old_value: test.date,         new_value: date,         changed_by: changedBy, changed_at: changedAt });
    if (cost   !== undefined && String(cost) !== String(test.cost))
      auditPush.push({ field: 'cost',   old_value: String(test.cost), new_value: String(cost), changed_by: changedBy, changed_at: changedAt });
    if (notes  !== undefined && notes  !== test.notes)
      auditPush.push({ field: 'notes',  old_value: test.notes,        new_value: notes,        changed_by: changedBy, changed_at: changedAt });

    const update = {
      date:   date   !== undefined ? date               : test.date,
      result: result !== undefined ? result             : test.result,
      cost:   cost   !== undefined ? Number(cost)       : test.cost,
      notes:  notes  !== undefined ? (notes || null)    : test.notes,
    };

    if (auditPush.length) {
      update.$push = { audit: { $each: auditPush } };
    }

    await Test.findByIdAndUpdate(req.params.id, update);

    // If correcting from non-pass → pass, advance student stage
    if (result === 'pass' && test.result !== 'pass') {
      const lt = await LessonType.findById(test.lesson_type).select('slug').lean();
      const student = await Student.findById(test.student).select('current_stage').lean();
      if (student && lt && student.current_stage === lt.slug) {
        await advanceStudentStage(test.student, lt.slug);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/tests/:id — admin only ────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Format helper ─────────────────────────────────────────────────────────────
// Flattens populated fields to match the flat shape the frontend expects
function formatTest(t) {
  return {
    id:               t._id.toString(),
    _id:              t._id.toString(),
    student_id:       t.student?._id?.toString() || t.student?.toString(),
    student_name:     t.student?.name,
    lesson_type_id:   t.lesson_type?._id?.toString() || t.lesson_type?.toString(),
    lesson_type_name: t.lesson_type?.name,
    slug:             t.lesson_type?.slug,
    attempt_number:   t.attempt_number,
    date:             t.date,
    result:           t.result,
    cost:             t.cost,
    notes:            t.notes,
    created_by:       t.created_by?._id?.toString() || t.created_by?.toString(),
    created_by_name:  t.created_by?.name || '—',
    createdAt:        t.createdAt,
  };
}

module.exports = router;
