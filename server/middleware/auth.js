import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'recoverai_secret_2026';

/**
 * Middleware: verify JWT token from Authorization header.
 * Attaches { id, email, name } to req.user on success.
 */
export function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  let token = null;

  if (header && header.startsWith('Bearer ')) {
    token = header.slice(7);
  } else if (req.query && typeof req.query.ticket === 'string' && req.query.ticket.trim()) {
    token = req.query.ticket.trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

export { JWT_SECRET };
