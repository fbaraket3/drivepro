// src/utils/progression.js — MongoDB/Mongoose version
// All functions are async. Business logic is unchanged.

const Student     = require('../models/Student');
const LessonType  = require('../models/LessonType');
const ClassSession = require('../models/ClassSession');
const Test        = require('../models/Test');
const Payment     = require('../models/Payment');

const STAGE_ORDER = ['theory', 'driving', 'parking', 'completed'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextStage(currentSlug) {
  const idx = STAGE_ORDER.indexOf(currentSlug);
  return idx >= 0 && idx < STAGE_ORDER.length - 1
    ? STAGE_ORDER[idx + 1]
    : 'completed';
}

// ── canEnrollInStage ──────────────────────────────────────────────────────────
// Returns { allowed: true } or { allowed: false, reason: '...' }
async function canEnrollInStage(studentId, lessonTypeSlug) {
  if (lessonTypeSlug === 'theory') return { allowed: true };

  const student = await Student.findById(studentId).select('current_stage').lean();
  if (!student) return { allowed: false, reason: 'Student not found' };

  const stageIdx   = STAGE_ORDER.indexOf(lessonTypeSlug);
  const studentIdx = STAGE_ORDER.indexOf(student.current_stage);

  if (studentIdx < stageIdx) {
    const prevSlug = STAGE_ORDER[stageIdx - 1];
    return {
      allowed: false,
      reason: `Student must pass the ${prevSlug} test before accessing ${lessonTypeSlug} classes`,
    };
  }
  return { allowed: true };
}

// ── advanceStudentStage ───────────────────────────────────────────────────────
// Called inside the test-creation flow when result === 'pass'.
// Returns the new stage slug.
async function advanceStudentStage(studentId, passedLessonTypeSlug) {
  const student = await Student.findById(studentId).select('current_stage').lean();
  if (!student) throw new Error('Student not found');

  if (student.current_stage === passedLessonTypeSlug) {
    const next = nextStage(passedLessonTypeSlug);
    await Student.findByIdAndUpdate(studentId, { current_stage: next });
    return next;
  }
  return student.current_stage;
}

// ── getStudentFinancials ──────────────────────────────────────────────────────
// Returns a breakdown of what the student owes vs. has paid, per lesson type.
async function getStudentFinancials(studentId) {
  const [lessonTypes, payments] = await Promise.all([
    LessonType.find().sort('sequence_order').lean(),
    Payment.find({ student: studentId }).lean(),
  ]);

  const perType = {};
  let totalOwed = 0;

  for (const lt of lessonTypes) {
    // Find all class sessions where this student has an attended enrollment
    const sessions = await ClassSession.find({
      lesson_type: lt._id,
      'enrollments.student': studentId,
      'enrollments.attended': true,
    })
      .select('cost_override lesson_type enrollments')
      .populate('lesson_type', 'class_cost')
      .lean();

    // Only count the enrollments that belong to this student and are attended
    const classRows = sessions
      .map((s) => {
        const enr = s.enrollments.find(
          (e) => e.student.toString() === studentId.toString() && e.attended
        );
        return enr ? { cost: s.cost_override ?? s.lesson_type.class_cost } : null;
      })
      .filter(Boolean);

    const classTotal = classRows.reduce((sum, r) => sum + r.cost, 0);

    // All test attempts for this lesson type
    const testRows = await Test.find({ student: studentId, lesson_type: lt._id })
      .sort('attempt_number')
      .lean();

    const testTotal = testRows.reduce((sum, t) => sum + t.cost, 0);
    const total = classTotal + testTotal;
    totalOwed += total;

    perType[lt.slug] = {
      lessonTypeName: lt.name,
      classCount:    classRows.length,
      classTotal:    +classTotal.toFixed(2),
      testAttempts:  testRows.length,
      testTotal:     +testTotal.toFixed(2),
      total:         +total.toFixed(2),
      tests:         testRows,
    };
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    perType,
    totalOwed:  +totalOwed.toFixed(2),
    totalPaid:  +totalPaid.toFixed(2),
    balance:    +(totalPaid - totalOwed).toFixed(2),
  };
}

// ── getStudentProgress ────────────────────────────────────────────────────────
// Returns the full progress timeline shown on the student profile page.
async function getStudentProgress(studentId) {
  const student = await Student.findById(studentId).lean();
  if (!student) return null;

  const lessonTypes = await LessonType.find().sort('sequence_order').lean();
  const studentIdx  = STAGE_ORDER.indexOf(student.current_stage);

  const stages = await Promise.all(
    lessonTypes.map(async (lt) => {
      // Tests for this stage
      const tests = await Test.find({ student: studentId, lesson_type: lt._id })
        .sort('attempt_number')
        .populate('created_by', 'name')
        .lean();

      const passed = tests.some((t) => t.result === 'pass');

      // Class sessions this student attended for this lesson type
      const sessions = await ClassSession.find({
        lesson_type: lt._id,
        'enrollments.student': studentId,
      })
        .populate('teacher', 'name')
        .sort({ date: -1 })
        .lean();

      // Attach the student's own attended flag
      const classes = sessions.map((s) => {
        const enr = s.enrollments.find(
          (e) => e.student.toString() === studentId.toString()
        );
        return {
          ...s,
          teacher_name: s.teacher?.name,
          attended: enr ? enr.attended : true,
        };
      });

      const stageIdx = STAGE_ORDER.indexOf(lt.slug);
      let status = 'locked';
      if (passed)                  status = 'completed';
      else if (studentIdx > stageIdx) status = 'completed';
      else if (studentIdx === stageIdx) status = 'active';

      return { lessonType: lt, status, classes, tests, passed };
    })
  );

  return { student, stages, currentStage: student.current_stage };
}

module.exports = {
  STAGE_ORDER,
  nextStage,
  canEnrollInStage,
  advanceStudentStage,
  getStudentFinancials,
  getStudentProgress,
};
