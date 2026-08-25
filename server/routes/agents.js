import { Router } from 'express';
import { getDb } from '../db/schema.js';

export const agentsRouter = Router();

// GET /api/agents/actions — recent agent actions for live feed
agentsRouter.get('/actions', (req, res) => {
  try {
    const db = getDb();
    const { limit = 100 } = req.query;

    const actions = db.prepare(`
      SELECT aa.*, rc.payment_id, p.amount, p.currency, c.name as customer_name
      FROM agent_actions aa
      JOIN recovery_cases rc ON rc.id = aa.case_id
      JOIN payments p ON p.id = rc.payment_id
      JOIN customers c ON c.id = p.customer_id
      ORDER BY aa.created_at DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json({ actions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
