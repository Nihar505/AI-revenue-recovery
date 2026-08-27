import { Router } from 'express';
import { getDb } from '../db/schema.js';

export const agentsRouter = Router();

// GET /api/agents/actions — recent agent actions for live feed
agentsRouter.get('/actions', (req, res) => {
  try {
    const db = getDb();
    const { limit } = req.query;
    let safeLimit = 100;

    if (limit !== undefined) {
      const trimmed = String(limit).trim();
      if (!/^\d+$/.test(trimmed)) {
        return res.status(400).json({ error: 'Invalid limit parameter. Must be a positive integer.' });
      }
      const parsed = parseInt(trimmed, 10);
      if (parsed < 1 || parsed > 500) {
        return res.status(400).json({ error: 'Limit must be between 1 and 500.' });
      }
      safeLimit = parsed;
    }

    const userId = req.user?.id;
    const actions = db.prepare(`
      SELECT aa.*, rc.payment_id, p.amount, p.currency, c.name as customer_name
      FROM agent_actions aa
      JOIN recovery_cases rc ON rc.id = aa.case_id
      JOIN payments p ON p.id = rc.payment_id
      JOIN customers c ON c.id = p.customer_id
      WHERE p.user_id = ?
      ORDER BY aa.created_at DESC
      LIMIT ?
    `).all(userId, safeLimit);

    res.json({ actions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
