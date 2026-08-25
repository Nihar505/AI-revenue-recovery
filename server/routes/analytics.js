import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { runEvaluation } from '../../evaluation/metrics.js';

export const analyticsRouter = Router();

// GET /api/analytics/overview — main dashboard metrics
analyticsRouter.get('/overview', (req, res) => {
  try {
    const db = getDb();

    // Revenue at risk = sum of failed/abandoned payment amounts
    const revenueAtRisk = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE status IN ('failed', 'abandoned')
    `).get();

    // Total transactions analyzed (payments with a recovery case)
    const analyzed = db.prepare(`
      SELECT COUNT(*) as count FROM recovery_cases WHERE status != 'pending'
    `).get();

    // Recovery opportunities (score >= 0.6)
    const opportunities = db.prepare(`
      SELECT COUNT(*) as count FROM recovery_cases WHERE recovery_score >= 0.5
    `).get();

    // Recovered revenue
    const recovered = db.prepare(`
      SELECT COALESCE(SUM(recovered_amount), 0) as total FROM recovery_outcomes WHERE outcome = 'recovered'
    `).get();

    // Total payments analyzed (all)
    const totalPayments = db.prepare('SELECT COUNT(*) as count FROM payments').get();

    // Recovery by action
    const byAction = db.prepare(`
      SELECT recommended_action as action, COUNT(*) as count
      FROM recovery_cases
      WHERE recommended_action IS NOT NULL
      GROUP BY recommended_action
    `).all();

    // Revenue by failure reason
    const byFailure = db.prepare(`
      SELECT failure_reason, COALESCE(SUM(amount), 0) as amount
      FROM payments
      WHERE status = 'failed' AND failure_reason IS NOT NULL
      GROUP BY failure_reason
    `).all();

    // Recovery trend
    const trend = db.prepare(`
      SELECT date(ro.timestamp) as date,
             COALESCE(SUM(ro.recovered_amount), 0) as recovered
      FROM recovery_outcomes ro
      WHERE ro.outcome = 'recovered'
      GROUP BY date(ro.timestamp)
      ORDER BY date ASC
      LIMIT 14
    `).all();

    // Action distribution for cases
    const actionDist = db.prepare(`
      SELECT recommended_action as action,
             COUNT(*) as count,
             COALESCE(SUM(p.amount), 0) as total_amount
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      WHERE recommended_action IS NOT NULL
      GROUP BY recommended_action
    `).all();

    const recoveryRate =
      revenueAtRisk.total > 0
        ? ((recovered.total / revenueAtRisk.total) * 100).toFixed(1)
        : 0;

    res.json({
      revenueAtRisk: revenueAtRisk.total,
      expectedRecovery: revenueAtRisk.total * 0.42,
      recoveredRevenue: recovered.total,
      recoveryRate: parseFloat(recoveryRate),
      transactionsAnalyzed: totalPayments.count,
      casesAnalyzed: analyzed.count,
      recoveryOpportunities: opportunities.count,
      charts: {
        byAction,
        byFailure,
        trend,
        actionDist,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/evaluation — Run & return live evaluation benchmark
analyticsRouter.get('/evaluation', async (req, res) => {
  try {
    const { sampleSize } = req.query;
    let parsedSampleSize = 100;

    if (sampleSize !== undefined) {
      const trimmed = String(sampleSize).trim();
      if (!/^\d+$/.test(trimmed)) {
        return res.status(400).json({ error: 'Invalid sampleSize parameter. Must be a positive integer.' });
      }
      const parsed = parseInt(trimmed, 10);
      if (parsed < 1 || parsed > 1000) {
        return res.status(400).json({ error: 'sampleSize must be between 1 and 1000.' });
      }
      parsedSampleSize = parsed;
    }

    const report = await runEvaluation(parsedSampleSize);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
