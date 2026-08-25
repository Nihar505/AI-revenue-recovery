import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'recoverai_secret_2026';

/**
 * Middleware: verify JWT token from Authorization header.
 * Attaches { id, email, name } to req.user on success.
 */
export function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

export { JWT_SECRET };
