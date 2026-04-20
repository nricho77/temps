const jwt = require('jsonwebtoken');

function authMiddleware(context, req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: true, status: 401, message: 'Token manquant ou invalide.' };
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { error: false, user: decoded };
  } catch (err) {
    return { error: true, status: 401, message: 'Token expiré ou invalide.' };
  }
}

function requireRole(context, req, ...roles) {
  const auth = authMiddleware(context, req);
  if (auth.error) return auth;
  if (!roles.includes(auth.user.role)) {
    return { error: true, status: 403, message: 'Accès refusé.' };
  }
  return auth;
}

function respond(context, status, body) {
  context.res = { status, body, headers: { 'Content-Type': 'application/json' } };
}

module.exports = { authMiddleware, requireRole, respond };
