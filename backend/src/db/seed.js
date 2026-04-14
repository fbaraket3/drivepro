// src/db/seed.js — Populates MongoDB with default lesson types + demo data.
// Run with:  npm run seed
// Safe to re-run: uses upsert / insertMany with ordered:false so it won't
// crash if some documents already exist.

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./connection');

const User        = require('../models/User');
const LessonType  = require('../models/LessonType');
const Student     = require('../models/Student');
const ClassSession = require('../models/ClassSession');
const Test        = require('../models/Test');
const Payment     = require('../models/Payment');

async function seed() {
  await connectDB();

  // ── 1. Lesson Types ─────────────────────────────────────────────────────────
  const lessonTypeDefs = [
    { slug: 'theory',  name: 'Theory',  sequence_order: 1, class_cost: 10, test_cost: 30 },
    { slug: 'driving', name: 'Driving', sequence_order: 2, class_cost: 25, test_cost: 50 },
    { slug: 'parking', name: 'Parking', sequence_order: 3, class_cost: 25, test_cost: 40 },
  ];

  // upsert each so re-runs don't duplicate
  const lessonTypes = {};
  for (const def of lessonTypeDefs) {
    const lt = await LessonType.findOneAndUpdate(
      { slug: def.slug },
      { $setOnInsert: def },
      { upsert: true, new: true }
    );
    lessonTypes[lt.slug] = lt;
  }
  console.log('LessonTypes seeded');

  // ── 2. Users ────────────────────────────────────────────────────────────────
  const userDefs = [
    { name: 'Admin User',    email: 'admin@drivepro.tn',  password: 'admin123',   role: 'admin',   teacher_type: null,             phone: '71 000 000' },
    { name: 'Sami Trabelsi', email: 'sami@drivepro.tn',   password: 'teacher123', role: 'teacher', teacher_type: 'theory',          phone: '71 123 456' },
    { name: 'Fatma Khedher', email: 'fatma@drivepro.tn',  password: 'teacher123', role: 'teacher', teacher_type: 'driving_parking', phone: '73 987 654' },
    { name: 'Karim Sassi',   email: 'karim@drivepro.tn',  password: 'teacher123', role: 'teacher', teacher_type: 'driving_parking', phone: '25 111 222' },
  ];

  const users = {};
  for (const def of userDefs) {
    // Check existence by email; create if missing (pre-save hook hashes password)
    let user = await User.findOne({ email: def.email }).select('+password');
    if (!user) {
      user = await new User(def).save();
      console.log(`  Created user: ${def.email}`);
    }
    users[def.email] = user;
  }
  console.log('Users seeded');

  const admin = users['admin@drivepro.tn'];
  const sami  = users['sami@drivepro.tn'];   // theory teacher
  const fatma = users['fatma@drivepro.tn'];  // driving/parking teacher
  const karim = users['karim@drivepro.tn'];  // driving/parking teacher

  // ── 3. Students ─────────────────────────────────────────────────────────────
  const studentDefs = [
    { name: 'Amir Cherif',    phone: '22 345 678', email: 'amir@email.com',  cin: '12345678', registration_date: '2024-01-10', notes: 'Anxious on highways', current_stage: 'driving'   },
    { name: 'Lina Mansouri',  phone: '55 678 901', email: 'lina@email.com',  cin: '23456789', registration_date: '2024-02-05', notes: '',                    current_stage: 'theory'    },
    { name: 'Karim Belhaj',   phone: '98 234 567', email: '',                cin: '34567890', registration_date: '2024-03-15', notes: 'Needs extra parking',  current_stage: 'theory'    },
    { name: 'Rania Gharbi',   phone: '20 111 222', email: 'rania@email.com', cin: '45678901', registration_date: '2024-04-01', notes: '',                    current_stage: 'parking'   },
    { name: 'Youssef Zouari', phone: '25 333 444', email: '',                cin: '56789012', registration_date: '2024-04-10', notes: '',                    current_stage: 'completed' },
  ];

  const students = {};
  for (const def of studentDefs) {
    const s = await Student.findOneAndUpdate(
      { cin: def.cin },
      { $setOnInsert: def },
      { upsert: true, new: true }
    );
    students[def.name] = s;
  }
  console.log('Students seeded');

  const amir    = students['Amir Cherif'];
  const lina    = students['Lina Mansouri'];
  const karimB  = students['Karim Belhaj'];
  const rania   = students['Rania Gharbi'];
  const youssef = students['Youssef Zouari'];

  // ── 4. Tests (historical) ───────────────────────────────────────────────────
  const testDefs = [
    { student: amir,    lesson_type: lessonTypes.theory,  attempt_number: 1, date: '2024-02-20', result: 'pass', cost: 30, created_by: admin },
    { student: rania,   lesson_type: lessonTypes.theory,  attempt_number: 1, date: '2024-02-01', result: 'pass', cost: 30, created_by: admin },
    { student: rania,   lesson_type: lessonTypes.driving, attempt_number: 1, date: '2024-03-15', result: 'fail', cost: 50, created_by: admin },
    { student: rania,   lesson_type: lessonTypes.driving, attempt_number: 2, date: '2024-04-01', result: 'pass', cost: 50, created_by: admin },
    { student: youssef, lesson_type: lessonTypes.theory,  attempt_number: 1, date: '2024-02-10', result: 'pass', cost: 30, created_by: admin },
    { student: youssef, lesson_type: lessonTypes.driving, attempt_number: 1, date: '2024-03-10', result: 'pass', cost: 50, created_by: admin },
    { student: youssef, lesson_type: lessonTypes.parking, attempt_number: 1, date: '2024-04-05', result: 'pass', cost: 40, created_by: admin },
  ];

  for (const def of testDefs) {
    const exists = await Test.findOne({
      student: def.student._id,
      lesson_type: def.lesson_type._id,
      attempt_number: def.attempt_number,
    });
    if (!exists) await new Test(def).save();
  }
  console.log('Tests seeded');

  // ── 5. Class Sessions ────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const tom   = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const day3  = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

  const sessionDefs = [
    // Theory sessions — Sami (theory teacher), multi-student, max_students: null
    {
      lesson_type: lessonTypes.theory, teacher: sami,
      date: today, start_time: '09:00', end_time: '10:00', max_students: null,
      enrollments: [{ student: lina }, { student: karimB }],
    },
    {
      lesson_type: lessonTypes.theory, teacher: sami,
      date: tom, start_time: '09:00', end_time: '10:00', max_students: null,
      enrollments: [],
    },
    // Driving sessions — Fatma (driving/parking teacher), single-student, max_students: 1
    {
      lesson_type: lessonTypes.driving, teacher: fatma,
      date: today, start_time: '11:00', end_time: '12:30', max_students: 1,
      enrollments: [{ student: amir }],
    },
    {
      lesson_type: lessonTypes.driving, teacher: fatma,
      date: tom, start_time: '14:00', end_time: '15:30', max_students: 1,
      enrollments: [],
    },
    {
      lesson_type: lessonTypes.driving, teacher: fatma,
      date: day3, start_time: '10:00', end_time: '11:30', max_students: 1,
      enrollments: [],
    },
    // Parking session — Karim Sassi (driving/parking teacher), single-student
    {
      lesson_type: lessonTypes.parking, teacher: karim,
      date: today, start_time: '14:00', end_time: '15:00', max_students: 1,
      enrollments: [{ student: rania }],
    },
  ];

  for (const def of sessionDefs) {
    const exists = await ClassSession.findOne({
      teacher: def.teacher._id,
      date: def.date,
      start_time: def.start_time,
    });
    if (!exists) await new ClassSession(def).save();
  }
  console.log('Class sessions seeded');

  // ── 6. Payments ──────────────────────────────────────────────────────────────
  const paymentDefs = [
    { student: amir,    amount: 300, payment_date: '2024-01-15', method: 'cash',     reference_type: 'other', recorded_by: admin, notes: 'Initial deposit' },
    { student: amir,    amount: 30,  payment_date: '2024-02-20', method: 'cash',     reference_type: 'test',  recorded_by: admin, notes: 'Theory test fee' },
    { student: rania,   amount: 200, payment_date: '2024-02-01', method: 'card',     reference_type: 'other', recorded_by: sami,  notes: '' },
    { student: youssef, amount: 500, payment_date: '2024-01-20', method: 'transfer', reference_type: 'other', recorded_by: admin, notes: 'Full payment' },
  ];

  for (const def of paymentDefs) {
    const exists = await Payment.findOne({
      student: def.student._id,
      payment_date: def.payment_date,
      amount: def.amount,
    });
    if (!exists) await new Payment(def).save();
  }
  console.log('Payments seeded');

  console.log('\nSeed complete. Login credentials:');
  console.log('  Admin:   admin@drivepro.tn  / admin123');
  console.log('  Teacher: sami@drivepro.tn   / teacher123');
  console.log('  Teacher: fatma@drivepro.tn  / teacher123');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
