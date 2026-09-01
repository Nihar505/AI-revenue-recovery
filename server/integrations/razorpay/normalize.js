/**
 * Normalization helpers — convert raw Razorpay API objects into
 * the provider-agnostic RecoverAI payment representation.
 *
 * The AI agents always consume the normalized shape so they never
 * need to know Razorpay SDK implementation details.
 */

/**
 * Normalize a Razorpay Payment object (from /v1/payments/:id).
 */
export function normalizeRazorpayPayment(rzpPayment = {}) {
  return {
    provider:             'razorpay',
    provider_payment_id:  rzpPayment.id          || null,
    amount:               (rzpPayment.amount || 0) / 100, // paise → rupees
    currency:             rzpPayment.currency    || 'INR',
    status:               rzpPayment.status      || 'unknown',
    method:               rzpPayment.method      || null,
    email:                rzpPayment.email       || null,
    contact:              rzpPayment.contact     || null,
    error_code:           rzpPayment.error_code  || null,
    error_description:    rzpPayment.error_description || null,
    created_at:           rzpPayment.created_at
                            ? new Date(rzpPayment.created_at * 1000).toISOString()
                            : new Date().toISOString(),
  };
}

/**
 * Normalize a Razorpay Payment Link object (from /v1/payment_links/:id).
 */
export function normalizeRazorpayPaymentLink(link = {}) {
  return {
    provider:                    'razorpay',
    provider_payment_link_id:    link.id          || null,
    amount:                      (link.amount || 0) / 100,
    currency:                    link.currency    || 'INR',
    status:                      link.status      || 'created',
    short_url:                   link.short_url   || null,
    reference_id:                link.reference_id || null,
    created_at:                  link.created_at
                                   ? new Date(link.created_at * 1000).toISOString()
                                   : new Date().toISOString(),
  };
}
