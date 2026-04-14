# 🚗 DrivePro — Driving School Management System

A full-stack web application for managing a driving school. Supports student progression, class scheduling, test tracking, and payments.

---

## Tech Stack

| Layer    | Technology                                          |
|----------|-----------------------------------------------------|
| Frontend | React 18, React Router v6, Vite                    |
| Backend  | Node.js, Express 4                                  |
| Database | SQLite (via `better-sqlite3` — zero config)         |
| Auth     | JWT (jsonwebtoken) + bcrypt                         |
| Styling  | Plain CSS (custom design system, no UI libraries)   |

---

## Project Structure

```
drivepro/
├── backend/
│   ├── data/               ← SQLite database (auto-created)
│   └── src/
│       ├── db/
│       │   ├── migrate.js  ← Schema creation
│       │   └── seed.js     ← Demo data
│       ├── middleware/
│       │   └── auth.js     ← JWT guards
│       ├── routes/
│       │   ├── auth.js
│       │   ├── students.js
│       │   ├── classes.js
│       │   ├── tests.js
│       │   ├── payments.js
│       │   └── admin.js
│       ├── utils/
│       │   └── progression.js  ← Core business logic
│       └── server.js
│
├── frontend/
│   └── src/
│       ├── context/        ← AuthContext
│       ├── utils/          ← API client
│       ├── components/
│       │   ├── layout/     ← AppLayout + sidebar
│       │   └── shared/     ← Reusable UI components
│       └── pages/
│           ├── admin/      ← Dashboard, Students, Classes, etc.
│           └── teacher/    ← Teacher portal
│
├── scripts/dev.js
└── README.md
```

---

## Quick Start

### Prerequisites
- **Node.js 18+** — https://nodejs.org

### 1. Install dependencies

```bash
# From the project root:
cd drivepro

npm install                          # root (concurrently)
npm install --prefix backend         # backend deps
npm install --prefix frontend        # frontend deps
```

### 2. Seed the database

```bash
npm run seed
# Creates: backend/data/drivepro.db
# Seeds:   lesson types, demo users, students, classes, tests, payments
```

### 3. Start both servers

