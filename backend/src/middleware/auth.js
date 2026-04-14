// src/middleware/auth.js
// Unchanged in logic; works with MongoDB ObjectId strings in the JWT payload.

const jwt    = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'drivepro_secret_2024';

/**
 * Verifies the Bearer JWT and attaches its payload to req.user.
 * req.user.id is the MongoDB _id string of the logged-in user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });

  try {
    req.user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Restricts route to admin role only.
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}

/**
 * Admin OR the teacher themselves.
 */
function requireAdminOrSelf(req, res, next) {
  requireAuth(req, res, () => {
    const targetId = req.params.teacherId || req.params.id;
    if (req.user.role === 'admin' || req.user.id === targetId) return next();
    return res.status(403).json({ error: 'Access denied' });
  });
}

module.exports = { requireAuth, requireAdmin, requireAdminOrSelf, SECRET };
