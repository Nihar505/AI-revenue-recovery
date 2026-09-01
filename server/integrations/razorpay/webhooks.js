import crypto from 'crypto';

/**
 * Razorpay Webhook Utilities
 * ---
 * Signature verification and event parsing for incoming webhook events.
 *
 * Razorpay computes:
 *   HMAC-SHA256(webhookSecret, rawBody) → hex digest
 * and sends it in the `x-razorpay-signature` header.
 */

/**
 * Verify the Razorpay webhook signature.
 *
 * @param {string|Buffer} rawBody   - raw request body (must be unparsed)
 * @param {string}        signature - value of x-razorpay-signature header
 * @param {string}        secret    - RAZORPAY_WEBHOOK_SECRET env var
 * @returns {boolean}
 */
export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    // constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Parse a Razorpay webhook payload into a normalised event object.
 *
 * We only act on `payment_link.paid` events — all others are acknowledged
 * with a 200 but produce no side effects.
 *
 * @param {Object} body - parsed JSON body
 * @returns {{
 *   eventId: string,
 *   eventType: string,
 *   paymentLinkId: string|null,
 *   paymentId: string|null,
 *   referenceId: string|null,   ← this is our caseId
 *   amountPaid: number,
 *   currency: string,
 *   status: string,
 *   raw: Object
 * }}
 */
export function parseWebhookEvent(body = {}) {
  const eventType  = body.event || '';
  const payload    = body.payload || {};

  // Razorpay payment_link.paid shape:
  // payload.payment_link.entity  → payment link object
  // payload.payment.entity       → payment object
  const linkEntity    = payload?.payment_link?.entity || {};
  const paymentEntity = payload?.payment?.entity      || {};

  return {
    eventId:       body.id || `evt_${Date.now()}`,
    eventType,
    paymentLinkId: linkEntity.id    || null,
    paymentId:     paymentEntity.id || null,
    referenceId:   linkEntity.reference_id  || null,   // === our caseId
    amountPaid:    (paymentEntity.amount || 0) / 100,  // paise → rupees
    currency:      paymentEntity.currency || 'INR',
    status:        paymentEntity.status   || '',
    raw:           body,
  };
}
