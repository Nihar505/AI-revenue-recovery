import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema.js';

/**
 * AGENT 5 — AUDITOR
 * Immutably logs all agent steps, policy validations, and execution outcomes to create an audit trail.
 */
export async function runAuditor({
  caseId,
  payment,
  detectiveResult,
  analystResult,
  strategistResult,
  policyEvaluation,
  executionResult
}) {
  const db = getDb();
  const timestamp = new Date().toISOString();

  // 1. Log Detective Step
  const detectiveActionId = `act_${uuidv4().substring(0, 10)}`;
  db.prepare(`
    INSERT INTO agent_actions (id, case_id, agent, action, reason, confidence, input_data, policy_result, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    detectiveActionId,
    caseId,
    'Revenue Detective',
    'OPPORTUNITY_ANALYSIS',
    detectiveResult.reason,
    detectiveResult.recoveryScore,
    JSON.stringify({ paymentId: payment.id, amount: payment.amount, ltv: payment.lifetime_value }),
    'PASSED',
    'completed',
    timestamp
  );

  // 2. Log Analyst Step
  const analystActionId = `act_${uuidv4().substring(0, 10)}`;
  db.prepare(`
    INSERT INTO agent_actions (id, case_id, agent, action, reason, confidence, input_data, policy_result, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    analystActionId,
    caseId,
    'Root Cause Analyst',
    analystResult.rootCause,
    analystResult.detailedDiagnosis,
    analystResult.confidence,
    JSON.stringify({ failureReason: payment.failure_reason }),
    'PASSED',
    'completed',
    timestamp
  );

  // 3. Log Strategist Step
  const strategistActionId = `act_${uuidv4().substring(0, 10)}`;
  db.prepare(`
    INSERT INTO agent_actions (id, case_id, agent, action, reason, confidence, input_data, policy_result, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    strategistActionId,
    caseId,
    'Recovery Strategist',
    strategistResult.recommendedAction,
    strategistResult.rationale,
    strategistResult.confidence,
    JSON.stringify({ recommended: strategistResult.recommendedAction }),
    policyEvaluation.policyResult,
    policyEvaluation.allowed ? 'approved' : 'blocked_by_policy',
    timestamp
  );

  // 4. Log Policy Engine Check Step
  const policyActionId = `act_${uuidv4().substring(0, 10)}`;
  db.prepare(`
    INSERT INTO agent_actions (id, case_id, agent, action, reason, confidence, input_data, policy_result, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    policyActionId,
    caseId,
    'Policy / Safety Engine',
    policyEvaluation.finalAction,
    policyEvaluation.reason,
    1.0,
    JSON.stringify({ proposedAction: strategistResult.recommendedAction }),
    policyEvaluation.policyResult,
    'verified',
    timestamp
  );

  // 5. Log Executor Step
  const executorActionId = `act_${uuidv4().substring(0, 10)}`;
  db.prepare(`
    INSERT INTO agent_actions (id, case_id, agent, action, reason, confidence, input_data, policy_result, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    executorActionId,
    caseId,
    'Execution Agent',
    executionResult.actionExecuted,
    executionResult.details,
    1.0,
    JSON.stringify(executionResult.toolResult || {}),
    'EXECUTED',
    executionResult.status,
    timestamp
  );

  // 6. Record Final Recovery Outcome
  const outcomeId = `out_${uuidv4().substring(0, 10)}`;
  const finalOutcome =
    executionResult.recoveredAmount > 0
      ? 'recovered'
      : executionResult.actionExecuted === 'DO_NOTHING'
      ? 'refrained'
      : executionResult.actionExecuted === 'ESCALATE'
      ? 'escalated'
      : 'failed';

  db.prepare(`
    INSERT OR REPLACE INTO recovery_outcomes (id, case_id, action, recovered_amount, outcome, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    outcomeId,
    caseId,
    executionResult.actionExecuted,
    executionResult.recoveredAmount || 0,
    finalOutcome,
    timestamp
  );

  // 7. Update recovery_cases master record
  db.prepare(`
    UPDATE recovery_cases
    SET recovery_score = ?,
        risk_score = ?,
        root_cause = ?,
        recommended_action = ?,
        confidence = ?,
        status = ?
    WHERE id = ?
  `).run(
    detectiveResult.recoveryScore,
    detectiveResult.riskScore,
    analystResult.rootCause,
    executionResult.actionExecuted,
    strategistResult.confidence,
    finalOutcome,
    caseId
  );

  return {
    caseId,
    finalOutcome,
    recoveredAmount: executionResult.recoveredAmount,
    timestamp
  };
}
