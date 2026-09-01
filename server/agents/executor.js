import { getProvider } from '../providers/index.js';

/**
 * AGENT 4 — EXECUTION AGENT
 * ---
 * Executes the policy-vetted action via the appropriate payment provider.
 *
 * KEY CHANGE: Math.random() has been removed from this agent.
 * The provider layer determines whether an outcome is simulated or real:
 *   - DemoProvider (simulation): uses stochastic simulation as before
 *   - RazorpayProvider (test mode): creates a real payment link, returns
 *     AWAITING_PAYMENT — the webhook handler produces the verified outcome
 *
 * @param {Object} opts
 * @param {string}  opts.caseId           - recovery case ID (needed by Razorpay provider)
 * @param {Object}  opts.payment
 * @param {Object}  opts.customer
 * @param {string}  opts.recommendedAction
 * @param {Object}  opts.policyEvaluation
 * @param {string}  opts.rationale
 */
export async function runExecutionAgent({
  caseId,
  payment,
  customer,
  recommendedAction,
  policyEvaluation,
  rationale,
}) {
  // If policy blocked the original action, run the enforced fallback instead
  const actionToExecute = policyEvaluation.finalAction || recommendedAction;

  const provider = getProvider();

  const result = await provider.execute({
    caseId,
    payment,
    customer,
    action:           actionToExecute,
    policyEvaluation,
    rationale,
  });

  return result;
}
