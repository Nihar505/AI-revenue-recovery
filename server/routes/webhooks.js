import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema.js';
import { verifyWebhookSignature, parseWebhookEvent } from '../integrations/razorpay/webhooks.js';
import { broadcastAgentEvent } from './runRecovery.js';

export const webhooksRouter = Router();

/**
 * POST /api/webhooks/razorpay
 * Public webhook endpoint for Razorpay payment link events.
 *
 * NOTE: Signature verification requires the raw request body.
 * Express mounts this router with express.raw() or a custom rawBody buffer.
 */
webhooksRouter.post('/razorpay', (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  // 1. Secret verification
  if (!secret) {
    console.warn('[Webhook] RAZORPAY_WEBHOOK_SECRET is not configured in .env');
    return res.status(500).json({ error: 'Webhook secret is not configured on server' });
  }

  // 2. Signature verification
  const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body));
  const isValid = verifyWebhookSignature(rawBody, signature, secret);

  if (!isValid) {
    console.warn('[Webhook] Invalid signature received from Razorpay');
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  // Parse payload
  let payload = {};
  try {
    payload = typeof req.body === 'object' && !Buffer.isBuffer(req.body)
      ? req.body
      : JSON.parse(rawBody);
  } catch (err) {
    console.error('[Webhook] Failed to parse JSON body:', err.message);
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const parsed = parseWebhookEvent(payload);
  const db = getDb();
  const timestamp = new Date().toISOString();

  // 3. Idempotency check via webhook_events table
  const existingEvent = db.prepare('SELECT id FROM webhook_events WHERE id = ?').get(parsed.eventId);
  if (existingEvent) {
    console.log(`[Webhook] Event ${parsed.eventId} already processed — skipping (idempotent).`);
    return res.status(200).json({ received: true, duplicate: true, status: 'already_processed' });
  }

  // Record event in webhook_events table
  try {
    db.prepare(`
      INSERT INTO webhook_events (id, event_type, payload, processed_at)
      VALUES (?, ?, ?, ?)
    `).run(parsed.eventId, parsed.eventType, JSON.stringify(payload), timestamp);
  } catch (dbErr) {
    console.warn('[Webhook] Failed to insert webhook event log:', dbErr.message);
  }

  // 4. We only process payment_link.paid events
  if (parsed.eventType !== 'payment_link.paid') {
    console.log(`[Webhook] Ignored unhandled event type: ${parsed.eventType}`);
    return res.status(200).json({ received: true, status: 'ignored' });
  }

  // 5. Look up recovery case by reference_id (= caseId) or provider_payment_link_id
  let recoveryCase = null;
  if (parsed.referenceId) {
    recoveryCase = db.prepare(`
      SELECT rc.*, p.customer_id, p.id as payment_id, p.amount as original_amount
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      WHERE rc.id = ?
    `).get(parsed.referenceId);
  }

  if (!recoveryCase && parsed.paymentLinkId) {
    recoveryCase = db.prepare(`
      SELECT rc.*, p.customer_id, p.id as payment_id, p.amount as original_amount
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      WHERE rc.provider_payment_link_id = ?
    `).get(parsed.paymentLinkId);
  }

  if (!recoveryCase) {
    console.warn(`[Webhook] No matching recovery case found for referenceId=${parsed.referenceId}, paymentLinkId=${parsed.paymentLinkId}`);
    return res.status(200).json({ received: true, status: 'case_not_found' });
  }

  const caseId = recoveryCase.id;
  const paymentId = recoveryCase.payment_id;
  const customerId = recoveryCase.customer_id;
  const amountPaid = parsed.amountPaid > 0 ? parsed.amountPaid : recoveryCase.original_amount;

  // Process verified recovery in a database transaction
  const processRecoveryTx = db.transaction(() => {
    // 6. Update or insert recovery_outcomes
    const existingOutcome = db.prepare('SELECT id FROM recovery_outcomes WHERE case_id = ?').get(caseId);
    if (existingOutcome) {
      db.prepare(`
        UPDATE recovery_outcomes
        SET outcome = 'recovered',
            recovered_amount = ?,
            outcome_source = 'razorpay_webhook',
            provider_payment_link_id = COALESCE(?, provider_payment_link_id),
            timestamp = ?
        WHERE case_id = ?
      `).run(amountPaid, parsed.paymentLinkId, timestamp, caseId);
    } else {
      const outcomeId = `out_${uuidv4().substring(0, 10)}`;
      db.prepare(`
        INSERT INTO recovery_outcomes (id, case_id, action, recovered_amount, outcome, outcome_source, provider_payment_link_id, timestamp)
        VALUES (?, ?, ?, ?, 'recovered', 'razorpay_webhook', ?, ?)
      `).run(
        outcomeId,
        caseId,
        recoveryCase.recommended_action || 'SEND_REMINDER',
        amountPaid,
        parsed.paymentLinkId,
        timestamp
      );
    }

    // 7. Update recovery_cases status
    db.prepare(`
      UPDATE recovery_cases
      SET status = 'recovered',
          provider = 'razorpay_test',
          provider_payment_link_id = COALESCE(provider_payment_link_id, ?)
      WHERE id = ?
    `).run(parsed.paymentLinkId, caseId);

    // 8. Update payments status to captured
    db.prepare(`
      UPDATE payments
      SET status = 'captured'
      WHERE id = ?
    `).run(paymentId);

    // 9. Update customer lifetime value and stats
    if (customerId) {
      db.prepare(`
        UPDATE customers
        SET lifetime_value = lifetime_value + ?,
            successful_payments = successful_payments + 1,
            last_payment_at = ?
        WHERE id = ?
      `).run(amountPaid, timestamp, customerId);
    }

    // 10. Record auditor action for webhook verification
    const auditActionId = `act_${uuidv4().substring(0, 10)}`;
    db.prepare(`
      INSERT INTO agent_actions (id, case_id, agent, action, reason, confidence, input_data, policy_result, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auditActionId,
      caseId,
      'Razorpay Webhook (Auditor Verified)',
      'PAYMENT_CONFIRMED',
      `Payment of ₹${amountPaid.toLocaleString('en-IN')} confirmed via Razorpay payment_link.paid webhook event.`,
      1.0,
      JSON.stringify({
        eventId: parsed.eventId,
        paymentLinkId: parsed.paymentLinkId,
        razorpayPaymentId: parsed.paymentId,
        amountPaid,
        signatureVerified: true
      }),
      'VERIFIED',
      'completed',
      timestamp
    );
  });

  processRecoveryTx();

  // 11. Broadcast SSE event to connected clients
  broadcastAgentEvent({
    agent: 'Razorpay Webhook',
    paymentId,
    amount: amountPaid,
    status: 'RECOVERED_VERIFIED',
    outcome: 'recovered',
    recoveredAmount: amountPaid,
    message: `Payment ₹${amountPaid.toLocaleString('en-IN')} verified and recovered via Razorpay webhook for Case ${caseId}.`,
    mode: 'razorpay_test',
    razorpayPaymentId: parsed.paymentId,
    paymentLinkId: parsed.paymentLinkId
  });

  console.log(`[Webhook] Case ${caseId} marked RECOVERED (₹${amountPaid}) via verified webhook.`);
  return res.status(200).json({ received: true, caseId, status: 'recovered' });
});
