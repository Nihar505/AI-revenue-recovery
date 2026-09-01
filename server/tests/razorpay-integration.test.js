import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { initDb, getDb } from '../db/schema.js';
import { getMode, isRazorpayEnabled } from '../integrations/razorpay/client.js';
import { normalizeRazorpayPayment, normalizeRazorpayPaymentLink } from '../integrations/razorpay/normalize.js';
import { verifyWebhookSignature, parseWebhookEvent } from '../integrations/razorpay/webhooks.js';
import { DemoProvider } from '../providers/demoProvider.js';
import { RazorpayProvider } from '../providers/razorpayProvider.js';
import { policyEngine } from '../policies/policyEngine.js';
import { webhooksRouter } from '../routes/webhooks.js';
import { healthRouter } from '../routes/health.js';
import { analyticsRouter } from '../routes/analytics.js';
import { casesRouter } from '../routes/cases.js';
import { requireAuth } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'recoverai_secret_2026';
const TEST_WEBHOOK_SECRET = 'whsec_test_secret_for_unit_tests_12345';

let passed = 0;
let failed = 0;

function assert(condition, message, detail = '') {
  if (condition) {
    console.log(`  ✅ ${message}${detail ? ' — ' + detail : ''}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('🧪 RecoverAI — Razorpay Test Mode & Recovery Loop Tests');
console.log('======================================================\n');

// 1. Initialise Database
initDb();
const db = getDb();

// Test Suite 1: Normalization Layer
console.log('📦 Test Suite 1: Razorpay Data Normalization');
{
  const rawRzpPayment = {
    id: 'pay_ABC123XYZ',
    amount: 499900, // 4999 INR in paise
    currency: 'INR',
    status: 'captured',
    method: 'upi',
    email: 'user@example.com',
    contact: '+919876543210',
    created_at: 1700000000,
  };
  const norm = normalizeRazorpayPayment(rawRzpPayment);
  assert(norm.provider === 'razorpay', 'Provider is razorpay');
  assert(norm.provider_payment_id === 'pay_ABC123XYZ', 'Payment ID extracted correctly');
  assert(norm.amount === 4999, 'Amount converted from paise to rupees', `amount=${norm.amount}`);
  assert(norm.method === 'upi', 'Method normalized');

  const rawLink = {
    id: 'plink_DEF456',
    amount: 150000,
    currency: 'INR',
    status: 'paid',
    short_url: 'https://rzp.io/i/DEF456',
    reference_id: 'case_test_001',
    created_at: 1700000000,
  };
  const normLink = normalizeRazorpayPaymentLink(rawLink);
  assert(normLink.provider_payment_link_id === 'plink_DEF456', 'Link ID normalized');
  assert(normLink.amount === 1500, 'Link amount normalized to INR');
  assert(normLink.short_url === 'https://rzp.io/i/DEF456', 'Short URL extracted');
  assert(normLink.reference_id === 'case_test_001', 'Reference ID preserved');
}

// Test Suite 2: Webhook HMAC Signature Verification
console.log('\n🔐 Test Suite 2: Webhook HMAC-SHA256 Signature Verification');
{
  const rawPayload = JSON.stringify({
    event: 'payment_link.paid',
    payload: {
      payment_link: { entity: { id: 'plink_test_sig', reference_id: 'case_sig_123' } },
      payment: { entity: { id: 'pay_sig_123', amount: 499900, status: 'captured' } }
    }
  });

  const validSignature = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(rawPayload)
    .digest('hex');

  const isValid = verifyWebhookSignature(rawPayload, validSignature, TEST_WEBHOOK_SECRET);
  assert(isValid === true, 'Valid signature verified successfully');

  const isInvalid = verifyWebhookSignature(rawPayload, 'wrong_hex_signature_1234567890abcdef', TEST_WEBHOOK_SECRET);
  assert(isInvalid === false, 'Tampered/invalid signature rejected');

  const isMissing = verifyWebhookSignature(rawPayload, '', TEST_WEBHOOK_SECRET);
  assert(isMissing === false, 'Empty signature rejected');

  const isTampered = verifyWebhookSignature(rawPayload + 'tampered', validSignature, TEST_WEBHOOK_SECRET);
  assert(isTampered === false, 'Tampered payload rejected');
}

// Test Suite 3: Webhook Event Parsing
console.log('\n🔍 Test Suite 3: Webhook Event Parsing');
{
  const webhookBody = {
    id: 'evt_wh_test_001',
    event: 'payment_link.paid',
    payload: {
      payment_link: { entity: { id: 'plink_parse_test', reference_id: 'case_parse_456' } },
      payment: { entity: { id: 'pay_parse_789', amount: 250000, currency: 'INR', status: 'captured' } }
    }
  };

  const parsed = parseWebhookEvent(webhookBody);
  assert(parsed.eventId === 'evt_wh_test_001', 'Event ID extracted');
  assert(parsed.eventType === 'payment_link.paid', 'Event type extracted');
  assert(parsed.paymentLinkId === 'plink_parse_test', 'Payment link ID extracted');
  assert(parsed.paymentId === 'pay_parse_789', 'Payment ID extracted');
  assert(parsed.referenceId === 'case_parse_456', 'Reference ID (caseId) extracted');
  assert(parsed.amountPaid === 2500, 'Amount paid parsed in rupees', `amount=₹${parsed.amountPaid}`);
}

// Test Suite 4: Demo Provider (Simulation Mode)
console.log('\n🎮 Test Suite 4: Demo Provider (Simulation Mode)');
{
  const demoProvider = new DemoProvider();
  assert(demoProvider.mode === 'simulation', 'DemoProvider reports mode "simulation"');

  const refrainRes = await demoProvider.execute({
    payment: { id: 'pay_sim_01', amount: 1000 },
    customer: { id: 'cust_01', email: 'test@example.com' },
    action: 'DO_NOTHING',
    policyEvaluation: { allowed: true },
    rationale: 'Safe refrain'
  });
  assert(refrainRes.status === 'REFRAINED', 'DO_NOTHING results in REFRAINED');
  assert(refrainRes.mode === 'simulation', 'Result tagged with mode: simulation');
  assert(refrainRes.recoveredAmount === 0, 'DO_NOTHING recovered amount is 0');

  const escalateRes = await demoProvider.execute({
    payment: { id: 'pay_sim_02', amount: 20000 },
    customer: { id: 'cust_02', email: 'vip@example.com' },
    action: 'ESCALATE',
    policyEvaluation: { allowed: true },
    rationale: 'VIP Account'
  });
  assert(escalateRes.status === 'ESCALATED', 'ESCALATE results in ESCALATED');
  assert(escalateRes.toolResult?.ticketId?.startsWith('TICK-'), 'Support ticket ID generated');
}

// Test Suite 5: Razorpay Provider (Test Mode contract)
console.log('\n💳 Test Suite 5: Razorpay Provider (Test Mode Execution Contract)');
{
  const rzpProvider = new RazorpayProvider();
  assert(rzpProvider.mode === 'razorpay_test', 'RazorpayProvider reports mode "razorpay_test"');

  // Verify DO_NOTHING & ESCALATE produce 0 recovered amount
  const doNothingRes = await rzpProvider.execute({
    caseId: 'case_rzp_test_1',
    payment: { id: 'pay_rzp_01', amount: 500 },
    action: 'DO_NOTHING',
    policyEvaluation: { allowed: true },
    rationale: 'Refrain'
  });
  assert(doNothingRes.status === 'REFRAINED' && doNothingRes.recoveredAmount === 0, 'Razorpay DO_NOTHING is REFRAINED with 0 recovered');

  const escRes = await rzpProvider.execute({
    caseId: 'case_rzp_test_2',
    payment: { id: 'pay_rzp_02', amount: 25000 },
    action: 'ESCALATE',
    policyEvaluation: { allowed: true },
    rationale: 'High value'
  });
  assert(escRes.status === 'ESCALATED' && escRes.recoveredAmount === 0, 'Razorpay ESCALATE is ESCALATED with 0 recovered');
}

// Test Suite 6: Policy Engine Safety Gates
console.log('\n🛡️ Test Suite 6: Policy & Safety Engine Bounds');
{
  // High value over threshold (₹25,000 > ₹10,000)
  const highVal = policyEngine.evaluateAction({ amount: 25000, retryCount: 0, recommendedAction: 'RETRY_PAYMENT' });
  assert(highVal.allowed === false, 'High-value transaction > 10,000 is BLOCKED by policy');
  assert(highVal.finalAction === 'ESCALATE', 'Blocked high-value action modified to ESCALATE');

  // Retries exhausted
  const maxRetries = policyEngine.evaluateAction({ amount: 2000, retryCount: 2, recommendedAction: 'RETRY_PAYMENT' });
  assert(maxRetries.allowed === false, 'Exceeded max retry count (2) is BLOCKED');
  assert(maxRetries.finalAction === 'SEND_REMINDER', 'Exhausted retry modified safely to SEND_REMINDER');

  // Safe action within bounds
  const safe = policyEngine.evaluateAction({ amount: 1500, retryCount: 0, recommendedAction: 'SEND_REMINDER' });
  assert(safe.allowed === true, 'Safe reminder within limits is APPROVED');
}

// Test Suite 7: Webhook HTTP Endpoint & Idempotency
console.log('\n🌐 Test Suite 7: Webhook HTTP Endpoint, Signature Verification & Idempotency');
{
  process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

  const app = express();
  app.use(cors());
  app.use(express.json({
    verify: (req, res, buf) => { req.rawBody = buf; }
  }));
  app.use('/api/webhooks', webhooksRouter);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Seed a test customer and payment in DB
  const testUserId = `usr_test_${Date.now()}`;
  const testCustId = `cust_wh_test_${Date.now()}`;
  const testPayId = `pay_wh_test_${Date.now()}`;
  const testCaseId = `case_wh_test_${Date.now()}`;
  const testLinkId = `plink_wh_test_${Date.now()}`;

  db.prepare(`
    INSERT INTO customers (id, user_id, name, email, lifetime_value, successful_payments, failed_payments)
    VALUES (?, ?, 'Webhook Test Customer', ?, 0, 0, 1)
  `).run(testCustId, testUserId, `wh_${Date.now()}@example.com`);

  db.prepare(`
    INSERT INTO payments (id, user_id, customer_id, amount, currency, status, failure_reason, payment_method, retry_count, created_at)
    VALUES (?, ?, ?, 4999, 'INR', 'failed', 'insufficient_funds', 'card', 0, datetime('now'))
  `).run(testPayId, testUserId, testCustId);

  db.prepare(`
    INSERT INTO recovery_cases (id, payment_id, recovery_score, risk_score, root_cause, recommended_action, confidence, status, provider, provider_payment_link_id)
    VALUES (?, ?, 0.85, 0.15, 'INSUFFICIENT_FUNDS', 'SEND_REMINDER', 0.92, 'awaiting_payment', 'razorpay_test', ?)
  `).run(testCaseId, testPayId, testLinkId);

  db.prepare(`
    INSERT INTO recovery_outcomes (id, case_id, action, recovered_amount, outcome, outcome_source, provider_payment_link_id)
    VALUES (?, ?, 'SEND_REMINDER', 0, 'awaiting_payment', 'razorpay_test', ?)
  `).run(`out_${Date.now()}`, testCaseId, testLinkId);

  // 7a. Reject missing signature
  const resMissingSig = await fetch(`${baseUrl}/api/webhooks/razorpay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'evt_no_sig' })
  });
  assert(resMissingSig.status === 400, 'Webhook with missing signature returns HTTP 400');

  // 7b. Reject invalid signature
  const resBadSig = await fetch(`${baseUrl}/api/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': '0000000000000000000000000000000000000000000000000000000000000000'
    },
    body: JSON.stringify({ id: 'evt_bad_sig' })
  });
  assert(resBadSig.status === 400, 'Webhook with invalid signature returns HTTP 400');

  // 7c. Process valid webhook event
  const webhookEventId = `evt_paid_${Date.now()}`;
  const validPayload = JSON.stringify({
    id: webhookEventId,
    event: 'payment_link.paid',
    payload: {
      payment_link: {
        entity: {
          id: testLinkId,
          reference_id: testCaseId,
          amount: 499900,
          status: 'paid'
        }
      },
      payment: {
        entity: {
          id: `pay_rzp_live_${Date.now()}`,
          amount: 499900,
          currency: 'INR',
          status: 'captured'
        }
      }
    }
  });

  const validSig = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(validPayload)
    .digest('hex');

  const resValid = await fetch(`${baseUrl}/api/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validSig
    },
    body: validPayload
  });
  const dataValid = await resValid.json();
  assert(resValid.status === 200 && dataValid.received === true, 'Valid webhook returns HTTP 200 { received: true }');
  assert(dataValid.status === 'recovered', 'Webhook response reports status: recovered');

  // Verify DB updates
  const updatedCase = db.prepare('SELECT status FROM recovery_cases WHERE id = ?').get(testCaseId);
  assert(updatedCase.status === 'recovered', 'Recovery case status updated to "recovered" in DB');

  const updatedOutcome = db.prepare('SELECT outcome, recovered_amount, outcome_source FROM recovery_outcomes WHERE case_id = ?').get(testCaseId);
  assert(updatedOutcome.outcome === 'recovered', 'Outcome record status is "recovered"');
  assert(updatedOutcome.recovered_amount === 4999, 'Outcome recovered_amount is ₹4,999');
  assert(updatedOutcome.outcome_source === 'razorpay_webhook', 'Outcome source tagged as "razorpay_webhook"');

  const updatedPay = db.prepare('SELECT status FROM payments WHERE id = ?').get(testPayId);
  assert(updatedPay.status === 'captured', 'Payment record status updated to "captured"');

  const updatedCust = db.prepare('SELECT lifetime_value, successful_payments FROM customers WHERE id = ?').get(testCustId);
  assert(updatedCust.lifetime_value === 4999, 'Customer LTV incremented by ₹4,999');
  assert(updatedCust.successful_payments === 1, 'Customer successful_payments count incremented to 1');

  // 7d. Idempotency Test — send the EXACT same webhook event again
  const resDup = await fetch(`${baseUrl}/api/webhooks/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': validSig
    },
    body: validPayload
  });
  const dataDup = await resDup.json();
  assert(resDup.status === 200 && dataDup.duplicate === true, 'Duplicate webhook returns HTTP 200 { duplicate: true }');

  // Verify NO duplicate LTV increment occurred
  const custAfterDup = db.prepare('SELECT lifetime_value, successful_payments FROM customers WHERE id = ?').get(testCustId);
  assert(custAfterDup.lifetime_value === 4999, 'Idempotency verified: Customer LTV NOT duplicated on retry', `LTV=₹${custAfterDup.lifetime_value}`);
  assert(custAfterDup.successful_payments === 1, 'Idempotency verified: Customer successful_payments count NOT duplicated', `count=${custAfterDup.successful_payments}`);

  // Cleanup test records
  db.prepare('DELETE FROM webhook_events WHERE id = ?').run(webhookEventId);
  db.prepare('DELETE FROM agent_actions WHERE case_id = ?').run(testCaseId);
  db.prepare('DELETE FROM recovery_outcomes WHERE case_id = ?').run(testCaseId);
  db.prepare('DELETE FROM recovery_cases WHERE id = ?').run(testCaseId);
  db.prepare('DELETE FROM payments WHERE id = ?').run(testPayId);
  db.prepare('DELETE FROM customers WHERE id = ?').run(testCustId);

  server.close();
}

// Test Suite 8: Health & Analytics API Extensions
console.log('\n📊 Test Suite 8: Health & Analytics API Modes');
{
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/health', healthRouter);
  app.use('/api/analytics', requireAuth, analyticsRouter);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Health API
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthData = await healthRes.json();
  assert(healthRes.status === 200, 'Health endpoint HTTP 200');
  assert(healthData.razorpay?.mode !== undefined, 'Health endpoint exposes razorpay.mode', `mode=${healthData.razorpay?.mode}`);
  assert(typeof healthData.razorpay?.enabled === 'boolean', 'Health endpoint exposes razorpay.enabled boolean');

  // Analytics Overview with JWT
  const userTok = jwt.sign({ id: 'usr_default_admin', email: 'admin@recover.ai' }, JWT_SECRET, { expiresIn: '1h' });
  const overRes = await fetch(`${baseUrl}/api/analytics/overview`, {
    headers: { Authorization: `Bearer ${userTok}` }
  });
  const overData = await overRes.json();
  assert(overRes.status === 200, 'Analytics Overview HTTP 200');
  assert(overData.mode !== undefined, 'Analytics Overview exposes mode');
  assert(overData.awaitingPayment?.count !== undefined, 'Analytics Overview exposes awaitingPayment stats');
  assert(overData.verifiedRazorpay?.count !== undefined, 'Analytics Overview exposes verifiedRazorpay stats');
  assert(overData.simulated?.count !== undefined, 'Analytics Overview exposes simulated stats');

  server.close();
}

console.log('\n======================================================');
if (failed === 0) {
  console.log(`🎉 ALL ${passed} TESTS PASSED CLEANLY! 0 REGRESSIONS.`);
} else {
  console.error(`⚠️ SUMMARY: ${passed} passed, ${failed} failed.`);
  process.exit(1);
}
console.log('======================================================\n');
