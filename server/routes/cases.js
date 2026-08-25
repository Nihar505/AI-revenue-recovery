import { Router } from 'express';
import { getDb } from '../db/schema.js';

export const casesRouter = Router();

// GET /api/cases — list all recovery cases with payment + customer info
casesRouter.get('/', (req, res) => {
  try {
    const db = getDb();
    const { status, q = '', limit, offset } = req.query;
    let safeLimit = 50;
    let safeOffset = 0;

    if (limit !== undefined) {
      const trimmed = String(limit).trim();
      if (!/^\d+$/.test(trimmed)) {
        return res.status(400).json({ error: 'Invalid limit parameter. Must be a positive integer.' });
      }
      const parsed = parseInt(trimmed, 10);
      if (parsed < 1 || parsed > 100) {
        return res.status(400).json({ error: 'Limit must be between 1 and 100.' });
      }
      safeLimit = parsed;
    }

    if (offset !== undefined) {
      const trimmed = String(offset).trim();
      if (!/^\d+$/.test(trimmed)) {
        return res.status(400).json({ error: 'Invalid offset parameter. Must be a non-negative integer.' });
      }
      const parsed = parseInt(trimmed, 10);
      if (parsed < 0) {
        return res.status(400).json({ error: 'Offset must be non-negative.' });
      }
      safeOffset = parsed;
    }

    const searchTerm = String(q).trim().slice(0, 100);

    let query = `
      SELECT
        rc.id, rc.payment_id, rc.recovery_score, rc.risk_score,
        rc.root_cause, rc.recommended_action, rc.confidence,
        rc.status, rc.created_at,
        p.amount, p.currency, p.status as payment_status,
        p.failure_reason, p.payment_method, p.retry_count,
        c.name as customer_name, c.email as customer_email,
        c.lifetime_value, c.successful_payments, c.failed_payments,
        MAX(ro.recovered_amount) as recovered_amount, ro.outcome
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      JOIN customers c ON c.id = p.customer_id
      LEFT JOIN recovery_outcomes ro ON ro.case_id = rc.id
    `;
    const filters = [];
    const params = [];
    if (status) {
      filters.push('rc.status = ?');
      params.push(status);
    }
    if (searchTerm) {
      const searchValue = `%${searchTerm}%`;
      filters.push(`(
        rc.id LIKE ? OR p.id LIKE ? OR c.name LIKE ? OR c.email LIKE ?
        OR p.failure_reason LIKE ? OR rc.root_cause LIKE ?
      )`);
      params.push(searchValue, searchValue, searchValue, searchValue, searchValue, searchValue);
    }
    if (filters.length) query += ` WHERE ${filters.join(' AND ')}`;
    query += ' GROUP BY rc.id ORDER BY rc.created_at DESC LIMIT ? OFFSET ?';
    params.push(safeLimit, safeOffset);

    const cases = db.prepare(query).all(...params);
    let countQuery = `
      SELECT COUNT(*) as count
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      JOIN customers c ON c.id = p.customer_id
    `;
    if (filters.length) countQuery += ` WHERE ${filters.join(' AND ')}`;
    const total = db.prepare(countQuery).get(...params.slice(0, -2));

    res.json({ cases, total: total.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cases/:id — full case detail with agent timeline
casesRouter.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const caseData = db.prepare(`
      SELECT rc.*, p.*, c.name as customer_name, c.email as customer_email,
             c.lifetime_value, c.successful_payments, c.failed_payments
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      JOIN customers c ON c.id = p.customer_id
      WHERE rc.id = ?
    `).get(id);

    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const actions = db.prepare(
      'SELECT * FROM agent_actions WHERE case_id = ? ORDER BY created_at ASC'
    ).all(id);

    const outcome = db.prepare(
      'SELECT * FROM recovery_outcomes WHERE case_id = ?'
    ).get(id);

    const paymentHistory = db.prepare(`
      SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(caseData.customer_id);

    res.json({ case: caseData, actions, outcome, paymentHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
