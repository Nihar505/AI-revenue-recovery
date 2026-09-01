import { createRecoveryPaymentLink } from '../integrations/razorpay/paymentLinks.js';

/**
 * RAZORPAY PROVIDER — Test Mode
 * ---
 * Executes real recovery actions via the Razorpay API.
 *
 * Critical: this provider NEVER produces `outcome = 'recovered'` directly.
 * The only legitimate recovered outcome in Razorpay mode is produced by
 * the verified webhook handler (POST /api/webhooks/razorpay).
 *
 * For financial actions (SEND_REMINDER / RETRY_PAYMENT / OFFER_ALTERNATIVE_METHOD):
 *   → Creates a real Razorpay Payment Link
 *   → Returns status = 'AWAITING_PAYMENT'
 *   → recoveredAmount = 0  (payment not yet confirmed)
 *
 * For non-financial actions (ESCALATE / DO_NOTHING):
 *   → Delegated as-is, no Razorpay API call
 */
export class RazorpayProvider {
  get mode() { return 'razorpay_test'; }

  /**
   * @param {Object} opts
   * @param {string}  opts.caseId
   * @param {Object}  opts.payment
   * @param {Object}  opts.customer
   * @param {string}  opts.action
   * @param {Object}  opts.policyEvaluation
   * @param {string}  opts.rationale
   * @returns {Promise<{mode, outcome_source, status, actionExecuted, recoveredAmount, details, toolResult, providerPaymentLinkId, providerPaymentLinkUrl}>}
   */
  async execute({ caseId, payment, customer, action, policyEvaluation, rationale }) {
    const { amount } = payment;

    // DO_NOTHING — safe non-action, no Razorpay API call
    if (action === 'DO_NOTHING') {
      return {
        mode: 'razorpay_test',
        outcome_source: 'razorpay_test',
        status: 'REFRAINED',
        actionExecuted: 'DO_NOTHING',
        toolResult: { message: 'Autonomous non-intervention — policy-bounded safe refrain.' },
        recoveredAmount: 0,
        details: 'Action intentionally refrained per AI strategy and merchant policy.',
      };
    }

    // ESCALATE — non-financial, no Razorpay API call
    if (action === 'ESCALATE') {
      return {
        mode: 'razorpay_test',
        outcome_source: 'razorpay_test',
        status: 'ESCALATED',
        actionExecuted: 'ESCALATE',
        toolResult: {
          reason: policyEvaluation.allowed ? rationale : policyEvaluation.reason,
          priority: amount > 15000 ? 'URGENT' : 'HIGH',
          note: 'Escalated to human review — no automated payment action taken.',
        },
        recoveredAmount: 0,
        details: `Escalated to Revenue Operations for human review. No money action executed by AI.`,
      };
    }

    // Financial actions → create a real Razorpay Payment Link
    if (
      action === 'SEND_REMINDER'             ||
      action === 'RETRY_PAYMENT'             ||
      action === 'OFFER_ALTERNATIVE_METHOD'
    ) {
      try {
        const { linkId, linkUrl, referenceId } = await createRecoveryPaymentLink({
          caseId,
          payment,
          customer,
          action,
        });

        return {
          mode: 'razorpay_test',
          outcome_source: 'razorpay_test',
          status: 'AWAITING_PAYMENT',
          actionExecuted: action,
          providerPaymentLinkId:  linkId,
          providerPaymentLinkUrl: linkUrl,
          toolResult: {
            paymentLinkId:  linkId,
            paymentLinkUrl: linkUrl,
            referenceId,
            note: 'Real Razorpay Test Mode payment link. Customer must complete payment to confirm recovery.',
          },
          // recoveredAmount is 0 — will be updated by the webhook after payment confirmation
          recoveredAmount: 0,
          details: `Razorpay Payment Link created (₹${amount.toLocaleString('en-IN')}). Awaiting customer payment. Link: ${linkUrl}`,
        };
      } catch (err) {
        // Razorpay API error — record as attempted but failed, never mark as recovered
        console.error('[RazorpayProvider] Payment link creation failed:', err.message);
        return {
          mode: 'razorpay_test',
          outcome_source: 'razorpay_test',
          status: 'FAILED',
          actionExecuted: action,
          toolResult: {
            error:   err.message,
            note:    'Razorpay Payment Link creation failed. No charge attempted.',
          },
          recoveredAmount: 0,
          details: `Payment Link creation failed: ${err.message}. No money action executed.`,
          error: err.message,
        };
      }
    }

    // Unknown action — safe fallback
    return {
      mode: 'razorpay_test',
      outcome_source: 'razorpay_test',
      status: 'NOT_EXECUTABLE',
      actionExecuted: action,
      toolResult: { note: 'No safe Razorpay operation available for this action.' },
      recoveredAmount: 0,
      details: `Action '${action}' has no safe Razorpay Test Mode mapping. No money action executed.`,
    };
  }
}
