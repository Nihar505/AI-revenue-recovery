import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema.js';

/**
 * AGENT 5 — AUDITOR
 * ---
 * Immutably logs all agent steps, policy validations, and execution outcomes.
 *
 * KEY CHANGE: Now handles two distinct execution paths:
 *
 * 1. SIMULATION mode: outcome is determined by the provider and recorded immediately
 *    (may be 'recovered', 'refrained', 'escalated', 'failed')
 *
 * 2. RAZORPAY TEST mode: outcome = 'awaiting_payment' when a payment link was created.
 *    The payment is NOT marked captured here. That happens in the webhook handler
 *    when Razorpay independently confirms the payment.
 *
 * This makes EXECUTED ≠ RECOVERED explicit in the data model.
 */
export async function runAuditor({
  caseId,
  payment,
  detectiveResult,
  analystResult,
  strategistResult,
  policyEvaluation,
  executionResult,
}) {
  const db        = getDb();
  const timestamp = new Date().toISOString();

  const mode          = executionResult.mode          || 'simulation';
  const outcomeSource = executionResult.outcome_source || 'simulation';
  const isAwaiting    = executionResult.status === 'AWAITING_PAYMENT';

  // Determine final outcome
  const finalOutcome = (() => {
    if (isAwaiting)                              return 'awaiting_payment';
    if (executionResult.recoveredAmount > 0)     return 'recovered';
    if (executionResult.actionExecuted === 'DO_NOTHING') return 'refrained';
    if (executionResult.status === 'ESCALATED')  return 'escalated';
    if (executionResult.status === 'FAILED')     return 'failed';
    return 'failed';
  })();

  const saveAuditTransaction = db.transaction(() => {
    // 1. Log Detective Step
    db.prepare(`
      INSERT INTO agent_actions (id, case_id, agent, action, reason, confidence, input_data, policy_result, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `act_${uuidv4().substring(0, 10)}`,
      caseId,
      'Revenue Detective',
      'OPPORTUNITY_ANALYSIS',
      detectiveResult.reason,
      detectiveResult.recoveryScore,
      JSON.stringify({ paymentId: payment.id, amount: payment.amount, ltv: payment.lifetime_value }),
      'PASSED',
      'completed',
      timestamp,
    );

    // 2. Log Analyst Step
    db.prepare(`
      INSERT INTO agent_actions (id, case_id, agent, action, reason, confidence, input_data, policy_result, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `act_${uuidv4().substring(0, 10)}`,
      caseId,
      'Root Cause Analyst',
      analystResult.rootCause,
      analystResult.detailedDiagnosis,
      analystResult.confidence,
      JSON.stringify({ failureReason: payment.failure_reason }),
      'PASSED',
      'completed',
      timestamp,
    );

    // 3. Log Strategist Step
    db.prepare(`
      INSERT INTO agent_actions (id, case_id, agent, action, reason, confidence, input_data, policy_result, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `act_${uuidv4().substring(0, 10)}`,
      caseId,
      'Recovery Strategist',
      strategistResult.recommendedAction,
      strategistResult.rationale,
      strategistResult.confidence,
      JSON.stringify({ recommended: strategistResult.recommendedAction }),
      policyEvaluation.policyResult,
      policyEvaluation.allowed ? 'approved' : 'blocked_by_policy',
      timestamp,
    );

    // 4. Log Policy Engine Step
    db.prepare(`
      INSERT INTO agent_actions (id, case_id, agent, action, reason, confidence, input_data, policy_result, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `act_${uuidv4().substring(0, 10)}`,
      caseId,
      'Policy / Safety Engine',
      policyEvaluation.finalAction,
      policyEvaluation.reason,
      1.0,
      JSON.stringify({ proposedAction: strategistResult.recommendedAction }),
      policyEvaluation.policyResult,
      'verified',
      timestamp,
    );

    // 5. Log Executor Step — include mode and payment link details if available
    const executorInputData = {
      ...(executionResult.toolResult || {}),
      mode,
      outcome_source: outcomeSource,
      ...(executionResult.providerPaymentLinkId
        ? {
            razorpay_payment_link_id:  executionResult.providerPaymentLinkId,
            razorpay_payment_link_url: executionResult.providerPaymentLinkUrl,
          }
        : {}),
    };
    db.prepare(`
      INSERT INTO agent_actions (id, case_id, agent, action, reason, confidence, input_data, policy_result, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `act_${uuidv4().substring(0, 10)}`,
      caseId,
      'Execution Agent',
      executionResult.actionExecuted,
      executionResult.details,
      1.0,
      JSON.stringify(executorInputData),
      'EXECUTED',
      executionResult.status,
      timestamp,
    );

    // 6. Record Final Recovery Outcome
    db.prepare(`
      INSERT OR REPLACE INTO recovery_outcomes (id, case_id, action, recovered_amount, outcome, outcome_source, provider_payment_link_id, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `out_${uuidv4().substring(0, 10)}`,
      caseId,
      executionResult.actionExecuted,
      executionResult.recoveredAmount || 0,
      finalOutcome,
      outcomeSource,
      executionResult.providerPaymentLinkId || null,
      timestamp,
    );

    // 7. Update recovery_cases master record — include provider and link ID
    db.prepare(`
      UPDATE recovery_cases
      SET recovery_score = ?,
          risk_score = ?,
          root_cause = ?,
          recommended_action = ?,
          confidence = ?,
          status = ?,
          provider = ?,
          provider_payment_link_id = ?
      WHERE id = ?
    `).run(
      detectiveResult.recoveryScore,
      detectiveResult.riskScore,
      analystResult.rootCause,
      executionResult.actionExecuted,
      strategistResult.confidence,
      finalOutcome,
      mode,
      executionResult.providerPaymentLinkId || null,
      caseId,
    );

    // 8. Synchronize payment/customer only for SIMULATION-confirmed recoveries.
    //    In Razorpay mode, payment is captured by the webhook handler, not here.
    if (finalOutcome === 'recovered' && outcomeSource === 'simulation' && executionResult.recoveredAmount > 0) {
      const currentPayment = db.prepare('SELECT status, customer_id FROM payments WHERE id = ?').get(payment.id);
      if (currentPayment && currentPayment.status !== 'captured') {
        db.prepare(`UPDATE payments SET status = 'captured' WHERE id = ?`).run(payment.id);

        const customerId = currentPayment.customer_id || payment.customer_id;
        if (customerId) {
          db.prepare(`
            UPDATE customers
            SET lifetime_value = lifetime_value + ?,
                successful_payments = successful_payments + 1,
                last_payment_at = ?
            WHERE id = ?
          `).run(executionResult.recoveredAmount, timestamp, customerId);
        }
      }
    }
  });

  saveAuditTransaction();

  return {
    caseId,
    finalOutcome,
    recoveredAmount:        executionResult.recoveredAmount,
    mode,
    providerPaymentLinkId:  executionResult.providerPaymentLinkId || null,
    providerPaymentLinkUrl: executionResult.providerPaymentLinkUrl || null,
    timestamp,
  };
}
