// src/routes/admin.js — MongoDB version

const express      = require('express');
const mongoose     = require('mongoose');
const User         = require('../models/User');
const Student      = require('../models/Student');
const LessonType   = require('../models/LessonType');
const ClassSession = require('../models/ClassSession');
const Test         = require('../models/Test');
const Payment      = require('../models/Payment');
const { requireAdmin, requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/admin/dashboard ──────────────────────────────────────────────────
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [
      totalStudents,
      byStageRaw,
      upcomingClasses,
      todayClassesRaw,
      revenueResult,
      classOwedResult,
      testOwedResult,
      teachers,
      recentPayments,
    ] = await Promise.all([
      // Total student count
      Student.countDocuments(),

      // Students grouped by current_stage
      Student.aggregate([
        { $group: { _id: '$current_stage', count: { $sum: 1 } } },
        { $project: { _id: 0, current_stage: '$_id', count: 1 } },
      ]),

      // Upcoming class count (date >= today)
      ClassSession.countDocuments({ date: { $gte: today } }),

      // Today's classes with teacher + lesson type info
      ClassSession.find({ date: today })
        .populate('lesson_type', 'name slug')
        .populate('teacher', 'name teacher_type')
        .sort('start_time')
        .lean(),

      // Total payments collected
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),

      // Total class cost owed (attended enrollments)
      ClassSession.aggregate([
        { $unwind: '$enrollments' },
        { $match: { 'enrollments.attended': true } },
        {
          $lookup: {
            from:         'lessontypes',
            localField:   'lesson_type',
            foreignField: '_id',
            as:           'lt',
          },
        },
        { $unwind: '$lt' },
        {
          $group: {
            _id:   null,
            total: {
              $sum: {
                $ifNull: ['$cost_override', '$lt.class_cost'],
              },
            },
          },
        },
      ]),

      // Total test cost owed
      Test.aggregate([{ $group: { _id: null, total: { $sum: '$cost' } } }]),

      // Teacher list with session counts
      User.aggregate([
        { $match: { role: 'teacher' } },
        {
          $lookup: {
            from:         'classsessions',
            localField:   '_id',
            foreignField: 'teacher',
            as:           'sessions',
          },
        },
        {
          $project: {
            _id:          1,
            name:         1,
            phone:        1,
            teacher_type: 1,
            total_sessions: { $size: '$sessions' },
          },
        },
        { $sort: { name: 1 } },
      ]),

      // 10 most recent payments
      Payment.find()
        .populate('student', 'name')
        .populate('recorded_by', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const classOwed    = classOwedResult[0]?.total || 0;
    const testOwed     = testOwedResult[0]?.total || 0;
    const totalOwed    = classOwed + testOwed;

    res.json({
      totalStudents,
      byStage: byStageRaw,
      upcomingClasses,
      todayClasses: todayClassesRaw.map((c) => ({
        id:               c._id.toString(),
        lesson_type_name: c.lesson_type?.name,
        slug:             c.lesson_type?.slug,
        teacher_name:     c.teacher?.name,
        teacher_type:     c.teacher?.teacher_type,
        start_time:       c.start_time,
        end_time:         c.end_time,
        enrolled_count:   c.enrollments?.length || 0,
        date:             c.date,
      })),
      totalRevenue: +totalRevenue.toFixed(2),
      totalOwed:    +totalOwed.toFixed(2),
      outstanding:  +(totalOwed - totalRevenue).toFixed(2),
      teachers: teachers.map((t) => ({
        id:             t._id.toString(),
        name:           t.name,
        phone:          t.phone,
        teacher_type:   t.teacher_type,
        total_sessions: t.total_sessions,
      })),
      recentPayments: recentPayments.map((p) => ({
        id:               p._id.toString(),
        student_name:     p.student?.name || '—',
        amount:           p.amount,
        payment_date:     p.payment_date,
        method:           p.method,
        recorded_by_name: p.recorded_by?.name || '—',
        notes:            p.notes,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/lesson-types ───────────────────────────────────────────────
router.get('/lesson-types', requireAuth, async (req, res) => {
  try {
    const lessonTypes = await LessonType.find().sort('sequence_order').lean();
    res.json(lessonTypes.map((lt) => ({ ...lt, id: lt._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/lesson-types/:id ──────────────────────────────────────────
router.put('/lesson-types/:id', requireAdmin, async (req, res) => {
  try {
    const { class_cost, test_cost } = req.body;
    const lt = await LessonType.findByIdAndUpdate(
      req.params.id,
      { class_cost: Number(class_cost), test_cost: Number(test_cost) },
      { new: true, runValidators: true }
    );
    if (!lt) return res.status(404).json({ error: 'Lesson type not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/teachers ───────────────────────────────────────────────────
router.get('/teachers', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const teachers = await User.aggregate([
      { $match: { role: 'teacher' } },
      {
        $lookup: {
          from:         'classsessions',
          localField:   '_id',
          foreignField: 'teacher',
          as:           'all_sessions',
        },
      },
      {
        $project: {
          _id:          1,
          name:         1,
          email:        1,
          phone:        1,
          teacher_type: 1,
          total_sessions:    { $size: '$all_sessions' },
          upcoming_sessions: {
            $size: {
              $filter: {
                input: '$all_sessions',
                as:    'session',
                cond:  { $gte: ['$$session.date', today] },
              },
            },
          },
        },
      },
      { $sort: { name: 1 } },
    ]);

    res.json(
      teachers.map((t) => ({
        ...t,
        id: t._id.toString(),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/teachers/:id ───────────────────────────────────────────────
router.put('/teachers/:id', requireAdmin, async (req, res) => {
  try {
    const { name, phone, teacher_type } = req.body;

    if (teacher_type && !['theory', 'driving_parking'].includes(teacher_type))
      return res.status(400).json({ error: 'Invalid teacher_type' });

    const teacher = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'teacher' },
      { name, phone: phone || null, teacher_type: teacher_type || null },
      { new: true, runValidators: true }
    );

    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/teachers/:id ───────────────────────────────────────────
router.delete('/teachers/:id', requireAdmin, async (req, res) => {
  try {
    const sessionCount = await ClassSession.countDocuments({ teacher: req.params.id });
    if (sessionCount > 0)
      return res.status(409).json({
        error: `Cannot delete teacher with ${sessionCount} existing sessions`,
      });

    const teacher = await User.findOneAndDelete({ _id: req.params.id, role: 'teacher' });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/teacher/:id/schedule ──────────────────────────────────────
router.get('/teacher/:id/schedule', requireAuth, async (req, res) => {
  try {
    // Teachers can only view their own schedule
    if (req.user.role === 'teacher' && req.user.id !== req.params.id)
      return res.status(403).json({ error: 'Access denied' });

    const today  = new Date().toISOString().slice(0, 10);
    const in30   = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const { from, to } = req.query;

    const sessions = await ClassSession.find({
      teacher: req.params.id,
      date: {
        $gte: from || today,
        $lte: to   || in30,
      },
    })
      .populate('lesson_type', 'name slug class_cost')
      .populate('enrollments.student', 'name')
      .sort({ date: 1, start_time: 1 })
      .lean();

    res.json(
      sessions.map((s) => ({
        id:               s._id.toString(),
        lesson_type_name: s.lesson_type?.name,
        lesson_type_slug: s.lesson_type?.slug,
        class_cost:       s.lesson_type?.class_cost,
        date:             s.date,
        start_time:       s.start_time,
        end_time:         s.end_time,
        max_students:     s.max_students,
        enrolled_count:   s.enrollments?.length || 0,
        student_names:    s.enrollments
          ?.map((e) => e.student?.name)
          .filter(Boolean)
          .join(', ') || '',
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