```bash
# Option A — using the dev runner:
node scripts/dev.js

# Option B — two terminals:
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

### 4. Open the app

- **Frontend:** http://localhost:5173
- **API:**      http://localhost:3001/api/health

---

## Default Login Credentials

| Role    | Email                  | Password     |
|---------|------------------------|--------------|
| Admin   | admin@drivepro.tn      | admin123     |
| Teacher | sami@drivepro.tn       | teacher123   |
| Teacher | fatma@drivepro.tn      | teacher123   |

---

## Database Schema

### `lesson_types`
| Column         | Type  | Notes                          |
|----------------|-------|--------------------------------|
| id             | INT   | Primary key                    |
| slug           | TEXT  | `theory`, `driving`, `parking` |
| name           | TEXT  | Display name                   |
| sequence_order | INT   | 1, 2, 3                        |
| class_cost     | REAL  | Default cost per class session |
| test_cost      | REAL  | Default cost per test attempt  |

### `students`
| Column            | Type | Notes                                         |
|-------------------|------|-----------------------------------------------|
| id                | INT  | Primary key                                   |
| name              | TEXT | Full name                                     |
| phone             | TEXT |                                               |
| email             | TEXT | Optional                                      |
| cin               | TEXT | National ID                                   |
| registration_date | TEXT | ISO date                                      |
| current_stage     | TEXT | `theory` / `driving` / `parking` / `completed`|
| notes             | TEXT |                                               |

### `class_sessions`
| Column         | Type  | Notes                                  |
|----------------|-------|----------------------------------------|
| lesson_type_id | INT   | FK → lesson_types                      |
| teacher_id     | INT   | FK → users                             |
| date           | TEXT  | ISO date                               |
| start_time     | TEXT  | HH:MM                                  |
| end_time       | TEXT  | HH:MM                                  |
| cost_override  | REAL  | NULL = use lesson_type.class_cost      |

### `class_enrollments`
| Column          | Type | Notes                            |
|-----------------|------|----------------------------------|
| class_session_id| INT  | FK → class_sessions              |
| student_id      | INT  | FK → students                    |
| attended        | INT  | 1 = attended, 0 = absent         |

### `tests`
| Column         | Type  | Notes                          |
|----------------|-------|--------------------------------|
| student_id     | INT   | FK → students                  |
| lesson_type_id | INT   | FK → lesson_types              |
| attempt_number | INT   | Auto-incremented per student   |
| date           | TEXT  | ISO date                       |
| result         | TEXT  | `pass` / `fail` / `pending`    |
| cost           | REAL  | Actual cost charged             |

### `payments`
| Column         | Type  | Notes                          |
|----------------|-------|--------------------------------|
| student_id     | INT   | FK → students                  |
| amount         | REAL  |                                |
| payment_date   | TEXT  | ISO date                       |
| method         | TEXT  | cash/card/transfer/cheque      |
| reference_type | TEXT  | class/test/other               |
| reference_id   | INT   | Optional: class or test ID     |

---

## API Endpoints

### Auth
```
POST /api/auth/login          → { token, user }
GET  /api/auth/me             → { user }         [auth]
POST /api/auth/teachers       → create teacher   [admin]
```

### Students
```
GET    /api/students               [auth]
GET    /api/students/:id           [auth] — includes progress + financials
GET    /api/students/:id/progress  [auth]
GET    /api/students/:id/financials[auth]
POST   /api/students               [admin]
PUT    /api/students/:id           [admin]
DELETE /api/students/:id           [admin]
```

### Classes
```
GET    /api/classes                [auth]
GET    /api/classes/calendar       [auth] — for calendar view
GET    /api/classes/:id            [auth] — includes enrolled students
POST   /api/classes                [auth] — teachers can create own
PUT    /api/classes/:id            [auth]
DELETE /api/classes/:id            [auth]
POST   /api/classes/:id/enroll     [auth] — add student (checks progression)
DELETE /api/classes/:id/enroll/:studentId [auth]
PATCH  /api/classes/:id/attendance [auth] — mark attended/absent
```

### Tests
```
GET    /api/tests                  [auth]
POST   /api/tests                  [admin] — auto-advances student stage on pass
PUT    /api/tests/:id              [admin]
DELETE /api/tests/:id              [admin]
```

### Payments
```
GET    /api/payments               [auth]
GET    /api/payments/summary       [admin]
POST   /api/payments               [admin]
PUT    /api/payments/:id           [admin]
DELETE /api/payments/:id           [admin]
```

### Admin
```
GET /api/admin/dashboard           [admin]
GET /api/admin/lesson-types        [auth]
PUT /api/admin/lesson-types/:id    [admin]
GET /api/admin/teachers            [auth]
PUT /api/admin/teachers/:id        [admin]
DELETE /api/admin/teachers/:id     [admin]
GET /api/admin/teacher/:id/schedule[auth]
```

---

## Progression Logic

The core business rule is enforced in `backend/src/utils/progression.js`:

```
Theory → Driving → Parking → Completed
```

1. **Enrollment check** (`canEnrollInStage`): Before a student is enrolled in a class, the system checks if their `current_stage` allows it. A student at `theory` stage cannot be enrolled in a `driving` or `parking` class.

2. **Test pass → auto-advance** (`advanceStudentStage`): When a test is recorded with `result = "pass"`, and the student's `current_stage` matches the test's lesson type, their stage is automatically updated to the next one.

3. **Multiple attempts**: A student can take a test multiple times. Each attempt is stored with an `attempt_number`. The student must take more classes before retrying (enforced by convention; you can add a minimum-classes rule in `progression.js`).

---

## Cost Calculation

For each student, `getStudentFinancials()` computes:

```
Per lesson type:
  classTotal = SUM(cost_override ?? lesson_type.class_cost) for attended classes
  testTotal  = SUM(test.cost) for all test attempts

totalOwed = sum of all perType totals
totalPaid = SUM(payments.amount)
balance   = totalPaid - totalOwed  (negative = student owes money)
```

---

## Environment Variables

Backend `.env` (optional, defaults shown):
```
PORT=3001
JWT_SECRET=drivepro_secret_2024
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## Production Build

```bash
# Build frontend
cd frontend && npm run build
# Output: frontend/dist/

# Serve static files from Express (add to server.js):
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../../frontend/dist/index.html')));

# Run backend
NODE_ENV=production npm start --prefix backend
```
