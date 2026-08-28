import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/schema.js';
import { JWT_SECRET } from '../middleware/auth.js';
import { runRevenueDetective } from '../agents/detective.js';
import { runRootCauseAnalyst } from '../agents/analyst.js';
import { runRecoveryStrategist } from '../agents/strategist.js';
import { policyEngine } from '../policies/policyEngine.js';
import { runExecutionAgent } from '../agents/executor.js';
import { runAuditor } from '../agents/auditor.js';

export const runRecoveryRouter = Router();

// Store active SSE clients
let sseClients = [];

export function broadcastAgentEvent(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(data);
    } catch (e) {
      // client disconnected
    }
  });
}

// POST /api/run-recovery/stream-ticket — Issue short-lived ticket for browser EventSource
runRecoveryRouter.post('/stream-ticket', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const ticket = jwt.sign(
    { id: req.user.id, email: req.user.email, purpose: 'sse_stream' },
    JWT_SECRET,
    { expiresIn: '60s' }
  );
  res.json({ ticket });
});

// SSE live stream endpoint
runRecoveryRouter.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = uuidv4();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  // Initial welcome event
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Stream Connected to RecoverAI Multi-Agent Pipeline' })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

/**
 * Process a single payment through the 5-agent pipeline
 */
export async function processPaymentEvent(payment, customer, existingCaseId = null) {
  const db = getDb();
  let caseId = existingCaseId;

  if (!caseId) {
    caseId = `case_${uuidv4().substring(0, 10)}`;
    db.prepare(`
      INSERT OR IGNORE INTO recovery_cases (id, payment_id, status, created_at)
      VALUES (?, ?, 'processing', datetime('now'))
    `).run(caseId, payment.id);
  }

  // 1. Detective
  const detectiveResult = await runRevenueDetective(payment, customer);
  broadcastAgentEvent({
    agent: 'Revenue Detective',
    paymentId: payment.id,
    amount: payment.amount,
    status: 'COMPLETED',
    score: detectiveResult.recoveryScore,
    message: `Evaluated ${payment.id} (₹${payment.amount.toLocaleString('en-IN')}) — ${(detectiveResult.recoveryScore * 100).toFixed(0)}% recovery chance. ${detectiveResult.reason}`
  });

  // 2. Analyst
  const analystResult = await runRootCauseAnalyst(payment, detectiveResult);
  broadcastAgentEvent({
    agent: 'Root Cause Analyst',
    paymentId: payment.id,
    amount: payment.amount,
    status: 'DIAGNOSED',
    rootCause: analystResult.rootCause,
    message: `Diagnosed root cause as ${analystResult.rootCause}. ${analystResult.detailedDiagnosis}`
  });

  // 3. Strategist
  const strategistResult = await runRecoveryStrategist(payment, customer, detectiveResult, analystResult);
  broadcastAgentEvent({
    agent: 'Recovery Strategist',
    paymentId: payment.id,
    amount: payment.amount,
    status: 'RECOMMENDED',
    action: strategistResult.recommendedAction,
    message: `Strategy: ${strategistResult.recommendedAction}. ${strategistResult.rationale}`
  });

  // 4. Policy Engine
  const policyEvaluation = policyEngine.evaluateAction({
    amount: payment.amount,
    retryCount: payment.retry_count || 0,
    recommendedAction: strategistResult.recommendedAction
  });

  broadcastAgentEvent({
    agent: 'Policy / Safety Engine',
    paymentId: payment.id,
    amount: payment.amount,
    status: policyEvaluation.policyResult,
    message: policyEvaluation.allowed
      ? `Action '${strategistResult.recommendedAction}' APPROVED under active merchant policy.`
      : `Action BLOCKED by policy: ${policyEvaluation.reason}`
  });

  // 5. Execution Agent
  const executionResult = await runExecutionAgent({
    payment,
    customer,
    recommendedAction: strategistResult.recommendedAction,
    policyEvaluation,
    rationale: strategistResult.rationale
  });

  broadcastAgentEvent({
    agent: 'Execution Agent',
    paymentId: payment.id,
    amount: payment.amount,
    status: executionResult.status,
    recoveredAmount: executionResult.recoveredAmount,
    message: executionResult.details
  });

  // 6. Auditor Agent
  const auditLog = await runAuditor({
    caseId,
    payment,
    detectiveResult,
    analystResult,
    strategistResult,
    policyEvaluation,
    executionResult
  });

  broadcastAgentEvent({
    agent: 'Auditor',
    paymentId: payment.id,
    amount: payment.amount,
    status: 'RECORDED',
    outcome: auditLog.finalOutcome,
    recoveredAmount: auditLog.recoveredAmount,
    message: `Case ${caseId} sealed. Outcome: ${auditLog.finalOutcome.toUpperCase()}. ${auditLog.recoveredAmount > 0 ? `₹${auditLog.recoveredAmount.toLocaleString('en-IN')} recovered.` : 'No charge taken.'}`
  });

  return {
    caseId,
    detectiveResult,
    analystResult,
    strategistResult,
    policyEvaluation,
    executionResult,
    auditLog
  };
}

