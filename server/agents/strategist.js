import { callLLM } from '../services/llm.js';

export const RECOVERY_ACTIONS = [
  'RETRY_PAYMENT',
  'SEND_REMINDER',
  'OFFER_ALTERNATIVE_METHOD',
  'WAIT',
  'ESCALATE',
  'DO_NOTHING'
];

/**
 * AGENT 3 — RECOVERY STRATEGIST
 * Evaluates context to select the highest-value, safest action (including DO_NOTHING).
 */
export async function runRecoveryStrategist(payment, customer, detectiveResult, analystResult) {
  const { id: paymentId, amount, retry_count } = payment;
  const { recoveryScore, riskScore } = detectiveResult;
  const { rootCause } = analystResult;
  const { lifetime_value = 0, successful_payments = 0, failed_payments = 0 } = customer || {};

  const prompt = `Formulate the optimal revenue recovery strategy:
Payment ID: ${paymentId}
Amount: INR ${amount}
Retry Count: ${retry_count}
Root Cause: ${rootCause}
Recovery Score: ${recoveryScore}
Risk Score: ${riskScore}
Customer LTV: INR ${lifetime_value}
Customer Past Successes: ${successful_payments}
Customer Past Failures: ${failed_payments}

Choose recommendedAction strictly from:
[RETRY_PAYMENT, SEND_REMINDER, OFFER_ALTERNATIVE_METHOD, WAIT, ESCALATE, DO_NOTHING]

Note: Recommend DO_NOTHING if recovery probability is low, customer has fatigue, or amount is too small with high failure risk.
Recommend ESCALATE for high-value VIP accounts or policy-sensitive transactions.

Return JSON:
- paymentId: string
- recommendedAction: string (from list above)
- confidence: float (0.0 to 1.0)
- rationale: string (detailed reasoning explaining why this action was chosen, or why action is refrained)`;

  const fallbackFn = () => {
    const amt = Number(amount) || 0;
    const retries = Number(retry_count) || 0;
    let action = 'DO_NOTHING';
    let confidence = 0.90;
    let rationale = '';

    // High value transaction requiring human oversight / VIP touch
    if (amt > 10000) {
      action = 'ESCALATE';
      confidence = 0.96;
      rationale = `High-value transaction (₹${amt.toLocaleString('en-IN')}) warrants dedicated account management escalation to protect relationship.`;
    }
    // Repeated failure or exhausted retries -> refrain or do nothing
    else if (rootCause === 'REPEATED_FAILURE' || (retries >= 2 && amt < 1000) || recoveryScore < 0.25) {
      action = 'DO_NOTHING';
      confidence = 0.94;
      rationale = `Intelligent non-action: Customer exhibits high churn fatigue and low expected yield (₹${amt}). Refraining prevents negative merchant perception.`;
    }
    // Temporary network/gateway issue on low-medium amount -> safe retry
    else if (rootCause === 'TEMPORARY_FAILURE' && retries < 2 && amt <= 5000) {
      action = 'RETRY_PAYMENT';
      confidence = 0.95;
      rationale = `Transient banking switch error on healthy customer account. Immediate autonomous retry offers 88%+ success probability.`;
    }
    // Insufficient funds -> friendly reminder timed later
    else if (rootCause === 'INSUFFICIENT_FUNDS') {
      action = 'SEND_REMINDER';
      confidence = 0.91;
      rationale = `Insufficient balance detected. Triggering soft, branded payment reminder with 1-click Razorpay recharge link.`;
    }
    // Expired card / payment method -> alternative method prompt
    else if (rootCause === 'EXPIRED_PAYMENT_METHOD') {
      action = 'OFFER_ALTERNATIVE_METHOD';
      confidence = 0.93;
      rationale = `Saved instrument expired. Sending automated prompt to update card details or select UPI / Netbanking.`;
    }
    // Checkout dropoff -> smart recovery reminder
    else if (rootCause === 'CHECKOUT_ABANDONMENT') {
      action = 'SEND_REMINDER';
      confidence = 0.88;
      rationale = `Cart abandonment detected. Sending personalized re-engagement link with preserved session cart.`;
    }
    // Default fallback based on recovery potential
    else if (recoveryScore >= 0.5) {
      action = 'SEND_REMINDER';
      confidence = 0.82;
      rationale = `Opportunity detected. Delivering recovery communication to complete pending checkout.`;
    } else {
      action = 'DO_NOTHING';
      confidence = 0.85;
      rationale = `Risk-to-reward ratio unfavorable. Autonomous non-action selected.`;
    }

    return {
      paymentId,
      recommendedAction: action,
      confidence,
      rationale
    };
  };

  return await callLLM({
    prompt,
    systemInstruction: 'You are Recovery Strategist, an autonomous fintech decision engine. Return pure JSON.',
    fallbackFn
  });
}
