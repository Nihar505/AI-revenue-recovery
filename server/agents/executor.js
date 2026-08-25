import { razorpayTools } from '../tools/razorpay.js';

/**
 * AGENT 4 — EXECUTION AGENT
 * Safely executes policy-vetted actions via strictly controlled tools.
 */
export async function runExecutionAgent({
  payment,
  customer,
  recommendedAction,
  policyEvaluation,
  rationale
}) {
  const { id: paymentId, amount, payment_method } = payment;
  const { id: customerId, name: customerName, email: customerEmail } = customer || {};

  // If policy blocked original action, execute enforced safety action (typically ESCALATE)
  const actionToExecute = policyEvaluation.finalAction || recommendedAction;

  // Case 1: DO_NOTHING — Safe non-action
  if (actionToExecute === 'DO_NOTHING') {
    return {
      status: 'REFRAINED',
      actionExecuted: 'DO_NOTHING',
      toolResult: { message: 'Action intentionally refrained according to AI strategy and merchant policy.' },
      recoveredAmount: 0,
      details: 'Autonomous non-intervention completed safely.'
    };
  }

  // Case 2: RETRY_PAYMENT — Policy permitted retry
  if (actionToExecute === 'RETRY_PAYMENT') {
    const retryResult = await razorpayTools.retryPayment({
      paymentId,
      amount,
      customerId,
      paymentMethod: payment_method
    });

    const recoveredAmount = retryResult.success ? amount : 0;

    return {
      status: retryResult.success ? 'SUCCESS' : 'FAILED',
      actionExecuted: 'RETRY_PAYMENT',
      toolResult: retryResult,
      recoveredAmount,
      details: retryResult.success
        ? `Payment ₹${amount.toLocaleString('en-IN')} successfully recovered via automatic gateway retry.`
        : `Automatic retry attempted but rejected by issuing bank switch.`
    };
  }

  // Case 3: SEND_REMINDER / OFFER_ALTERNATIVE_METHOD — Send recovery communication
  if (actionToExecute === 'SEND_REMINDER' || actionToExecute === 'OFFER_ALTERNATIVE_METHOD') {
    const msgResult = await razorpayTools.sendRecoveryMessage({
      customerId,
      customerName,
      email: customerEmail,
      amount,
      paymentId,
      channel: 'email'
    });

    // Simulate 45% recovery conversion on delivered reminder
    const isConverted = Math.random() < 0.45;
    const recoveredAmount = isConverted ? amount : 0;

    return {
      status: 'SUCCESS',
      actionExecuted: actionToExecute,
      toolResult: msgResult,
      recoveredAmount,
      details: `Dispatched customized 1-click Razorpay payment link to ${customerEmail || 'customer'}.`
    };
  }

  // Case 4: ESCALATE — Create VIP escalation ticket
  if (actionToExecute === 'ESCALATE') {
    const ticketResult = await razorpayTools.createSupportTicket({
      paymentId,
      customerId,
      amount,
      reason: policyEvaluation.allowed ? rationale : policyEvaluation.reason,
      priority: amount > 15000 ? 'URGENT' : 'HIGH'
    });

    return {
      status: 'ESCALATED',
      actionExecuted: 'ESCALATE',
      toolResult: ticketResult,
      recoveredAmount: 0,
      details: `Created priority ticket ${ticketResult.ticketId} assigned to Revenue Operations team.`
    };
  }

  // Fallback
  return {
    status: 'UNKNOWN',
    actionExecuted: actionToExecute,
    toolResult: {},
    recoveredAmount: 0,
    details: 'No executable tool matched.'
  };
}
