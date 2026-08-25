import { Router } from 'express';
import { getDb } from '../db/schema.js';

export const policiesRouter = Router();

// GET /api/policies
policiesRouter.get('/', (req, res) => {
  try {
    const db = getDb();
    const policy = db.prepare('SELECT * FROM merchant_policies WHERE id = 1').get();
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    policy.allowed_actions = JSON.parse(policy.allowed_actions);
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/policies
policiesRouter.put('/', (req, res) => {
  try {
    const db = getDb();
    const { max_auto_retry_amount, max_retry_count, require_approval_above, allowed_actions } = req.body;

    // Validate types
    const validNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
    const validActions = ['RETRY_PAYMENT', 'SEND_REMINDER', 'OFFER_ALTERNATIVE_METHOD', 'DO_NOTHING'];
    const actionsAreValid = Array.isArray(allowed_actions)
      && allowed_actions.every((action) => validActions.includes(action));

    if (!validNumber(max_auto_retry_amount) || !Number.isInteger(max_retry_count) || max_retry_count < 0 || !validNumber(require_approval_above) || !actionsAreValid) {
      return res.status(400).json({ error: 'Invalid policy values' });
    }

    if (max_auto_retry_amount > require_approval_above) {
      return res.status(400).json({ error: 'Auto-retry limit cannot exceed the human approval threshold' });
    }

    db.prepare(`
      UPDATE merchant_policies
      SET max_auto_retry_amount = ?,
          max_retry_count = ?,
          require_approval_above = ?,
          allowed_actions = ?,
          updated_at = datetime('now')
      WHERE id = 1
    `).run(
      max_auto_retry_amount,
      max_retry_count,
      require_approval_above,
      JSON.stringify(allowed_actions)
    );

    const updated = db.prepare('SELECT * FROM merchant_policies WHERE id = 1').get();
    updated.allowed_actions = JSON.parse(updated.allowed_actions);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
