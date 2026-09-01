import { v4 as uuidv4 } from 'uuid';

/**
 * DEMO PROVIDER — Simulation Mode
 * ---
 * Preserves the existing random-outcome behavior for development, demos,
 * and cases where Razorpay credentials are not configured.
 *
 * All outcomes from this provider are explicitly tagged as `simulation`.
 * They must NEVER be confused with actual Razorpay test-mode recoveries.
 */
export class DemoProvider {
  get mode() { return 'simulation'; }

  /**
   * Execute a recovery action in simulation mode.
   *
   * @param {Object} opts
   * @param {Object}  opts.payment           - internal payment record
   * @param {Object}  opts.customer          - internal customer record
   * @param {string}  opts.action            - policy-approved action
   * @param {Object}  opts.policyEvaluation  - policy engine result
   * @param {string}  opts.rationale         - strategist rationale
   * @returns {Promise<{mode, status, actionExecuted, recoveredAmount, details, toolResult}>}
   */
  async execute({ payment, customer, action, policyEvaluation, rationale }) {
    const { id: paymentId, amount, payment_method } = payment;
    const { id: customerId, name: customerName, email: customerEmail } = customer || {};

    // DO_NOTHING — intentional non-action
    if (action === 'DO_NOTHING') {
      return {
        mode: 'simulation',
        outcome_source: 'simulation',
        status: 'REFRAINED',
        actionExecuted: 'DO_NOTHING',
        toolResult: { message: 'Autonomous non-intervention — policy-bounded safe refrain.' },
        recoveredAmount: 0,
        details: 'Simulated: Action intentionally refrained per AI strategy and merchant policy.',
      };
    }

    // ESCALATE — create a (simulated) support ticket
    if (action === 'ESCALATE') {
      const ticketId = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;
      return {
        mode: 'simulation',
        outcome_source: 'simulation',
        status: 'ESCALATED',
        actionExecuted: 'ESCALATE',
        toolResult: {
          ticketId,
          priority: amount > 15000 ? 'URGENT' : 'HIGH',
          assignedTeam: 'Revenue Ops & VIP Escort',
          title: `[Escalation] High-Value At-Risk Payment ₹${amount}`,
          notes: policyEvaluation.allowed ? rationale : policyEvaluation.reason,
          createdAt: new Date().toISOString(),
        },
        recoveredAmount: 0,
        details: `Simulated: Created priority ticket ${ticketId} — assigned to Revenue Operations team.`,
      };
    }

    // RETRY_PAYMENT — simulate gateway retry (88% success for temp failures)
    if (action === 'RETRY_PAYMENT') {
      await new Promise(r => setTimeout(r, 180));
      const isSuccess = Math.random() < 0.88;
      const simTxnId  = `pay_sim_${uuidv4().substring(0, 10)}`;
      return {
        mode: 'simulation',
        outcome_source: 'simulation',
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        actionExecuted: 'RETRY_PAYMENT',
        toolResult: {
          success: isSuccess,
          transactionId: simTxnId,
          originalPaymentId: paymentId,
          amount,
          currency: 'INR',
          status: isSuccess ? 'captured' : 'failed',
          method: payment_method || 'upi',
          gatewayResponse: isSuccess
            ? 'Simulated transaction processed successfully'
            : 'Simulated bank network timeout on retry',
          timestamp: new Date().toISOString(),
          note: 'SIMULATION — not a real Razorpay transaction',
        },
        recoveredAmount: isSuccess ? amount : 0,
        details: isSuccess
          ? `Simulated: Payment ₹${amount.toLocaleString('en-IN')} recovered via automatic gateway retry.`
          : `Simulated: Automatic retry attempted but rejected by issuing bank switch.`,
      };
    }

    // SEND_REMINDER / OFFER_ALTERNATIVE_METHOD — simulate payment link + 45% conversion
    if (action === 'SEND_REMINDER' || action === 'OFFER_ALTERNATIVE_METHOD') {
      await new Promise(r => setTimeout(r, 100));
      const isConverted = Math.random() < 0.45;
      const messageId   = `msg_sim_${uuidv4().substring(0, 8)}`;
      const payLink     = `https://rzp.io/sim/rec_${uuidv4().substring(0, 8)}`;
      return {
        mode: 'simulation',
        outcome_source: 'simulation',
        status: 'SUCCESS',
        actionExecuted: action,
        toolResult: {
          success: true,
          messageId,
          channel: 'email',
          recipient: customerEmail,
          paymentLink: payLink,
          content: `Hi ${customerName || 'Customer'}, your payment of ₹${amount} was interrupted. Complete here: ${payLink}`,
          deliveredAt: new Date().toISOString(),
          note: 'SIMULATION — not a real Razorpay payment link',
        },
        recoveredAmount: isConverted ? amount : 0,
        details: `Simulated: Dispatched payment link to ${customerEmail || 'customer'}. ${isConverted ? 'Customer completed payment.' : 'Awaiting customer action.'}`,
      };
    }

    // Fallback
    return {
      mode: 'simulation',
      outcome_source: 'simulation',
      status: 'UNKNOWN',
      actionExecuted: action,
      toolResult: {},
      recoveredAmount: 0,
      details: 'Simulated: No executable tool matched.',
    };
  }
}