// POST /api/run-recovery/batch — Run autonomous recovery on batch of transactions
runRecoveryRouter.post('/batch', async (req, res) => {
  try {
    const db = getDb();
    const { limit } = req.body || {};
    let safeLimit = 15;

    if (limit !== undefined) {
      if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 50) {
        return res.status(400).json({ error: 'Invalid limit parameter. Must be an integer between 1 and 50.' });
      }
      safeLimit = limit;
    }

    const userId = req.user?.id;
    // Only process unresolved cases. Marking them first prevents overlapping runs
    // from executing recovery actions twice for the same payment.
    const pendingCases = db.prepare(`
      SELECT rc.id as case_id, p.*, c.name, c.email, c.lifetime_value, c.successful_payments, c.failed_payments
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      JOIN customers c ON c.id = p.customer_id
      WHERE rc.status = 'pending' AND p.user_id = ?
      ORDER BY rc.created_at ASC
      LIMIT ?
    `).all(userId, safeLimit);
    const markProcessing = db.prepare(`
      UPDATE recovery_cases SET status = 'processing'
      WHERE id = ? AND status = 'pending'
    `);
    const payments = pendingCases.filter((payment) => markProcessing.run(payment.case_id).changes === 1);

    if (payments.length === 0) {
      return res.json({
        status: 'idle',
        message: 'No pending recovery cases are waiting for review.',
        count: 0,
      });
    }

    res.json({
      status: 'started',
      message: `Started a safety-checked recovery run on ${payments.length} pending payment${payments.length === 1 ? '' : 's'}.`,
      count: payments.length,
    });

    (async () => {
      let recoveredTotal = 0;
      for (const p of payments) {
        try {
          const result = await processPaymentEvent(p, {
            id: p.customer_id,
            name: p.name,
            email: p.email,
            lifetime_value: p.lifetime_value,
            successful_payments: p.successful_payments,
            failed_payments: p.failed_payments,
          }, p.case_id);
          recoveredTotal += result.executionResult.recoveredAmount || 0;
        } catch (err) {
          db.prepare("UPDATE recovery_cases SET status = 'pending' WHERE id = ? AND status = 'processing'").run(p.case_id);
          console.error(`Error processing payment ${p.id}:`, err);
        }
      }

      broadcastAgentEvent({
        agent: 'System',
        status: 'BATCH_COMPLETE',
        recoveredTotal,
        message: `Recovery run completed. Recovered total: ₹${recoveredTotal.toLocaleString('en-IN')}`,
      });

      // ─── Demo account: auto-replenish pending queue ───────────────────
      // When the demo account's pending cases run low, silently recycle
      // oldest resolved/recovered cases back to pending so the queue never
      // runs dry. This is ONLY triggered for the dedicated demo account.
      const DEMO_USER_ID = 'usr_demo_account';
      const REPLENISH_THRESHOLD = 25; // replenish when fewer than this remain
      const REPLENISH_BATCH = 60;     // recycle this many cases at once

      if (userId === DEMO_USER_ID) {
        try {
          const { pendingCount } = db.prepare(`
            SELECT COUNT(*) as pendingCount
            FROM recovery_cases rc
            JOIN payments p ON p.id = rc.payment_id
            WHERE rc.status = 'pending' AND p.user_id = ?
          `).get(DEMO_USER_ID);

          if (pendingCount < REPLENISH_THRESHOLD) {
            // Pick oldest resolved/failed/escalated cases to recycle
            const toRecycle = db.prepare(`
              SELECT rc.id as case_id
              FROM recovery_cases rc
              JOIN payments p ON p.id = rc.payment_id
              WHERE p.user_id = ? AND rc.status IN ('resolved', 'failed', 'escalated', 'recovered')
              ORDER BY rc.created_at ASC
              LIMIT ?
            `).all(DEMO_USER_ID, REPLENISH_BATCH);

            if (toRecycle.length > 0) {
              const ids = toRecycle.map(r => r.case_id);
              const placeholders = ids.map(() => '?').join(',');

              // Remove outcomes and live agent actions for these cases
              db.prepare(`DELETE FROM recovery_outcomes WHERE case_id IN (${placeholders})`).run(...ids);
              db.prepare(`
                DELETE FROM agent_actions
                WHERE case_id IN (${placeholders})
                AND id NOT LIKE 'act_demo_%'
              `).run(...ids);

              // Reset cases to pending
              db.prepare(`
                UPDATE recovery_cases
                SET status = 'pending'
                WHERE id IN (${placeholders})
              `).run(...ids);

              console.log(`[Demo Replenish] Recycled ${ids.length} cases back to pending (had ${pendingCount} left).`);
            }
          }
        } catch (replenishErr) {
          // Non-critical — log but don't crash
          console.error('[Demo Replenish] Error during replenish:', replenishErr.message);
        }
      }
      // ─────────────────────────────────────────────────────────────────

    })();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/run-recovery/case/:caseId — Run one unresolved case through the pipeline
runRecoveryRouter.post('/case/:caseId', async (req, res) => {
  try {
    const db = getDb();
    const { caseId } = req.params;
    const userId = req.user?.id;

    const row = db.prepare(`
      SELECT rc.id as case_id, rc.status as case_status, p.*, c.name, c.email, c.lifetime_value, c.successful_payments, c.failed_payments
      FROM payments p
      JOIN recovery_cases rc ON rc.payment_id = p.id
      JOIN customers c ON c.id = p.customer_id
      WHERE rc.id = ? AND p.user_id = ?
    `).get(caseId, userId);

    if (!row) return res.status(404).json({ error: 'Case not found' });
    if (row.case_status !== 'pending') {
      return res.status(409).json({ error: `This case is already ${row.case_status}. Only pending cases can be run.` });
    }

    const claimed = db.prepare("UPDATE recovery_cases SET status = 'processing' WHERE id = ? AND status = 'pending'").run(caseId);
    if (!claimed.changes) return res.status(409).json({ error: 'This case is already being processed.' });

    let result;
    try {
      result = await processPaymentEvent(row, {
        id: row.customer_id,
        name: row.name,
        email: row.email,
        lifetime_value: row.lifetime_value,
        successful_payments: row.successful_payments,
        failed_payments: row.failed_payments,
      }, caseId);
    } catch (processingError) {
      db.prepare("UPDATE recovery_cases SET status = 'pending' WHERE id = ? AND status = 'processing'").run(caseId);
      throw processingError;
    }

    res.json({ status: 'completed', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
