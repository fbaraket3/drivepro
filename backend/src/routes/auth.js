// src/routes/auth.js

const express  = require('express');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const { requireAdmin, requireAuth, SECRET } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    // Password field is excluded from queries by default (select: false on schema)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user)
      return res.status(401).json({ error: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match)
      return res.status(401).json({ error: 'Invalid credentials' });

    const payload = {
      id:           user._id.toString(),
      name:         user.name,
      email:        user.email,
      role:         user.role,
      teacher_type: user.teacher_type || null,
    };

    const token = jwt.sign(payload, SECRET, { expiresIn: '12h' });
    res.json({ token, user: payload });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ── POST /api/auth/teachers — admin creates a teacher account ─────────────────
router.post('/teachers', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, teacher_type } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password required' });
    if (!teacher_type || !['theory', 'driving_parking'].includes(teacher_type))
      return res.status(400).json({ error: 'teacher_type must be "theory" or "driving_parking"' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ error: 'Email already exists' });

    // Password is hashed by the pre-save hook on User model
    const teacher = await new User({
      name,
      email,
      password,
      role: 'teacher',
      teacher_type,
      phone: phone || null,
    }).save();

    res.status(201).json({
      id:           teacher._id.toString(),
      name:         teacher.name,
      email:        teacher.email,
      role:         teacher.role,
      teacher_type: teacher.teacher_type,
    });

  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
