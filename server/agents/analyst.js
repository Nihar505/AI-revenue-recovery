import { callLLM } from '../services/llm.js';

export const ROOT_CAUSES = [
  'TEMPORARY_FAILURE',
  'INSUFFICIENT_FUNDS',
  'BANK_DECLINED',
  'EXPIRED_PAYMENT_METHOD',
  'CHECKOUT_ABANDONMENT',
  'REPEATED_FAILURE',
  'SUBSCRIPTION_FAILURE',
  'UNKNOWN'
];

/**
 * AGENT 2 — ROOT CAUSE ANALYST
 * Determines why the payment was lost.
 */
export async function runRootCauseAnalyst(payment, detectiveResult) {
  const { id: paymentId, failure_reason, payment_method, retry_count, status } = payment;

  const prompt = `Diagnose the root cause of this payment failure:
Payment ID: ${paymentId}
Status: ${status}
Failure Reason: ${failure_reason}
Payment Method: ${payment_method}
Retry Count: ${retry_count}
Detective Score: ${detectiveResult?.recoveryScore}

Choose rootCause strictly from:
[TEMPORARY_FAILURE, INSUFFICIENT_FUNDS, BANK_DECLINED, EXPIRED_PAYMENT_METHOD, CHECKOUT_ABANDONMENT, REPEATED_FAILURE, SUBSCRIPTION_FAILURE, UNKNOWN]

Return JSON:
- paymentId: string
- rootCause: string (one of the enum values above)
- confidence: float (0.0 to 1.0)
- detailedDiagnosis: string`;

  const fallbackFn = () => {
    const raw = (failure_reason || '').toLowerCase();
    let rootCause = 'UNKNOWN';
    let confidence = 0.85;
    let detailedDiagnosis = 'Payment interruption diagnosed via telemetry.';

    if (retry_count >= 3 || raw.includes('repeated') || raw.includes('max retries')) {
      rootCause = 'REPEATED_FAILURE';
      confidence = 0.95;
      detailedDiagnosis = `Repeated execution dropoff (${retry_count} consecutive attempts failed).`;
    } else if (raw.includes('network') || raw.includes('timeout') || raw.includes('temporary') || raw.includes('gateway unavailable') || raw.includes('switch unavailable')) {
      rootCause = 'TEMPORARY_FAILURE';
      confidence = 0.96;
      detailedDiagnosis = 'Intermittent bank switch or network handshake timeout.';
    } else if (raw.includes('insufficient') || raw.includes('low balance')) {
      rootCause = 'INSUFFICIENT_FUNDS';
      confidence = 0.92;
      detailedDiagnosis = 'Issuer declined transaction due to insufficient account balance.';
    } else if (raw.includes('expired') || raw.includes('invalid card') || raw.includes('card expired')) {
      rootCause = 'EXPIRED_PAYMENT_METHOD';
      confidence = 0.94;
      detailedDiagnosis = 'Saved payment token or card expiration date has passed.';
    } else if (raw.includes('subscription') || raw.includes('mandate') || raw.includes('auto-debit')) {
      rootCause = 'SUBSCRIPTION_FAILURE';
      confidence = 0.91;
      detailedDiagnosis = 'Recurring mandate execution failed or authorization revoked.';
    } else if (status === 'abandoned' || raw.includes('abandoned') || raw.includes('user cancelled') || raw.includes('dropped')) {
      rootCause = 'CHECKOUT_ABANDONMENT';
      confidence = 0.89;
      detailedDiagnosis = 'Customer closed checkout session prior to authorization.';
    } else if (raw.includes('decline') || raw.includes('fraud') || raw.includes('risk') || raw.includes('blocked by bank')) {
      rootCause = 'BANK_DECLINED';
      confidence = 0.93;
      detailedDiagnosis = 'Issuer fraud or security filter declined transaction.';
    }

    return {
      paymentId,
      rootCause,
      confidence,
      detailedDiagnosis
    };
  };

  return await callLLM({
    prompt,
    systemInstruction: 'You are Root Cause Analyst, an expert fintech payment diagnostics AI. Return pure JSON.',
    fallbackFn
  });
}
