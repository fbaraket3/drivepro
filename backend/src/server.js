// src/server.js

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./db/connection');

// ── Connect to MongoDB before starting the HTTP server ────────────────────────
connectDB().then(startServer);

function startServer() {
  const app  = express();
  const PORT = process.env.PORT || 3001;

  // ── Middleware ──────────────────────────────────────────────────────────────
  app.use(cors({
    origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json());

  if (process.env.NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  // ── Routes ──────────────────────────────────────────────────────────────────
  app.use('/api/auth',     require('./routes/auth'));
  app.use('/api/students', require('./routes/students'));
  app.use('/api/classes',  require('./routes/classes'));
  app.use('/api/tests',    require('./routes/tests'));
  app.use('/api/payments', require('./routes/payments'));
  app.use('/api/admin',    require('./routes/admin'));

  // Health check — also confirms DB connectivity
  app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', ts: new Date().toISOString() })
  );

  // ── Global error handler ────────────────────────────────────────────────────
  // Catches any error thrown or passed to next() from route handlers
  app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  app.listen(PORT, "0.0.0.0", () => {
  console.log(`DrivePro API running -> http://localhost:${PORT}`);
  console.log('  Admin:   admin@drivepro.tn  / admin123');
  console.log('  Teacher: sami@drivepro.tn   / teacher123');
});
}
