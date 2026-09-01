import { v4 as uuidv4 } from 'uuid';
import { getRazorpayClient } from './client.js';
import { normalizeRazorpayPaymentLink } from './normalize.js';

/**
 * Creates a Razorpay Payment Link for recovery actions.
 *
 * The `reference_id` is always set to `caseId` so that when the
 * `payment_link.paid` webhook fires we can look up the recovery case.
 *
 * @param {Object} opts
 * @param {string}  opts.caseId       - RecoverAI recovery case ID
 * @param {Object}  opts.payment      - internal payment record
 * @param {Object}  opts.customer     - internal customer record
 * @param {string}  opts.action       - SEND_REMINDER | RETRY_PAYMENT | OFFER_ALTERNATIVE_METHOD
 * @returns {Promise<{linkId, linkUrl, referenceId, raw}>}
 */
export async function createRecoveryPaymentLink({ caseId, payment, customer, action }) {
  const rzp = getRazorpayClient();

  if (!rzp) {
    throw new Error('Razorpay client is not initialised. Running in simulation mode.');
  }

  const amountPaise = Math.round(Number(payment.amount) * 100); // Razorpay uses paise
  const referenceId = caseId; // webhook uses this to look up the case

  const description = (() => {
    switch (action) {
      case 'RETRY_PAYMENT':
        return `Recovery retry for failed payment — ₹${payment.amount}`;
      case 'OFFER_ALTERNATIVE_METHOD':
        return `Complete your payment with an alternative method — ₹${payment.amount}`;
      default:
        return `Complete your pending payment — ₹${payment.amount}`;
    }
  })();

  const linkPayload = {
    amount:           amountPaise,
    currency:         payment.currency || 'INR',
    description,
    reference_id:     referenceId,
    notify:           { email: !!(customer && customer.email), sms: false },
    reminder_enable:  true,
    callback_method:  'get',
  };

  // Add customer details if available (enables Razorpay to send the link directly)
  if (customer && (customer.name || customer.email)) {
    linkPayload.customer = {
      name:  customer.name  || 'Customer',
      email: customer.email || undefined,
    };
  }

  const raw = await rzp.paymentLink.create(linkPayload);
  const normalized = normalizeRazorpayPaymentLink(raw);

  return {
    linkId:      normalized.provider_payment_link_id,
    linkUrl:     normalized.short_url,
    referenceId: normalized.reference_id,
    raw,
  };
}

/**
 * Fetch a Razorpay Payment Link by ID.
 */
export async function getPaymentLink(linkId) {
  const rzp = getRazorpayClient();
  if (!rzp) return null;
  try {
    const raw = await rzp.paymentLink.fetch(linkId);
    return normalizeRazorpayPaymentLink(raw);
  } catch (err) {
    console.warn('[Razorpay] Failed to fetch payment link:', err.message);
    return null;
  }
}
