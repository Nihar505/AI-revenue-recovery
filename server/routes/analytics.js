import { Router } from 'express';
import { getDb } from '../db/schema.js';
import { runEvaluation } from '../../evaluation/metrics.js';
import { getMode } from '../integrations/razorpay/client.js';

export const analyticsRouter = Router();

// GET /api/analytics/overview — main dashboard metrics
analyticsRouter.get('/overview', (req, res) => {
  try {
    const db = getDb();
    const userId = req.user?.id;

    // Revenue at risk = sum of failed/abandoned payment amounts for logged in user
    const revenueAtRisk = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE user_id = ? AND status IN ('failed', 'abandoned')
    `).get(userId);

    // Total transactions analyzed (payments with a recovery case)
    const analyzed = db.prepare(`
      SELECT COUNT(*) as count
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      WHERE p.user_id = ? AND rc.status != 'pending'
    `).get(userId);

    // Recovery opportunities (score >= 0.5)
    const opportunities = db.prepare(`
      SELECT COUNT(*) as count
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      WHERE p.user_id = ? AND rc.recovery_score >= 0.5
    `).get(userId);

    // Recovered revenue
    const recovered = db.prepare(`
      SELECT COALESCE(SUM(ro.recovered_amount), 0) as total
      FROM recovery_outcomes ro
      JOIN recovery_cases rc ON rc.id = ro.case_id
      JOIN payments p ON p.id = rc.payment_id
      WHERE p.user_id = ? AND ro.outcome = 'recovered'
    `).get(userId);

    // Awaiting payment count & amount (cases where payment link is active)
    const awaitingPayment = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(p.amount), 0) as total
      FROM recovery_outcomes ro
      JOIN recovery_cases rc ON rc.id = ro.case_id
      JOIN payments p ON p.id = rc.payment_id
      WHERE p.user_id = ? AND ro.outcome = 'awaiting_payment'
    `).get(userId);

    // Razorpay webhook verified recoveries
    const razorpayVerified = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(ro.recovered_amount), 0) as total_amount
      FROM recovery_outcomes ro
      JOIN recovery_cases rc ON rc.id = ro.case_id
      JOIN payments p ON p.id = rc.payment_id
      WHERE p.user_id = ? AND ro.outcome = 'recovered' AND ro.outcome_source = 'razorpay_webhook'
    `).get(userId);

    // Simulated Recoveries
    const simulated = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(ro.recovered_amount), 0) as total_amount
      FROM recovery_outcomes ro
      JOIN recovery_cases rc ON rc.id = ro.case_id
      JOIN payments p ON p.id = rc.payment_id
      WHERE p.user_id = ? AND ro.outcome = 'recovered' AND (ro.outcome_source = 'simulation' OR ro.outcome_source IS NULL)
    `).get(userId);

    // Total payments analyzed (all)
    const totalPayments = db.prepare(`
      SELECT COUNT(*) as count FROM payments WHERE user_id = ?
    `).get(userId);

    // Recovery by action
    const byAction = db.prepare(`
      SELECT rc.recommended_action as action, COUNT(*) as count
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      WHERE p.user_id = ? AND rc.recommended_action IS NOT NULL
      GROUP BY rc.recommended_action
    `).all(userId);

    // Revenue by failure reason
    const byFailure = db.prepare(`
      SELECT failure_reason, COALESCE(SUM(amount), 0) as amount
      FROM payments
      WHERE user_id = ? AND status = 'failed' AND failure_reason IS NOT NULL
      GROUP BY failure_reason
    `).all(userId);

    // Recovery trend
    const trend = db.prepare(`
      SELECT date(ro.timestamp) as date,
             COALESCE(SUM(ro.recovered_amount), 0) as recovered
      FROM recovery_outcomes ro
      JOIN recovery_cases rc ON rc.id = ro.case_id
      JOIN payments p ON p.id = rc.payment_id
      WHERE p.user_id = ? AND ro.outcome = 'recovered'
      GROUP BY date(ro.timestamp)
      ORDER BY date ASC
      LIMIT 14
    `).all(userId);

    // Action distribution for cases
    const actionDist = db.prepare(`
      SELECT rc.recommended_action as action,
             COUNT(*) as count,
             COALESCE(SUM(p.amount), 0) as total_amount
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      WHERE p.user_id = ? AND rc.recommended_action IS NOT NULL
      GROUP BY rc.recommended_action
    `).all(userId);

    const recoveryRate =
      revenueAtRisk.total > 0
        ? ((recovered.total / revenueAtRisk.total) * 100).toFixed(1)
        : 0;

    res.json({
      mode: getMode(),
      revenueAtRisk: revenueAtRisk.total,
      expectedRecovery: revenueAtRisk.total * 0.42,
      recoveredRevenue: recovered.total,
      recoveryRate: parseFloat(recoveryRate),
      transactionsAnalyzed: totalPayments.count,
      casesAnalyzed: analyzed.count,
      recoveryOpportunities: opportunities.count,
      awaitingPayment: {
        count: awaitingPayment.count,
        amount: awaitingPayment.total
      },
      verifiedRazorpay: {
        count: razorpayVerified.count,
        amount: razorpayVerified.total_amount
      },
      simulated: {
        count: simulated.count,
        amount: simulated.total_amount
      },
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
