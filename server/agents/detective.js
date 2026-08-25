import { callLLM } from '../services/llm.js';

/**
 * AGENT 1 — REVENUE DETECTIVE
 * Scans transactions to identify high-potential recoverable revenue and risk.
 */
export async function runRevenueDetective(payment, customer) {
  const { id: paymentId, amount, status, failure_reason, retry_count, payment_method } = payment;
  const { lifetime_value = 0, successful_payments = 0, failed_payments = 0 } = customer || {};

  const prompt = `Analyze this payment event for recovery opportunity:
Payment ID: ${paymentId}
Amount: INR ${amount}
Status: ${status}
Failure Reason: ${failure_reason}
Payment Method: ${payment_method}
Retry Count: ${retry_count}
Customer LTV: INR ${lifetime_value}
Customer Past Successes: ${successful_payments}
Customer Past Failures: ${failed_payments}

Return JSON with:
- paymentId: string
- recoveryScore: float between 0.0 and 1.0 (probability of recovery)
- riskScore: float between 0.0 and 1.0 (risk of churning customer or spamming)
- isRecoveryOpportunity: boolean (true if recoveryScore >= 0.5)
- reason: brief analytical explanation`;

  const fallbackFn = () => {
    let recoveryScore = 0.5;
    let riskScore = 0.2;
    let reason = 'Standard evaluation based on historical transaction profile.';

    const failure = (failure_reason || '').toLowerCase();
    const ltv = Number(lifetime_value) || 0;
    const successes = Number(successful_payments) || 0;
    const failures = Number(failed_payments) || 0;
    const amt = Number(amount) || 0;
    const retries = Number(retry_count) || 0;

    // High customer trust
    if (successes > 3 && failures <= 1) {
      recoveryScore += 0.3;
      riskScore -= 0.1;
    } else if (failures > 3 && successes === 0) {
      recoveryScore -= 0.35;
      riskScore += 0.4;
    }

    // Failure categorization influence
    if (failure.includes('network') || failure.includes('timeout') || failure.includes('temporary')) {
      recoveryScore += 0.25;
      riskScore -= 0.1;
      reason = 'Strong recovery candidate: Transient network/bank error with high historical customer reliability.';
    } else if (failure.includes('insufficient')) {
      recoveryScore += 0.1;
      riskScore += 0.15;
      reason = 'Recoverable via timed reminder or alternative payment instrument.';
    } else if (failure.includes('repeated') || retries >= 3) {
      recoveryScore -= 0.3;
      riskScore += 0.3;
      reason = 'High fatigue risk: Repeated prior retry failures detected.';
    } else if (failure.includes('abandoned')) {
      recoveryScore += 0.15;
      reason = 'Checkout drop-off candidate for high-converting recovery nudge.';
    }

    // High amount adjustments
    if (amt > 15000) {
      riskScore += 0.2;
    }

    // Clamp scores
    recoveryScore = Math.max(0.05, Math.min(0.99, Math.round(recoveryScore * 100) / 100));
    riskScore = Math.max(0.01, Math.min(0.99, Math.round(riskScore * 100) / 100));

    return {
      paymentId,
      recoveryScore,
      riskScore,
      isRecoveryOpportunity: recoveryScore >= 0.5,
      reason
    };
  };

  return await callLLM({
    prompt,
    systemInstruction: 'You are Revenue Detective, an expert payment risk and opportunity assessment AI. Return pure JSON.',
    fallbackFn
  });
}
