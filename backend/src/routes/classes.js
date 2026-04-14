// src/routes/classes.js — MongoDB version
// Enrollments are embedded in ClassSession documents.

const express      = require('express');
const mongoose     = require('mongoose');
const ClassSession = require('../models/ClassSession');
const User         = require('../models/User');
const LessonType   = require('../models/LessonType');
const { requireAuth } = require('../middleware/auth');
const { canEnrollInStage } = require('../utils/progression');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Check if a teacher already has a session at the given date/time.
 * Overlap: existing.start_time < newEnd AND existing.end_time > newStart
 * excludeId: skip one session (used during PUT to ignore itself)
 */
async function findConflict(teacherId, date, startTime, endTime, excludeId = null) {
  const query = {
    teacher:    teacherId,
    date,
    start_time: { $lt: endTime },
    end_time:   { $gt: startTime },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return ClassSession.findOne(query).lean();
}

/**
 * Build a populated, frontend-friendly object from a ClassSession lean doc.
 * Matches the shape the frontend expects (flat fields with _name suffixes).
 */
function formatSession(s) {
  return {
    id:                 s._id.toString(),
    _id:                s._id.toString(),
    lesson_type_id:     s.lesson_type?._id?.toString() || s.lesson_type?.toString(),
    lesson_type_name:   s.lesson_type?.name,
    lesson_type_slug:   s.lesson_type?.slug,
    class_cost:         s.lesson_type?.class_cost,
    teacher_id:         s.teacher?._id?.toString() || s.teacher?.toString(),
    teacher_name:       s.teacher?.name,
    teacher_type:       s.teacher?.teacher_type,
    date:               s.date,
    start_time:         s.start_time,
    end_time:           s.end_time,
    max_students:       s.max_students,
    cost_override:      s.cost_override,
    notes:              s.notes,
    enrolled_count:     s.enrollments?.length || 0,
    student_names:      s.enrollments
      ?.map((e) => e.student?.name)
      .filter(Boolean)
      .join(', ') || '',
    createdAt:          s.createdAt,
  };
}

// ── GET /api/classes ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { lessonType, date, studentId } = req.query;

    // Teachers see only their own sessions
    const teacherId = req.user.role === 'teacher'
      ? req.user.id
      : req.query.teacherId;

    const filter = {};
    if (teacherId)  filter.teacher = teacherId;
    if (date)       filter.date = date;

    if (studentId) {
      filter['enrollments.student'] = new mongoose.Types.ObjectId(studentId);
    }

    let query = ClassSession.find(filter)
      .populate('lesson_type', 'name slug class_cost')
      .populate('teacher', 'name teacher_type')
      .populate('enrollments.student', 'name phone current_stage')
      .sort({ date: 1, start_time: 1 });

    // Filter by lesson type slug after population
    let sessions = (await query.lean());

    if (lessonType) {
      sessions = sessions.filter((s) => s.lesson_type?.slug === lessonType);
    }

    res.json(sessions.map(formatSession));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/classes/calendar ─────────────────────────────────────────────────
// Must be defined BEFORE /:id or Express will try to cast 'calendar' as an ObjectId
router.get('/calendar', requireAuth, async (req, res) => {
  try {
    const { from, to, lessonType } = req.query;

    const teacherId = req.user.role === 'teacher'
      ? req.user.id
      : req.query.teacherId;

    const filter = {};
    if (teacherId) filter.teacher = teacherId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to)   filter.date.$lte = to;
    }

    let sessions = await ClassSession.find(filter)
      .populate('lesson_type', 'name slug class_cost')
      .populate('teacher', 'name teacher_type')
      .populate('enrollments.student', 'name')
      .sort({ date: 1, start_time: 1 })
      .lean();

    if (lessonType) {
      sessions = sessions.filter((s) => s.lesson_type?.slug === lessonType);
    }

    res.json(sessions.map(formatSession));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/classes/:id ──────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const session = await ClassSession.findById(req.params.id)
      .populate('lesson_type', 'name slug class_cost')
      .populate('teacher', 'name teacher_type')
      .populate('enrollments.student', 'id name phone current_stage')
      .lean();

    if (!session)
      return res.status(404).json({ error: 'Session not found' });

    if (req.user.role === 'teacher' && session.teacher._id.toString() !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });

    // Shape enrollments to match frontend expectation
    const students = (session.enrollments || []).map((e) => ({
      id:            e.student?._id?.toString(),
      name:          e.student?.name,
      phone:         e.student?.phone,
      current_stage: e.student?.current_stage,
      attended:      e.attended,
    }));

    res.json({ ...formatSession(session), students });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/classes ─────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      lesson_type_id, teacher_id, date, start_time, end_time,
      cost_override, notes, student_id,
    } = req.body;

    if (!lesson_type_id || !teacher_id || !date || !start_time || !end_time)
      return res.status(400).json({
        error: 'lesson_type_id, teacher_id, date, start_time, end_time required',
      });

    // Teachers can only create sessions for themselves
    if (req.user.role === 'teacher' && req.user.id !== teacher_id)
      return res.status(403).json({ error: 'Teachers can only create their own sessions' });

    // Overlap check
    const conflict = await findConflict(teacher_id, date, start_time, end_time);
    if (conflict)
      return res.status(409).json({
        error: `Schedule conflict: teacher already has a session ${conflict.start_time}–${conflict.end_time} on ${conflict.date}`,
      });

    // Derive max_students from the teacher's type
    const teacher = await User.findById(teacher_id).select('teacher_type').lean();
    if (!teacher)
      return res.status(404).json({ error: 'Teacher not found' });

    const maxStudents = teacher.teacher_type === 'driving_parking' ? 1 : null;

    // driving/parking teacher MUST provide a student at creation
    if (maxStudents === 1 && !student_id)
      return res.status(400).json({
        error: 'Driving/Parking teachers must assign a student when creating a class',
      });

    // If student provided, validate progression
    if (student_id) {
      const lt = await LessonType.findById(lesson_type_id).select('slug').lean();
      if (lt) {
        const check = await canEnrollInStage(student_id, lt.slug);
        if (!check.allowed)
          return res.status(422).json({ error: check.reason });
      }
    }

    const enrollments = student_id
      ? [{ student: student_id, attended: true }]
      : [];

    const session = await new ClassSession({
      lesson_type:   lesson_type_id,
      teacher:       teacher_id,
      date,
      start_time,
      end_time,
      max_students:  maxStudents,
      cost_override: cost_override || null,
      notes:         notes || null,
      enrollments,
    }).save();

    res.status(201).json({ id: session._id.toString() });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ error: 'Teacher already has a session at that time' });
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/classes/:id ──────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const session = await ClassSession.findById(req.params.id).lean();
    if (!session)
      return res.status(404).json({ error: 'Session not found' });

    if (req.user.role === 'teacher' && session.teacher.toString() !== req.user.id)
      return res.status(403).json({ error: "Cannot edit another teacher's session" });

    const { date, start_time, end_time, cost_override, notes } = req.body;

    const conflict = await findConflict(session.teacher, date, start_time, end_time, session._id);
    if (conflict)
      return res.status(409).json({
        error: `Schedule conflict: ${conflict.start_time}–${conflict.end_time}`,
      });

    await ClassSession.findByIdAndUpdate(req.params.id, {
      date,
      start_time,
      end_time,
      cost_override: cost_override || null,
      notes:         notes || null,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/classes/:id ───────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const session = await ClassSession.findById(req.params.id).lean();
    if (!session)
      return res.status(404).json({ error: 'Session not found' });

    if (req.user.role === 'teacher' && session.teacher.toString() !== req.user.id)
      return res.status(403).json({ error: "Cannot delete another teacher's session" });

    await ClassSession.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/classes/:id/enroll ──────────────────────────────────────────────
router.post('/:id/enroll', requireAuth, async (req, res) => {
  try {
    const { student_id } = req.body;
    if (!student_id)
      return res.status(400).json({ error: 'student_id required' });

    const session = await ClassSession.findById(req.params.id)
      .populate('teacher', 'teacher_type')
      .populate('lesson_type', 'slug')
      .lean();

    if (!session)
      return res.status(404).json({ error: 'Session not found' });

    // Only theory teachers allow post-creation enrollment
    if (session.teacher.teacher_type === 'driving_parking')
      return res.status(403).json({
        error: 'Cannot add students to a Driving/Parking session after creation.',
      });

    if (req.user.role === 'teacher' && session.teacher._id.toString() !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });

    // Capacity check
    if (session.max_students !== null && session.enrollments.length >= session.max_students)
      return res.status(422).json({
        error: `This session is full (max ${session.max_students} student)`,
      });

    // Already enrolled?
    const alreadyIn = session.enrollments.some(
      (e) => e.student.toString() === student_id
    );
    if (alreadyIn)
      return res.status(409).json({ error: 'Student already enrolled' });

    // Progression check
    const check = await canEnrollInStage(student_id, session.lesson_type.slug);
    if (!check.allowed)
      return res.status(422).json({ error: check.reason });

    await ClassSession.findByIdAndUpdate(req.params.id, {
      $push: { enrollments: { student: student_id, attended: true } },
    });

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/classes/:id/enroll/:studentId ─────────────────────────────────
router.delete('/:id/enroll/:studentId', requireAuth, async (req, res) => {
  try {
    const session = await ClassSession.findById(req.params.id).lean();
    if (!session)
      return res.status(404).json({ error: 'Session not found' });

    if (req.user.role === 'teacher' && session.teacher.toString() !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });

    await ClassSession.findByIdAndUpdate(req.params.id, {
      $pull: { enrollments: { student: new mongoose.Types.ObjectId(req.params.studentId) } },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/classes/:id/attendance ────────────────────────────────────────
router.patch('/:id/attendance', requireAuth, async (req, res) => {
  try {
    const session = await ClassSession.findById(req.params.id).lean();
    if (!session)
      return res.status(404).json({ error: 'Session not found' });

    if (req.user.role === 'teacher' && session.teacher.toString() !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });

    const { student_id, attended } = req.body;

    // Use the positional operator to update the matching enrollment sub-doc
    await ClassSession.findOneAndUpdate(
      { _id: req.params.id, 'enrollments.student': new mongoose.Types.ObjectId(student_id) },
      { $set: { 'enrollments.$.attended': !!attended } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
