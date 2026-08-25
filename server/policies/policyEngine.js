import { getDb } from '../db/schema.js';

/**
 * Policy & Safety Engine for Autonomous Recovery
 * Enforces hard deterministic boundary checks before any execution happens.
 */
export class PolicyEngine {
  constructor() {
    this.cachedPolicy = null;
  }

  getPolicy() {
    const db = getDb();
    const row = db.prepare('SELECT * FROM merchant_policies WHERE id = 1').get();
    if (!row) {
      return {
        max_auto_retry_amount: 5000,
        max_retry_count: 2,
        require_approval_above: 10000,
        allowed_actions: ['RETRY_PAYMENT', 'SEND_REMINDER', 'OFFER_ALTERNATIVE_METHOD', 'DO_NOTHING']
      };
    }
    return {
      ...row,
      allowed_actions: typeof row.allowed_actions === 'string' ? JSON.parse(row.allowed_actions) : row.allowed_actions
    };
  }

  /**
   * Evaluate proposed AI action against merchant safety rules
   * @param {Object} context { amount, retryCount, recommendedAction, customerLtv, failureReason }
   */
  evaluateAction({ amount, retryCount, recommendedAction }) {
    const policy = this.getPolicy();
    const allowedActions = policy.allowed_actions || [];

    // Rule 1: DO_NOTHING is always safe and allowed
    if (recommendedAction === 'DO_NOTHING') {
      return {
        allowed: true,
        policyResult: 'APPROVED',
        reason: 'DO_NOTHING complies with non-intervention safety rules.',
        finalAction: 'DO_NOTHING'
      };
    }

    // Rule 2: Escalations require no payment execution, always safe to create ticket
    if (recommendedAction === 'ESCALATE') {
      return {
        allowed: true,
        policyResult: 'APPROVED',
        reason: 'Human escalation complies with safety policy.',
        finalAction: 'ESCALATE'
      };
    }

    // Rule 3: High Value Approval Threshold (> require_approval_above e.g. ₹10,000)
    if (amount > policy.require_approval_above) {
      return {
        allowed: false,
        policyResult: 'BLOCKED',
        reason: `Transaction amount (₹${amount.toLocaleString('en-IN')}) exceeds autonomous threshold (₹${policy.require_approval_above.toLocaleString('en-IN')}). Policy requires human escalation.`,
        finalAction: 'ESCALATE'
      };
    }

    // Rule 4: Action whitelist check
    if (!allowedActions.includes(recommendedAction)) {
      return {
        allowed: false,
        policyResult: 'BLOCKED',
        reason: `Action '${recommendedAction}' is disabled by merchant configuration.`,
        finalAction: 'ESCALATE'
      };
    }

    // Rule 5: RETRY_PAYMENT specific checks (max amount and max retries)
    if (recommendedAction === 'RETRY_PAYMENT') {
      if (amount > policy.max_auto_retry_amount) {
        return {
          allowed: false,
          policyResult: 'BLOCKED',
          reason: `Retry amount (₹${amount.toLocaleString('en-IN')}) exceeds max automatic retry limit (₹${policy.max_auto_retry_amount.toLocaleString('en-IN')}). Escalating.`,
          finalAction: 'ESCALATE'
        };
      }

      if (retryCount >= policy.max_retry_count) {
        return {
          allowed: false,
          policyResult: 'BLOCKED',
          reason: `Transaction retry count (${retryCount}) reached maximum allowable retries (${policy.max_retry_count}). Modified to reminder.`,
          finalAction: 'SEND_REMINDER'
        };
      }
    }

    // Passed all safety gates
    return {
      allowed: true,
      policyResult: 'APPROVED',
      reason: `Action '${recommendedAction}' meets all safety constraints (Amount: ₹${amount.toLocaleString('en-IN')}, Retries: ${retryCount}).`,
      finalAction: recommendedAction
    };
  }
}

export const policyEngine = new PolicyEngine();
